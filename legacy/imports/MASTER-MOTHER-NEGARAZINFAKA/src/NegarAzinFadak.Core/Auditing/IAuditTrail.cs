using NegarAzinFadak.Core.Paging;

namespace NegarAzinFadak.Core.Auditing;

/// <summary>
/// Append-only port for the platform's audit trail.
/// </summary>
/// <remarks>
/// Writes join the caller's transaction: an audited change and the record of that change commit together
/// or not at all, so the trail can never claim something happened that was rolled back. Reads are
/// deliberately on the same interface but outside the tenant filter's write path — an audit query must be
/// answerable for the tenant that owns the rows, never for another one.
/// </remarks>
public interface IAuditTrail
{
    /// <summary>Appends one record. Implementations must reject a duplicate identifier rather than overwrite.</summary>
    Task RecordAsync(AuditRecord record, CancellationToken cancellationToken = default);

    /// <summary>
    /// Appends several records as one unit. Used when a single use case performs several audited steps
    /// that must not be visible separately.
    /// </summary>
    Task RecordManyAsync(IReadOnlyCollection<AuditRecord> records, CancellationToken cancellationToken = default);

    /// <summary>Reads a page of the trail, newest first, filtered to the caller's tenant by the query.</summary>
    Task<PagedResult<AuditRecord>> QueryAsync(AuditQuery query, CancellationToken cancellationToken = default);
}

/// <summary>A bounded, tenant-safe filter over the audit trail.</summary>
/// <param name="Scope">
/// Tenant to read. <see cref="Tenancy.TenantScope.None"/> reads the platform's own records and nothing else;
/// it never means "every tenant". Implementations must resolve this to an equality on the isolation key so
/// that a caller which has lost its tenant context reads nothing instead of everything.
/// </param>
/// <param name="ResourceType">Restrict to one resource type, e.g. <c>role</c>.</param>
/// <param name="ResourceId">Restrict to one resource instance.</param>
/// <param name="Action">Restrict to one action code.</param>
/// <param name="ActorUserId">Restrict to one actor, e.g. to review everything one operator did.</param>
/// <param name="From">Inclusive lower bound of the occurrence window.</param>
/// <param name="To">Exclusive upper bound of the occurrence window.</param>
/// <param name="Page">Paging and sorting input.</param>
public sealed record AuditQuery(
    Tenancy.TenantScope Scope,
    string? ResourceType = null,
    string? ResourceId = null,
    string? Action = null,
    Guid? ActorUserId = null,
    DateTimeOffset? From = null,
    DateTimeOffset? To = null,
    PageRequest? Page = null)
{
    /// <summary>Creates a query for one tenant, with default paging.</summary>
    public static AuditQuery ForTenant(Tenancy.TenantScope scope, PageRequest? page = null)
    {
        ArgumentNullException.ThrowIfNull(scope);
        return new AuditQuery(scope, Page: page ?? new PageRequest());
    }

    /// <summary>
    /// Creates a query for platform-level records. Named rather than left implicit so that a reviewer can see
    /// at the call site that it is the platform's own history being read, and not a tenant's.
    /// </summary>
    public static AuditQuery ForPlatform(PageRequest? page = null)
        => new(Tenancy.TenantScope.None, Page: page ?? new PageRequest());
}
