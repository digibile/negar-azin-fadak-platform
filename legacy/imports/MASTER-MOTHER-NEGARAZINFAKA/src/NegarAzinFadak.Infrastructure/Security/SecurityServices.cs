using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Security;

namespace NegarAzinFadak.Infrastructure.Security;

/// <summary>Password hashing parameters. Stored with the hash so parameters can be raised over time.</summary>
public sealed class PasswordHashingOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "Security:PasswordHashing";

    /// <summary>PBKDF2 iteration count. The stored hash records the count it was produced with.</summary>
    public int Iterations { get; set; } = 210_000;

    public int SaltSizeInBytes { get; set; } = 16;

    public int KeySizeInBytes { get; set; } = 32;
}

/// <summary>
/// PBKDF2-HMAC-SHA256 password hashing with a per-password salt. The algorithm identifier and the
/// parameters travel inside the hash, so raising the work factor upgrades old hashes transparently on
/// the next successful sign-in.
/// </summary>
public sealed class Pbkdf2PasswordHasher(IOptions<PasswordHashingOptions> options) : IPasswordHasher
{
    private const string Algorithm = "pbkdf2-sha256";
    private readonly PasswordHashingOptions _options = Guard.AgainstNull(options).Value;

    /// <inheritdoc />
    public string Hash(string password)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(password);

        var salt = RandomNumberGenerator.GetBytes(_options.SaltSizeInBytes);
        var key = Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(password),
            salt,
            _options.Iterations,
            HashAlgorithmName.SHA256,
            _options.KeySizeInBytes);

        return string.Join(
            '$',
            Algorithm,
            _options.Iterations,
            Convert.ToBase64String(salt),
            Convert.ToBase64String(key));
    }

    /// <inheritdoc />
    public bool Verify(string password, string hash)
    {
        if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(hash))
        {
            return false;
        }

        var parts = hash.Split('$');
        if (parts.Length != 4 || parts[0] != Algorithm || !int.TryParse(parts[1], out var iterations))
        {
            return false;
        }

        byte[] salt;
        byte[] expected;
        try
        {
            salt = Convert.FromBase64String(parts[2]);
            expected = Convert.FromBase64String(parts[3]);
        }
        catch (FormatException)
        {
            return false;
        }

        var actual = Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(password),
            salt,
            iterations,
            HashAlgorithmName.SHA256,
            expected.Length);

        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }

    /// <inheritdoc />
    public bool NeedsRehash(string hash)
    {
        if (string.IsNullOrWhiteSpace(hash))
        {
            return true;
        }

        var parts = hash.Split('$');
        return parts.Length != 4
            || !int.TryParse(parts[1], out var iterations)
            || iterations < _options.Iterations;
    }
}

/// <summary>Configuration for secret protection and OTP digests.</summary>
public sealed class SecretProtectionOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "Security:Secrets";

    /// <summary>Base64-encoded 32-byte master key. Supplied by the environment, never committed.</summary>
    public string? MasterKey { get; set; }

    /// <summary>Key used to derive OTP digests. Rotating it invalidates outstanding OTP challenges.</summary>
    public string? DigestKey { get; set; }

    /// <summary>Version tag written into protected tokens so keys can be rotated.</summary>
    public int KeyVersion { get; set; } = 1;
}

/// <summary>
/// AES-256-GCM secret protection with a versioned key id. Authenticated encryption means a tampered
/// token fails to decrypt rather than yielding garbage, and the version prefix allows key rotation.
/// </summary>
public sealed class AesSecretProtector : ISecretProtector
{
    private const int NonceSize = 12;
    private const int TagSize = 16;
    private const string Prefix = "v";

    private readonly byte[] _key;
    private readonly byte[] _digestKey;
    private readonly int _keyVersion;

    public AesSecretProtector(IOptions<SecretProtectionOptions> options)
    {
        var settings = Guard.AgainstNull(options).Value;
        _key = ResolveKey(settings.MasterKey, "Security:Secrets:MasterKey");
        _digestKey = ResolveKey(settings.DigestKey, "Security:Secrets:DigestKey");
        _keyVersion = settings.KeyVersion <= 0 ? 1 : settings.KeyVersion;
    }

    /// <inheritdoc />
    public string Protect(string plainText)
    {
        ArgumentNullException.ThrowIfNull(plainText);

        var plainBytes = Encoding.UTF8.GetBytes(plainText);
        var nonce = RandomNumberGenerator.GetBytes(NonceSize);
        var cipherText = new byte[plainBytes.Length];
        var tag = new byte[TagSize];

        using (var aes = new AesGcm(_key, TagSize))
        {
            aes.Encrypt(nonce, plainBytes, cipherText, tag);
        }

        var payload = new byte[NonceSize + cipherText.Length + TagSize];
        nonce.CopyTo(payload, 0);
        cipherText.CopyTo(payload, NonceSize);
        tag.CopyTo(payload, NonceSize + cipherText.Length);

        return string.Concat(Prefix, _keyVersion.ToString(System.Globalization.CultureInfo.InvariantCulture), ".", Convert.ToBase64String(payload));
    }

    /// <inheritdoc />
    public string Unprotect(string protectedText)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(protectedText);

        var parts = protectedText.Split('.');
        if (parts.Length != 2 || parts[0].Length < 2 || parts[0][0] != 'v')
        {
            throw new CryptographicException("Protected value is malformed.");
        }

        var payload = Convert.FromBase64String(parts[1]);
        if (payload.Length < NonceSize + TagSize)
        {
            throw new CryptographicException("Protected value is malformed.");
        }

        var nonce = payload[..NonceSize];
        var tag = payload[^TagSize..];
        var cipherText = payload[NonceSize..^TagSize];
        var plainBytes = new byte[cipherText.Length];

        using var aes = new AesGcm(_key, TagSize);
        aes.Decrypt(nonce, cipherText, tag, plainBytes);
        return Encoding.UTF8.GetString(plainBytes);
    }

    /// <inheritdoc />
    public string ComputeDigest(string plainText)
    {
        ArgumentNullException.ThrowIfNull(plainText);
        return Convert.ToHexString(HMACSHA256.HashData(_digestKey, Encoding.UTF8.GetBytes(plainText))).ToLowerInvariant();
    }

    private static byte[] ResolveKey(string? configured, string settingName)
    {
        // Refusing to start beats silently generating a key: a generated key would make every protected
        // value and OTP digest unreadable after a restart, and that failure would surface as unexplained
        // "wrong code" errors for real users.
        if (string.IsNullOrWhiteSpace(configured))
        {
            throw new InvalidOperationException(
                $"'{settingName}' is not configured. Supply a base64-encoded key through configuration, user-secrets or the environment.");
        }

        byte[] key;
        try
        {
            key = Convert.FromBase64String(configured);
        }
        catch (FormatException)
        {
            throw new InvalidOperationException($"'{settingName}' must be a base64-encoded 32-byte key.");
        }

        if (key.Length is not (16 or 24 or 32))
        {
            throw new InvalidOperationException($"'{settingName}' must decode to 16, 24 or 32 bytes.");
        }

        return key;
    }
}
