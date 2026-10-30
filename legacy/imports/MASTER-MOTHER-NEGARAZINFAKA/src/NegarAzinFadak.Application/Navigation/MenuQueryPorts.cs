using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Organization.Domain.Menus;

namespace NegarAzinFadak.Application.Navigation;

/// <summary>
/// Read side of the navigation menus a caller can see.
/// </summary>
/// <remarks>
/// Every method takes the scope explicitly, because these ports are also called by provisioning and by
/// platform-level jobs that run without a request. A query that silently inherited "the current tenant"
/// would be answering a different question for a background worker than for a request.
/// </remarks>
public interface IMenuDirectory
{
    /// <summary>
    /// The menus that apply to a caller acting in <paramref name="scope"/>.
    /// </summary>
    /// <remarks>
    /// The tenant's own menu plus every menu defined at a level at or above the caller's own, because the
    /// levels compose: a brand operator navigates the tenant's sections, then their company's, then their
    /// brand's. A caller scoped to a brand must not receive a company or brand menu belonging to a different
    /// company, which is what makes the level filter the isolation rule here rather than the organization.
    /// </remarks>
    Task<IReadOnlyList<Menu>> ListVisibleAsync(TenantScope scope, CancellationToken cancellationToken = default);

    /// <summary>The menus defined at exactly one level, for an administration screen.</summary>
    Task<IReadOnlyList<Menu>> ListAtLevelAsync(
        TenantScope scope,
        MenuLevel level,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Loads one menu with its items, tracked and ready to be changed.
    /// </summary>
    /// <remarks>
    /// The write path cannot use the read methods, and not only because they are untracked. A menu whose
    /// items were never loaded believes it is empty, so it would accept a duplicate sibling code and let the
    /// unique index refuse it — turning a rule the caller could be told about into a database error.
    /// </remarks>
    Task<Menu?> FindTrackedByIdAsync(Guid menuId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Loads the menu with this code at the level, tracked with its items, or <see langword="null"/>.
    /// </summary>
    /// <remarks>
    /// Used by the base-structure installer, which has to recognise a menu it installed on a previous run.
    /// It asks by code rather than by identifier because the identifier of a provisioned menu is generated
    /// per tenant and the code is what configuration knows.
    /// </remarks>
    Task<Menu?> FindTrackedByCodeAsync(
        TenantScope scope,
        MenuLevel level,
        string code,
        CancellationToken cancellationToken = default);

    /// <summary>True when a menu with this code already exists at the level.</summary>
    Task<bool> CodeExistsAsync(
        TenantScope scope,
        MenuLevel level,
        string code,
        CancellationToken cancellationToken = default);
}
