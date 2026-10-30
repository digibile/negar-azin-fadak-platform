using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NegarAzinFadak.Application.Abstractions.Notifications;
using NegarAzinFadak.Application.Options;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Identity.Domain;
using NegarAzinFadak.Identity.Domain.Authentication;
using NegarAzinFadak.Identity.Domain.Users;

namespace NegarAzinFadak.Application.Identity;

/// <summary>Rate-limit counters for one target, kept in a pluggable store so they survive across instances.</summary>
public interface IRateLimitCounterStore
{
    /// <summary>Increments a counter inside a time window and returns the new value.</summary>
    Task<int> IncrementAsync(string key, TimeSpan window, CancellationToken cancellationToken = default);

    /// <summary>Reads a counter without incrementing it.</summary>
    Task<int> GetAsync(string key, TimeSpan window, CancellationToken cancellationToken = default);
}

/// <summary>
/// A challenge that must be persisted, together with the plain code that is delivered exactly once.
/// The plain code is never stored: only the digest inside <see cref="OtpChallenge"/> reaches the database.
/// </summary>
/// <param name="Challenge">The aggregate to persist.</param>
/// <param name="PlainCode">The code to deliver, held in memory only for the duration of the request.</param>
public sealed record OtpIssueResult(OtpChallenge Challenge, string PlainCode);

/// <summary>
/// Issues and verifies one-time codes. The server owns the code: the client never decides whether a code
/// is correct, and the plain code exists only long enough to be delivered.
/// </summary>
public sealed class OtpService
{
    private readonly ISmsSender _smsSender;
    private readonly ISecretProtector _secretProtector;
    private readonly IRateLimitCounterStore _rateLimits;
    private readonly IClock _clock;
    private readonly OtpOptions _options;
    private readonly ILogger _logger;

    public OtpService(
        ISmsSender smsSender,
        ISecretProtector secretProtector,
        IRateLimitCounterStore rateLimits,
        IClock clock,
        IOptions<OtpOptions> options,
        ILogger<OtpService> logger)
    {
        _smsSender = Guard.AgainstNull(smsSender);
        _secretProtector = Guard.AgainstNull(secretProtector);
        _rateLimits = Guard.AgainstNull(rateLimits);
        _clock = Guard.AgainstNull(clock);
        _options = Guard.AgainstNull(options).Value;
        _logger = Guard.AgainstNull(logger);
    }

    /// <summary>Builds the challenge that must be persisted before delivery is attempted.</summary>
    public Result<OtpIssueResult> CreateChallenge(
        MobileNumber target,
        OtpPurpose purpose,
        Guid? requestedBy = null,
        string? requestedFrom = null)
    {
        ArgumentNullException.ThrowIfNull(target);

        var policy = _options.ToPolicy();
        var (challenge, code) = OtpChallenge.Issue(
            Guid.NewGuid(),
            target,
            purpose,
            policy,
            _secretProtector.ComputeDigest,
            _clock.UtcNow,
            requestedBy,
            requestedFrom);

        return Result<OtpIssueResult>.Success(new OtpIssueResult(challenge, code));
    }

    /// <summary>
    /// Delivers a freshly created code over the configured SMS channel. Split from creation so the
    /// challenge is committed before the message leaves the system, which prevents a delivered code from
    /// referring to a challenge that was rolled back.
    /// </summary>
    public async Task<Result> DeliverAsync(
        OtpIssueResult issued,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(issued);
        var challenge = issued.Challenge;

        var rateKey = RateKey("issue", challenge.MaskedTarget, challenge.Purpose);
        var issuedInWindow = await _rateLimits.IncrementAsync(rateKey, TimeSpan.FromHours(1), cancellationToken);
        if (issuedInWindow > _options.MaxIssuesPerTargetPerHour)
        {
            _logger.LogWarning(
                "OTP issuance rate limit exceeded for purpose {Purpose} on {Target}.",
                challenge.Purpose,
                challenge.MaskedTarget);
            return Result.Failure(IdentityErrors.OtpRateLimited(TimeSpan.FromHours(1)));
        }

        if (!challenge.CanResend(_clock.UtcNow) && challenge.DeliveryCount > 1)
        {
            var wait = challenge.NextDeliveryAllowedAt - _clock.UtcNow;
            return Result.Failure(IdentityErrors.OtpRateLimited(wait));
        }

        var body = _options.MessageTemplate
            .Replace("{code}", issued.PlainCode, StringComparison.Ordinal)
            .Replace(
                "{minutes}",
                ((int)challenge.Policy.TimeToLive.TotalMinutes).ToString(System.Globalization.CultureInfo.InvariantCulture),
                StringComparison.Ordinal);

        var delivery = await _smsSender.SendAsync(challenge.Target, body, cancellationToken);
        if (delivery.IsFailure || delivery.Value is { IsSuccess: false })
        {
            _logger.LogError(
                "OTP delivery failed for purpose {Purpose} on {Target} via {Provider}.",
                challenge.Purpose,
                challenge.MaskedTarget,
                _smsSender.Code);
            return Result.Failure(IdentityErrors.OtpDeliveryFailed());
        }

        challenge.MarkDelivered(_smsSender.Code, _clock.UtcNow);
        return Result.Success();
    }

    /// <summary>Verifies a submitted code against a stored challenge, applying the retry budget and rate limits.</summary>
    public async Task<Result> VerifyAsync(
        OtpChallenge challenge,
        string submittedCode,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(challenge);

        var rateKey = RateKey("verify", challenge.MaskedTarget, challenge.Purpose);
        var attemptsInWindow = await _rateLimits.IncrementAsync(rateKey, TimeSpan.FromHours(1), cancellationToken);
        if (attemptsInWindow > _options.MaxVerificationsPerTargetPerHour)
        {
            return Result.Failure(IdentityErrors.OtpRateLimited(TimeSpan.FromHours(1)));
        }

        var result = challenge.Verify(submittedCode, _secretProtector.ComputeDigest, _clock.UtcNow);
        if (result.IsFailure)
        {
            _logger.LogWarning(
                "OTP verification failed for purpose {Purpose} on {Target}: {ErrorCode}.",
                challenge.Purpose,
                challenge.MaskedTarget,
                result.FirstError.Code);
        }

        return result;
    }

    /// <summary>Persists nothing but reports how long a caller must wait before the next delivery.</summary>
    public TimeSpan GetResendWaitTime(OtpChallenge challenge)
    {
        ArgumentNullException.ThrowIfNull(challenge);
        var remaining = challenge.NextDeliveryAllowedAt - _clock.UtcNow;
        return remaining > TimeSpan.Zero ? remaining : TimeSpan.Zero;
    }

    private static string RateKey(string operation, string target, OtpPurpose purpose)
        => $"otp:{operation}:{purpose}:{target}";
}
