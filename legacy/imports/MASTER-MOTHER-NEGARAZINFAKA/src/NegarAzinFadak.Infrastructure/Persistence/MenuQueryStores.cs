using Microsoft.EntityFrameworkCore;
using NegarAzinFadak.Application.Navigation;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Organization.Domain.Menus;

namespace NegarAzinFadak.Infrastructure.Persistence;

/// <summary>
/// Reads the navigation menus of a tenant, its companies and its brands.
/// </summary>
/// <remarks>
/// <para>
/// The organization predicate is in <c>SQL</c>; the narrowing to the levels a caller may see happens in
/// memory. That split is not an accident of convenience. A menu carries a serialized
/// <see cref="TenantScope"/>, and a predicate reaching into <c>Scope.CompanyId</c> cannot be translated
/// against a value-converted column, so the only in-database option would be new indexed columns for a
/// narrowing rule that touches a handful of rows. A tenant has a small number of menus and each holds tens
/// to low hundreds of sections, so the whole set is fetched and narrowed in memory, and the tree is built
/// from it without a round trip per level.
/// </para>
/// <para>
/// Menus of the caller's own level and of every level above it are returned, because the levels compose: a
/// brand operator navigates the tenant's sections, then their company's, then their brand's. A company menu
/// belonging to a different company is not, which is why the ancestry check is present at all.
/// </para>
/// </remarks>
public sealed class EfCoreMenuDirectory(NegarAzinFadakDbContext context) : IMenuDirectory
{
    private readonly NegarAzinFadakDbContext _context = Guard.AgainstNull(context);

    /// <inheritdoc />
    public async Task<IReadOnlyList<Menu>> ListVisibleAsync(
        TenantScope scope,
        CancellationToken cancellationToken = default)
    {
        if (scope.IsEmpty)
        {
            return [];
        }

        var menus = await MenusOfOrganization(scope.OrganizationId)
            .Include(menu => menu.Items)
            .AsNoTracking()
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return menus
            .Where(menu => AppliesTo(menu, scope))
            .OrderBy(menu => menu.Level)
            .ThenBy(menu => menu.Code, StringComparer.Ordinal)
            .ToArray()
            .AsReadOnly();
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<Menu>> ListAtLevelAsync(
        TenantScope scope,
        MenuLevel level,
        CancellationToken cancellationToken = default)
    {
        if (scope.IsEmpty)
        {
            return [];
        }

        var menus = await MenusOfOrganization(scope.OrganizationId)
            .Include(menu => menu.Items)
            .AsNoTracking()
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return menus
            .Where(menu => menu.Level == level && AppliesTo(menu, scope))
            .OrderBy(menu => menu.Code, StringComparer.Ordinal)
            .ToArray()
            .AsReadOnly();
    }

    /// <inheritdoc />
    public Task<Menu?> FindTrackedByIdAsync(Guid menuId, CancellationToken cancellationToken = default)
        // No explicit organization predicate, for the same reason the role store omits one: the global filter
        // already restricts the row to the caller's tenant, so a menu of another organization is absent rather
        // than refused, which is the same answer every other read gives.
        => _context.Menus
            .Include(menu => menu.Items)
            .FirstOrDefaultAsync(menu => menu.Id == menuId, cancellationToken);

    /// <inheritdoc />
    public async Task<Menu?> FindTrackedByCodeAsync(
        TenantScope scope,
        MenuLevel level,
        string code,
        CancellationToken cancellationToken = default)
    {
        var normalized = Menu.NormalizeCodeForStorage(code);
        var candidates = await MenusOfOrganization(scope.OrganizationId)
            .Where(menu => menu.Level == level && menu.Code == normalized)
            .Include(menu => menu.Items)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        // The level is in the query, but the exact coordinates are re-checked here: a company menu and a
        // tenant menu can both be reachable by the caller's organization, and only the scope says which one
        // this code belongs to.
        return candidates.FirstOrDefault(menu => menu.Scope == scope);
    }

    /// <inheritdoc />
    public async Task<bool> CodeExistsAsync(
        TenantScope scope,
        MenuLevel level,
        string code,
        CancellationToken cancellationToken = default)
    {
        var normalized = Menu.NormalizeCodeForStorage(code);
        return await MenusOfOrganization(scope.OrganizationId)
            .AsNoTracking()
            .AnyAsync(menu => menu.Level == level && menu.Code == normalized && menu.Scope == scope, cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Menus of one organization, across every level.
    /// </summary>
    /// <remarks>
    /// The filter is ignored and the organization is stated in the <c>WHERE</c> clause instead, because
    /// these ports are also called by provisioning and by platform jobs that run with no tenant in context.
    /// The ambient filter would intersect with such a caller's own organization — or, for a provisioning
    /// process, with a tenant that did not exist yet — and the answer would be an empty menu rather than the
    /// one that is being installed.
    /// </remarks>
    private IQueryable<Menu> MenusOfOrganization(Guid organizationId)
        => _context.Menus
            .IgnoreQueryFilters()
            .Where(menu => EF.Property<Guid>(menu, NegarAzinFadakDbContext.OrganizationIdColumn) == organizationId);

    /// <summary>
    /// Whether a menu defined at one level is part of the navigation of a caller acting in
    /// <paramref name="scope"/>.
    /// </summary>
    /// <remarks>
    /// The caller's scope must be the menu's own or sit inside it. A tenant-wide menu therefore applies to
    /// every company and brand of that organization, while a company menu applies only to that company and
    /// its brands. The reverse test would be the isolation bug this whole rule exists to prevent: a brand
    /// operator receiving the menus of the other brands in the same company.
    /// </remarks>
    private static bool AppliesTo(Menu menu, TenantScope scope)
    {
        if (menu.Scope.OrganizationId != scope.OrganizationId)
        {
            return false;
        }

        if (Menu.ResolveLevel(scope) is not { } callerLevel)
        {
            return false;
        }

        return menu.Level <= callerLevel
            && (menu.Scope.CompanyId is null || menu.Scope.CompanyId == scope.CompanyId)
            && (menu.Scope.BrandId is null || menu.Scope.BrandId == scope.BrandId);
    }
}
