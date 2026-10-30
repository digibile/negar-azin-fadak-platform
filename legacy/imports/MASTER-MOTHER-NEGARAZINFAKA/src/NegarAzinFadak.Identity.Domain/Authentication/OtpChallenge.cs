using System.Security.Cryptography;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Domain;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Results;

namespace NegarAzinFadak.Identity.Domain.Authentication;

/// <summary>Why a one-time code was issued. Each purpose has its own policy and its own audit trail.</summary>
public enum OtpPurpose
{
    /// <summary>Proving ownership of a mobile number during registration.</summary>
    MobileOwnership = 0,

    /// <summary>Signing in with a mobile number and a code instead of a password.</summary>
    Login = 1,

    /// <summary>Confirming identity data submitted with a document.</summary>
    IdentityConfirmation = 2,

    /// <summary>Recovering a forgotten account.</summary>
    PasswordReset = 3,

    /// <summary>Authorising a change to the anchor mobile number.</summary>
    MobileChange = 4
}

/// <summary>Lifecycle of a one-time code challenge.</summary>
public enum OtpStatus
{
    /// <summary>Issued and waiting for the user to type it back.</summary>
    Issued = 0,

    /// <summary>Correctly verified and consumed.</summary>
    Consumed = 1,

    /// <summary>Too many wrong attempts; the code is dead and a new one is required.</summary>
    Locked = 2,

    /// <summary>Past its validity window.</summary>
    Expired = 3,

    /// <summary>Superseded by a newer code for the same mobile number and purpose.</summary>
    Superseded = 4
}

/// <summary>
/// Data-driven policy for one-time codes. Length, lifetime, retry budget and resend interval come from
/// configuration or the policy table, never from constants in use-case code.
/// </summary>
public sealed class OtpPolicy : ValueObject
{
    public OtpPolicy(
        int codeLength = 5,
        TimeSpan timeToLive = default,
        int maxAttempts = 5,
        TimeSpan resendInterval = default,
        int maxActiveChallengesPerTarget = 3)
    {
        if (codeLength is < 4 or > 10)
        {
            throw new ArgumentOutOfRangeException(nameof(codeLength), codeLength, "Code length must be between 4 and 10.");
        }

        if (maxAttempts < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(maxAttempts), maxAttempts, "At least one attempt must be allowed.");
        }

        CodeLength = codeLength;
        TimeToLive = timeToLive == default ? TimeSpan.FromMinutes(2) : timeToLive;
        MaxAttempts = maxAttempts;
        ResendInterval = resendInterval == default ? TimeSpan.FromSeconds(60) : resendInterval;
        MaxActiveChallengesPerTarget = Guard.AgainstNegativeOrZero(maxActiveChallengesPerTarget);
    }

    /// <summary>Number of digits in the code.</summary>
    public int CodeLength { get; }

    public TimeSpan TimeToLive { get; }

    /// <summary>Wrong guesses allowed before the challenge locks.</summary>
    public int MaxAttempts { get; }

    /// <summary>Minimum delay between two deliveries to the same target.</summary>
    public TimeSpan ResendInterval { get; }

    /// <summary>Number of simultaneously valid codes per mobile number and purpose.</summary>
    public int MaxActiveChallengesPerTarget { get; }

    /// <summary>Default policy used when no policy is configured for a purpose.</summary>
    public static OtpPolicy Default { get; } = new();

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return CodeLength;
        yield return TimeToLive;
        yield return MaxAttempts;
        yield return ResendInterval;
        yield return MaxActiveChallengesPerTarget;
    }
}

/// <summary>
/// A one-time code challenge. The platform never stores the code itself, only a keyed digest, and
/// verification is server-side: the client cannot assert that a code is correct.
/// </summary>
public sealed class OtpChallenge : AggregateRoot
{
    private OtpChallenge()
    {
        Target = null!;
        CodeDigest = string.Empty;
        Purpose = OtpPurpose.MobileOwnership;
        Status = OtpStatus.Issued;
    }

    private OtpChallenge(
        Guid id,
        MobileNumber target,
        OtpPurpose purpose,
        string codeDigest,
        OtpPolicy policy,
        DateTimeOffset issuedAt,
        Guid? requestedBy)
        : base(id)
    {
        Target = Guard.AgainstNull(target);
        Purpose = purpose;
        CodeDigest = Guard.AgainstNullOrWhiteSpace(codeDigest);
        Policy = policy;
        IssuedAt = issuedAt;
        RequestedBy = requestedBy;
        ExpiresAt = issuedAt.Add(policy.TimeToLive);
        Status = OtpStatus.Issued;
        NextDeliveryAllowedAt = issuedAt;
    }

    public MobileNumber Target { get; private set; } = null!;

    /// <summary>Masked target, used in logs and on the resend screen.</summary>
    public string MaskedTarget => Target.Masked;

    public OtpPurpose Purpose { get; private set; }

    public OtpStatus Status { get; private set; }

    /// <summary>Keyed digest of the code. The plain code exists only in the delivery message.</summary>
    public string CodeDigest { get; private set; } = string.Empty;

    public OtpPolicy Policy { get; private set; } = OtpPolicy.Default;

    public DateTimeOffset IssuedAt { get; private set; }

    public DateTimeOffset ExpiresAt { get; private set; }

    public DateTimeOffset? ConsumedAt { get; private set; }

    public int FailedAttempts { get; private set; }

    public int DeliveryCount { get; private set; } = 1;

    public DateTimeOffset NextDeliveryAllowedAt { get; private set; }

    /// <summary>Provider that delivered the message, for delivery reporting.</summary>
    public string? DeliveredVia { get; private set; }

    /// <summary>Client that requested the challenge, for abuse analysis.</summary>
    public string? RequestedFrom { get; private set; }

    public Guid? RequestedBy { get; private set; }

    /// <summary>True when the challenge is still usable at the given instant.</summary>
    public bool IsActive(DateTimeOffset now)
        => Status == OtpStatus.Issued && now < ExpiresAt;

    /// <summary>Issues a challenge, generating the code and returning it for delivery.</summary>
    /// <param name="id">Identifier of the new challenge.</param>
    /// <param name="target">Mobile number the code is sent to.</param>
    /// <param name="purpose">Why the code was issued.</param>
    /// <param name="policy">Data-driven policy governing length, lifetime and retries.</param>
    /// <param name="digestFunction">Produces the stored digest from a plain code.</param>
    /// <param name="now">Current instant.</param>
    /// <param name="requestedBy">User that requested the code, when acting on behalf of someone.</param>
    /// <param name="requestedFrom">Free-form client description for abuse analysis.</param>
    /// <returns>The new challenge and the plain code, which the caller delivers and then discards.</returns>
    public static (OtpChallenge Challenge, string Code) Issue(
        Guid id,
        MobileNumber target,
        OtpPurpose purpose,
        OtpPolicy policy,
        Func<string, string> digestFunction,
        DateTimeOffset now,
        Guid? requestedBy = null,
        string? requestedFrom = null)
    {
        ArgumentNullException.ThrowIfNull(target);
        ArgumentNullException.ThrowIfNull(policy);
        ArgumentNullException.ThrowIfNull(digestFunction);

        var code = GenerateCode(policy.CodeLength);
        var challenge = new OtpChallenge(
            id,
            target,
            purpose,
            digestFunction(code),
            policy,
            now,
            requestedBy);

        challenge.RequestedFrom = string.IsNullOrWhiteSpace(requestedFrom) ? null : requestedFrom.Trim();
        return (challenge, code);
    }

    /// <summary>
    /// Verifies a submitted code. Expiry, retry budget and status are all checked here so that no caller
    /// can accept a code the domain considers spent.
    /// </summary>
    /// <param name="submittedCode">Code as typed by the user.</param>
    /// <param name="digestFunction">Recomputes the digest for constant-time comparison.</param>
    /// <param name="now">Current instant.</param>
    public Result Verify(string submittedCode, Func<string, string> digestFunction, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(digestFunction);

        if (string.IsNullOrWhiteSpace(submittedCode))
        {
            return Result.Failure(IdentityErrors.OtpCodeRequired);
        }

        if (Status == OtpStatus.Consumed)
        {
            return Result.Failure(IdentityErrors.OtpAlreadyUsed);
        }

        if (Status == OtpStatus.Locked)
        {
            return Result.Failure(IdentityErrors.OtpLocked);
        }

        if (Status == OtpStatus.Superseded)
        {
            return Result.Failure(IdentityErrors.OtpSuperseded);
        }

        if (Status == OtpStatus.Expired || now >= ExpiresAt)
        {
            Status = OtpStatus.Expired;
            return Result.Failure(IdentityErrors.OtpExpired);
        }

        var submitted = submittedCode.Trim();
        if (submitted.Length != Policy.CodeLength || !submitted.All(char.IsAsciiDigit))
        {
            return RegisterFailure(digestFunction(""), now);
        }

        var candidate = digestFunction(submitted);
        if (!Core.Security.SecretComparer.FixedTimeEquals(candidate, CodeDigest))
        {
            return RegisterFailure(candidate, now);
        }

        Status = OtpStatus.Consumed;
        ConsumedAt = now;
        return Result.Success();
    }

    /// <summary>Records that the message was delivered by a provider.</summary>
    public Result MarkDelivered(string provider, DateTimeOffset now)
    {
        if (Status != OtpStatus.Issued)
        {
            return Result.Failure(IdentityErrors.OtpNotActive);
        }

        DeliveredVia = Guard.AgainstNullOrWhiteSpace(provider);
        DeliveryCount++;
        NextDeliveryAllowedAt = now.Add(Policy.ResendInterval);
        return Result.Success();
    }

    /// <summary>Supersedes this challenge because a newer code was issued for the same target.</summary>
    public void Supersede()
    {
        if (Status == OtpStatus.Consumed)
        {
            return;
        }

        Status = OtpStatus.Superseded;
    }

    /// <summary>Marks the challenge as expired when its validity window has passed.</summary>
    public bool RefreshExpiry(DateTimeOffset now)
    {
        if (Status != OtpStatus.Issued || now < ExpiresAt)
        {
            return false;
        }

        Status = OtpStatus.Expired;
        return true;
    }

    /// <summary>True when a resend is allowed at the given instant.</summary>
    public bool CanResend(DateTimeOffset now)
        => Status == OtpStatus.Issued && now >= NextDeliveryAllowedAt;

    private Result RegisterFailure(string candidateDigest, DateTimeOffset now)
    {
        FailedAttempts++;
        if (FailedAttempts >= Policy.MaxAttempts)
        {
            Status = OtpStatus.Locked;
            return Result.Failure(IdentityErrors.OtpLocked);
        }

        return Result.Failure(IdentityErrors.OtpCodeIncorrect(Policy.MaxAttempts - FailedAttempts));
    }

    private static string GenerateCode(int length)
        => RandomNumberGenerator.GetInt32(0, (int)Math.Pow(10, length))
            .ToString("D" + length.ToString(System.Globalization.CultureInfo.InvariantCulture))[..length];
}
