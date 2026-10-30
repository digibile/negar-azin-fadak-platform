namespace NegarAzinFadak.Core.Security;

/// <summary>
/// Password hashing port. The platform stores only hashes; no use case ever sees or logs a plain
/// password. The algorithm lives in infrastructure so that it can be upgraded without touching domains.
/// </summary>
public interface IPasswordHasher
{
    /// <summary>Hashes a plain-text password using the current algorithm and parameters.</summary>
    string Hash(string password);

    /// <summary>Verifies a candidate password against a stored hash.</summary>
    bool Verify(string password, string hash);

    /// <summary>True when the stored hash uses outdated parameters and should be upgraded on next sign-in.</summary>
    bool NeedsRehash(string hash);
}

/// <summary>
/// Protects values that must be readable by the platform but not by a human with database access, such
/// one-time codes, refresh tokens and provider secrets. Encrypt-then-MAC with a versioned key id.
/// </summary>
public interface ISecretProtector
{
    /// <summary>Encrypts a secret, returning a self-describing token that carries its key version.</summary>
    string Protect(string plainText);

    /// <summary>Decrypts a token produced by <see cref="Protect"/>.</summary>
    string Unprotect(string protectedText);

    /// <summary>Produces a keyed digest for secrets that must be compared but never revealed.</summary>
    string ComputeDigest(string plainText);
}

/// <summary>
/// Constant-time comparison of secret material. Exposed as a helper so that every comparison in the
/// platform goes through one implementation instead of ad-hoc <c>SequenceEqual</c> calls.
/// </summary>
public static class SecretComparer
{
    public static bool FixedTimeEquals(string? left, string? right)
    {
        if (left is null || right is null)
        {
            return ReferenceEquals(left, right);
        }

        return System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
            System.Text.Encoding.UTF8.GetBytes(left),
            System.Text.Encoding.UTF8.GetBytes(right));
    }
}
