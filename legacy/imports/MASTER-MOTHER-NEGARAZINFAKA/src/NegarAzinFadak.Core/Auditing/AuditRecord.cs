using NegarAzinFadak.Core.Tenancy;

namespace NegarAzinFadak.Core.Auditing;

/// <summary>How an audited operation ended.</summary>
public enum AuditOutcome
{
    /// <summary>The operation completed and its effect was committed.</summary>
    Success = 0,

    /// <summary>The operation was refused. The reason code is stored, never a message carrying sensitive data.</summary>
    Denied = 1,

    /// <summary>The operation failed for a reason that is not the caller's fault.</summary>
    Failed = 2
}

/// <summary>
/// One immutable line of the audit trail: who did what to which resource, in which tenant, and whether
/// it was allowed.
/// </summary>
/// <remarks>
/// The audit trail is deliberately not a domain aggregate. It is written by many modules at once, is
/// never mutated after the fact, and is queried far more often than it is decided, so modelling it as an
/// aggregate would force every module to share a transaction boundary and a lock for a read-mostly log.
/// It is a plain append-only record with its own port, <see cref="IAuditTrail"/>.
/// <para>
/// It lives in the shared kernel rather than in one module because "record what happened" is a platform
/// obligation, not a feature of any single bounded context.
/// </para>
/// </remarks>
public sealed class AuditRecord : ITenantScoped
{
    /// <summary>Parameterless constructor for materialization by the persistence layer only.</summary>
    public AuditRecord()
    {
        Action = string.Empty;
        ResourceType = string.Empty;
        ResourceId = string.Empty;
        CorrelationId = string.Empty;
        Scope = TenantScope.None;
    }

    /// <summary>Creates an audit record. The timestamp and actor are supplied by the writing service.</summary>
    public AuditRecord(
        Guid actionId,
        string action,
        string resourceType,
        string resourceId,
        AuditOutcome outcome,
        Guid? actorUserId,
        TenantScope scope,
        DateTimeOffset occurredAt,
        string correlationId,
        string? reasonCode = null,
        IReadOnlyDictionary<string, string?>? attributes = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(action);
        ArgumentException.ThrowIfNullOrWhiteSpace(resourceType);

        Id = actionId == Guid.Empty ? Guid.NewGuid() : actionId;
        Action = action.Trim();
        ResourceType = resourceType.Trim();
        ResourceId = (resourceId ?? string.Empty).Trim();
        Outcome = outcome;
        ActorUserId = actorUserId;
        Scope = GuardScope(scope);
        OccurredAt = occurredAt;
        CorrelationId = (correlationId ?? string.Empty).Trim();
        ReasonCode = string.IsNullOrWhiteSpace(reasonCode) ? null : reasonCode.Trim();
        Attributes = attributes is null || attributes.Count == 0
            ? null
            : new Dictionary<string, string?>(attributes);
    }

    /// <summary>Record identifier, also the idempotency key when an action is audited more than once.</summary>
    public Guid Id { get; private set; }

    /// <summary>Stable action code, e.g. <c>tenant.organization.suspend</c>. Branch on this, never on prose.</summary>
    public string Action { get; private set; }

    /// <summary>Type of the affected resource, e.g. <c>organization</c> or <c>role</c>.</summary>
    public string ResourceType { get; private set; }

    /// <summary>Identifier of the affected resource.</summary>
    public string ResourceId { get; private set; }

    public AuditOutcome Outcome { get; private set; }

    /// <summary>Central identity that performed the action, or <see langword="null"/> for system work.</summary>
    public Guid? ActorUserId { get; private set; }

    /// <summary>Tenant the action belonged to. Empty for platform-level work, which is legitimately cross-tenant.</summary>
    public TenantScope Scope { get; private set; }

    public DateTimeOffset OccurredAt { get; private set; }

    /// <summary>Correlation identifier of the request, joining the audit line to the platform's logs.</summary>
    public string CorrelationId { get; private set; }

    /// <summary>Machine-readable reason for a denied or failed outcome.</summary>
    public string? ReasonCode { get; private set; }

    /// <summary>
    /// Additional structured context. Values must be non-sensitive: the trail is read by auditors and
    /// exported to analytics, so a secret or a full identity number placed here becomes a permanent leak.
    /// </summary>
    public IReadOnlyDictionary<string, string?>? Attributes { get; private set; }

    private static TenantScope GuardScope(TenantScope? scope) => scope ?? TenantScope.None;
}
