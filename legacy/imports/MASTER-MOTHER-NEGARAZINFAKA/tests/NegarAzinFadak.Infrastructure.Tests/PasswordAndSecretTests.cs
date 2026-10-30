using Microsoft.Extensions.Options;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Infrastructure.Security;

namespace NegarAzinFadak.Infrastructure.Tests;

/// <summary>
/// Passwords and one-time codes are the platform's only secrets: they must be hashed with a per-secret
/// salt, comparable in constant time, and never recoverable from the store.
/// </summary>
public sealed class PasswordAndSecretTests
{
    private const string Key = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";
    private const string DigestKey = "YWJjZGVmMDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODk=";

    [Fact]
    public void The_same_password_never_produces_the_same_hash_twice()
    {
        var hasher = CreateHasher();

        var first = hasher.Hash("Correct-Horse-1");
        var second = hasher.Hash("Correct-Horse-1");

        Assert.NotEqual(first, second);
        Assert.True(hasher.Verify("Correct-Horse-1", first));
        Assert.True(hasher.Verify("Correct-Horse-1", second));
    }

    [Fact]
    public void A_wrong_password_is_rejected()
    {
        var hasher = CreateHasher();
        var hash = hasher.Hash("Correct-Horse-1");

        Assert.False(hasher.Verify("correct-horse-1", hash));
        Assert.False(hasher.Verify(string.Empty, hash));
    }

    [Fact]
    public void A_hash_produced_with_older_parameters_is_reported_for_upgrade()
    {
        var hasher = CreateHasher(2_000);
        var weak = hasher.Hash("Correct-Horse-1");

        var strongHasher = CreateHasher();
        var strong = strongHasher.Hash("Correct-Horse-1");

        Assert.True(strongHasher.NeedsRehash(weak));
        Assert.False(strongHasher.NeedsRehash(strong));
        Assert.True(strongHasher.Verify("Correct-Horse-1", weak));
    }

    [Theory]
    [InlineData("not-a-hash")]
    [InlineData("pbkdf2-sha256$notanumber$c2FsdA==$a2V5")]
    [InlineData("bcrypt$1000$c2FsdA==$a2V5")]
    public void A_malformed_or_foreign_hash_never_verifies(string hash)
    {
        var hasher = CreateHasher();

        Assert.False(hasher.Verify("Correct-Horse-1", hash));
        Assert.True(hasher.NeedsRehash(hash));
    }

    [Fact]
    public void Protected_values_round_trip_and_a_tampered_token_fails_to_decrypt()
    {
        var protector = CreateProtector();

        var protectedToken = protector.Protect("12345");

        Assert.NotEqual("12345", protectedToken);
        Assert.StartsWith("v1.", protectedToken, StringComparison.Ordinal);
        Assert.Equal("12345", protector.Unprotect(protectedToken));

        var bytes = Convert.FromBase64String(protectedToken.Split('.')[1]);
        bytes[^1] ^= 0xFF;
        var tampered = "v1." + Convert.ToBase64String(bytes);

        // AES-GCM surfaces a tag mismatch as AuthenticationTagMismatchException, which derives from
        // CryptographicException; the contract under test is that tampering is refused as a crypto failure.
        Assert.ThrowsAny<System.Security.Cryptography.CryptographicException>(() => protector.Unprotect(tampered));
    }

    [Fact]
    public void The_same_secret_always_produces_the_same_keyed_digest()
    {
        var protector = CreateProtector();

        var first = protector.ComputeDigest("12345");
        var second = protector.ComputeDigest("12345");
        var other = protector.ComputeDigest("54321");

        Assert.Equal(first, second);
        Assert.NotEqual(first, other);
        Assert.True(SecretComparer.FixedTimeEquals(first, second));
        Assert.False(SecretComparer.FixedTimeEquals(first, other));
    }

    [Fact]
    public void A_missing_key_is_reported_instead_of_silently_generated()
    {
        var options = Options.Create(new SecretProtectionOptions { MasterKey = null, DigestKey = null });

        var exception = Assert.Throws<InvalidOperationException>(() => new AesSecretProtector(options));
        Assert.Contains("Security:Secrets:MasterKey", exception.Message, StringComparison.Ordinal);
    }

    private static Pbkdf2PasswordHasher CreateHasher(int iterations = 210_000)
        => new(Options.Create(new PasswordHashingOptions { Iterations = iterations }));

    private static AesSecretProtector CreateProtector()
        => new(Options.Create(new SecretProtectionOptions
        {
            MasterKey = Key,
            DigestKey = DigestKey,
            KeyVersion = 1
        }));
}
