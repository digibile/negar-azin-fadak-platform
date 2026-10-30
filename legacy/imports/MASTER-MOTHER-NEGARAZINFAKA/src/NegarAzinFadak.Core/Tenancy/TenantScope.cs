namespace NegarAzinFadak.Core.Tenancy;

/// <summary>
/// The organizational coordinates of a request: organization → company → brand → branch → store.
/// </summary>
/// <remarks>
/// Every level is optional except the organization, because a platform-level operator legitimately
/// works without a company context while a store cash terminal never has one. Nothing in the platform
/// hard-codes these identifiers: they are resolved from the authenticated request and from data.
/// </remarks>
public sealed record TenantScope
{
    /// <summary>Scope representing no organizational context (system background work).</summary>
    public static readonly TenantScope None = new(Guid.Empty);

    public TenantScope(
        Guid organizationId,
        Guid? companyId = null,
        Guid? brandId = null,
        Guid? branchId = null,
        Guid? storeId = null)
    {
        CompanyId = companyId;
        BrandId = brandId;
        BranchId = branchId;
        StoreId = storeId;
        OrganizationId = organizationId == Guid.Empty
            ? organizationId
            : Guard.AgainstEmpty(organizationId);
    }

    public Guid OrganizationId { get; init; }

    public Guid? CompanyId { get; init; }

    public Guid? BrandId { get; init; }

    public Guid? BranchId { get; init; }

    public Guid? StoreId { get; init; }

    /// <summary>True when this scope carries no organizational coordinates at all.</summary>
    public bool IsEmpty => OrganizationId == Guid.Empty;

    /// <summary>True when a company context is present.</summary>
    public bool HasCompany => CompanyId.HasValue;

    /// <summary>True when a store-level context is present.</summary>
    public bool HasStore => StoreId.HasValue;

    /// <summary>True when the scope is a strict descendant of <paramref name="other"/>.</summary>
    /// <remarks>
    /// Used by tenant filters: a row is visible when the row's own coordinates are equal to, or
    /// descend from, the scope of the caller. A caller with only an organization context therefore
    /// sees every company, branch and store of that organization but nothing outside it.
    /// </remarks>
    public bool Includes(TenantScope? other)
    {
        if (other is null || other.OrganizationId != OrganizationId)
        {
            return false;
        }

        if (IsEmpty)
        {
            return true;
        }

        return NarrowerOrEqual(CompanyId, other.CompanyId)
            && NarrowerOrEqual(BrandId, other.BrandId)
            && NarrowerOrEqual(BranchId, other.BranchId)
            && NarrowerOrEqual(StoreId, other.StoreId);
    }

    private static bool NarrowerOrEqual(Guid? own, Guid? requested)
        => own is null || (requested.HasValue && own == requested);

    /// <summary>Returns a copy with the company level filled in when it was absent.</summary>
    public TenantScope WithCompany(Guid companyId)
        => this with { CompanyId = companyId };

    /// <summary>
    /// Returns a copy with the brand level filled in.
    /// </summary>
    /// <remarks>
    /// Named for symmetry with the other levels, and it fills the level rather than filling in "when absent" —
    /// the previous shape promised idempotence it did not have, because a second call with a different
    /// identifier silently replaced the brand. A scope is a path; extending a path is a caller's decision
    /// about where it is, not a merge.
    /// </remarks>
    public TenantScope WithBrand(Guid brandId)
        => this with { BrandId = brandId };

    /// <summary>Returns a copy with the branch level filled in.</summary>
    public TenantScope WithBranch(Guid branchId)
        => this with { BranchId = branchId };

    /// <summary>Returns a copy with the store level filled in.</summary>
    public TenantScope WithStore(Guid storeId)
        => this with { StoreId = storeId };
}
