using NegarAzinFadak.Core.Paging;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Organization.Domain;
using NegarAzinFadak.Organization.Domain.Configuration;
using NegarAzinFadak.Organization.Domain.Roles;
using OrganizationAggregate = NegarAzinFadak.Organization.Domain.Organization;

namespace NegarAzinFadak.Application.Tenancy;

/// <summary>
/// Read side of the organizational hierarchy.
/// </summary>
/// <remarks>
/// Every method takes the scope explicitly, even though the persistence layer filters by the ambient
/// session anyway. The reason is that these ports are also called by platform-level jobs that run without
/// a request, and a query that silently inherited "the current tenant" would be answering a different
/// question for a background worker than for a request.
/// </remarks>
public interface IOrganizationDirectory
{
    /// <summary>Returns a page of units of one level inside a scope.</summary>
    Task<PagedResult<OrganizationalUnit>> ListAsync(
        TenantScope scope,
        OrganizationalUnitLevel level,
        PageRequest page,
        CancellationToken cancellationToken = default);

    /// <summary>Finds a unit by its code within a scope, or <see langword="null"/>.</summary>
    Task<OrganizationalUnit?> FindByCodeAsync(
        TenantScope scope,
        OrganizationalUnitLevel level,
        string code,
        CancellationToken cancellationToken = default);

    /// <summary>True when a sibling with the same code already exists under the same parent.</summary>
    Task<bool> CodeExistsAsync(
        TenantScope scope,
        OrganizationalUnitLevel level,
        string code,
        Guid? excludeUnitId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Finds a tenant root by its code across every organization, or <see langword="null"/>.
    /// </summary>
    /// <remarks>
    /// Only the provisioning and bootstrap paths can ask this, because they run before any tenant is
    /// resolved. Every other caller already knows which organization it is inside and uses
    /// <see cref="FindByCodeAsync"/> at the organization level instead, which stays inside that tenant.
    /// </remarks>
    Task<OrganizationAggregate?> FindOrganizationByCodeAsync(
        string code,
        CancellationToken cancellationToken = default);
}

/// <summary>Level of the organizational hierarchy a query addresses.</summary>
public enum OrganizationalUnitLevel
{
    /// <summary>The tenant root.</summary>
    Organization = 0,

    /// <summary>A legal or operational entity inside the tenant.</summary>
    Company = 1,

    /// <summary>A commercial brand.</summary>
    Brand = 2,

    /// <summary>A physical or administrative branch.</summary>
    Branch = 3,

    /// <summary>A point of sale or stock-keeping location.</summary>
    Store = 4
}

/// <summary>Read side of the roles a tenant defines.</summary>
public interface IRoleDirectory
{
    /// <summary>Returns a page of the roles of one scope.</summary>
    Task<PagedResult<Role>> ListAsync(TenantScope scope, PageRequest page, CancellationToken cancellationToken = default);

    /// <summary>Finds a role by code within a scope, or <see langword="null"/>.</summary>
    Task<Role?> FindByCodeAsync(TenantScope scope, string code, CancellationToken cancellationToken = default);

    /// <summary>
    /// Loads one role of the caller's tenant with its grants, tracked and ready to be changed.
    /// </summary>
    /// <remarks>
    /// The write path cannot use the read methods above, and not only because they are untracked. A role
    /// whose grants were never loaded is a role that believes it holds nothing, so a second grant of a
    /// permission it already has would be accepted by the aggregate and then refused by the unique index —
    /// turning a rule the caller could be told about into a database error.
    /// </remarks>
    Task<Role?> FindTrackedByIdAsync(Guid roleId, CancellationToken cancellationToken = default);
}

/// <summary>Read side of the platform-wide permission catalog.</summary>
/// <remarks>
/// The catalog is not tenant-owned, so it is the one part of authorization that is not tenant-filtered.
/// It carries no business data: a code, a category, a label and whether it may still be granted.
/// </remarks>
public interface IPermissionCatalog
{
    /// <summary>Returns a page of the catalog.</summary>
    Task<PagedResult<Permission>> ListAsync(PageRequest page, CancellationToken cancellationToken = default);

    /// <summary>
    /// Every catalog entry, unpaged. Reserved for the one caller that must validate a whole role template
    /// in a single round trip; ordinary administration reads use <see cref="ListAsync"/>.
    /// </summary>
    Task<IReadOnlyList<Permission>> ListAllAsync(CancellationToken cancellationToken = default);

    /// <summary>All active permission codes, used to validate a role template in one round trip.</summary>
    Task<IReadOnlyCollection<string>> ListActiveCodesAsync(CancellationToken cancellationToken = default);

    /// <summary>Resolves a permission by code, or <see langword="null"/> when it is not in the catalog.</summary>
    Task<Permission?> FindAsync(string code, CancellationToken cancellationToken = default);
}

/// <summary>
/// Write side of the permission catalog.
/// </summary>
/// <remarks>
/// Separate from the read port because the catalog has exactly one writer — the deployment that
/// declares it — and no tenant may invent a code. Keeping that asymmetry visible in the type system stops
/// a tenant administration use case from gaining the ability to publish capabilities.
/// </remarks>
public interface IPermissionCatalogWriter
{
    /// <summary>Adds a catalog entry that does not exist yet.</summary>
    void Add(Permission permission);

    /// <summary>Marks an existing entry as changed.</summary>
    void Update(Permission permission);
}

/// <summary>Read side of a tenant's configuration document.</summary>
public interface ITenantConfigurationDirectory
{
    /// <summary>Loads the configuration of one tenant, or <see langword="null"/> when it has none.</summary>
    Task<TenantConfiguration?> FindAsync(TenantScope scope, CancellationToken cancellationToken = default);
}
