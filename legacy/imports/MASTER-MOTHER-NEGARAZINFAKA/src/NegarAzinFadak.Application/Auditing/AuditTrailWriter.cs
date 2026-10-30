using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Auditing;
using NegarAzinFadak.Core.Persistence;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;

namespace NegarAzinFadak.Application.Auditing;

/// <summary>
/// Builds and appends audit records for the current request.
/// </summary>
/// <remarks>
/// <para>
/// The actor, the timestamp and the correlation identifier are taken from the ambient principal and clock
/// rather than from the call site. That is the whole point: a hand-written actor field is one more place
/// a use case can forget, and a record that blames the wrong identity is worse than no record, because it
/// is trusted.
/// </para>
/// <para>
/// The two kinds of record are committed differently, and the difference is deliberate.
/// <see cref="RecordSuccessAsync"/> is only <em>staged</em>: it joins the caller's unit of work, so the
/// record and the business change it describes commit together and a rollback takes the record with it. A
/// refusal goes the other way — it is flushed immediately, because a refused action leaves nothing else to
/// save and its only trace would otherwise be a line still sitting in the change tracker, discarded with
/// the request. The consequence every caller must respect: a refusal may only be recorded on a path where
/// the unit of work holds no other pending change, so the flush cannot commit a half-built aggregate.
/// Validation refusals therefore happen before anything is attached to the tracker.
/// </para>
/// </remarks>
public sealed class AuditTrailWriter
{
    private readonly IAuditTrail _trail;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUser _currentUser;
    private readonly IClock _clock;

    public AuditTrailWriter(IAuditTrail trail, IUnitOfWork unitOfWork, ICurrentUser currentUser, IClock clock)
    {
        _trail = Guard.AgainstNull(trail);
        _unitOfWork = Guard.AgainstNull(unitOfWork);
        _currentUser = Guard.AgainstNull(currentUser);
        _clock = Guard.AgainstNull(clock);
    }

    /// <summary>Central identity of the caller, or <see langword="null"/> for a system action.</summary>
    public Guid? ActorId => _currentUser.UserId;

    /// <summary>Tenant the caller acts in. System work runs with an empty scope.</summary>
    public TenantScope Scope => _currentUser.Scope;

    /// <summary>
    /// Records an action that completed. Staged only: the caller must save afterwards, and the record
    /// commits with the change it describes.
    /// </summary>
    public Task RecordSuccessAsync(
        string action,
        string resourceType,
        string resourceId,
        IReadOnlyDictionary<string, string?>? attributes = null,
        CancellationToken cancellationToken = default)
        => RecordAsync(action, resourceType, resourceId, AuditOutcome.Success, null, attributes, cancellationToken);

    /// <summary>
    /// Records an action the domain refused and commits the record. Only valid on a path where nothing else
    /// is pending, since this call saves.
    /// </summary>
    public Task RecordDeniedAsync(
        string action,
        string resourceType,
        string resourceId,
        string reasonCode,
        IReadOnlyDictionary<string, string?>? attributes = null,
        CancellationToken cancellationToken = default)
        => RecordAndFlushAsync(
            action, resourceType, resourceId, AuditOutcome.Denied, reasonCode, attributes, cancellationToken);

    /// <summary>
    /// Records an action that failed for a reason which is not the caller's fault, and commits the record.
    /// Only valid on a path where nothing else is pending, since this call saves.
    /// </summary>
    public Task RecordFailureAsync(
        string action,
        string resourceType,
        string resourceId,
        string? reasonCode = null,
        IReadOnlyDictionary<string, string?>? attributes = null,
        CancellationToken cancellationToken = default)
        => RecordAndFlushAsync(
            action, resourceType, resourceId, AuditOutcome.Failed, reasonCode, attributes, cancellationToken);

    /// <summary>Records a denied outcome for a failed <see cref="Result"/> and re-returns it unchanged.</summary>
    public async Task<Result> AuditDenialAsync(
        string action,
        string resourceType,
        string resourceId,
        Result result,
        IReadOnlyDictionary<string, string?>? attributes = null,
        CancellationToken cancellationToken = default)
    {
        if (result.IsFailure)
        {
            await RecordDeniedAsync(
                action,
                resourceType,
                resourceId,
                result.FirstError.Code,
                attributes,
                cancellationToken).ConfigureAwait(false);
        }

        return result;
    }

    /// <summary>Records a denied outcome for a failed <see cref="Result{T}"/> and re-returns it unchanged.</summary>
    public async Task<Result<T>> AuditDenialAsync<T>(
        string action,
        string resourceType,
        string resourceId,
        Result<T> result,
        IReadOnlyDictionary<string, string?>? attributes = null,
        CancellationToken cancellationToken = default)
    {
        if (result.IsFailure)
        {
            await RecordDeniedAsync(
                action,
                resourceType,
                resourceId,
                result.FirstError.Code,
                attributes,
                cancellationToken).ConfigureAwait(false);
        }

        return result;
    }

    private async Task RecordAndFlushAsync(
        string action,
        string resourceType,
        string resourceId,
        AuditOutcome outcome,
        string? reasonCode,
        IReadOnlyDictionary<string, string?>? attributes,
        CancellationToken cancellationToken)
    {
        await RecordAsync(action, resourceType, resourceId, outcome, reasonCode, attributes, cancellationToken)
            .ConfigureAwait(false);

        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    private Task RecordAsync(
        string action,
        string resourceType,
        string resourceId,
        AuditOutcome outcome,
        string? reasonCode,
        IReadOnlyDictionary<string, string?>? attributes,
        CancellationToken cancellationToken)
        => _trail.RecordAsync(
            new AuditRecord(
                Guid.NewGuid(),
                action,
                resourceType,
                resourceId,
                outcome,
                _currentUser.UserId,
                _currentUser.Scope,
                _clock.UtcNow,
                _currentUser.CorrelationId ?? string.Empty,
                reasonCode,
                attributes),
            cancellationToken);
}
