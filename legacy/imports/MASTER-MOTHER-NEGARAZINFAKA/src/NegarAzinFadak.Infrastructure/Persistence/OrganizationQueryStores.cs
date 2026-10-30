using Microsoft.EntityFrameworkCore;
using NegarAzinFadak.Application.Tenancy;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Paging;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Organization.Domain;
using NegarAzinFadak.Organization.Domain.Configuration;
using NegarAzinFadak.Organization.Domain.Roles;
using OrganizationAggregate = NegarAzinFadak.Organization.Domain.Organization;

namespace NegarAzinFadak.Infrastructure.Persistence;

/// <summary>
/// Read side of the organizational hierarchy, one query per level.
/// </summary>
/// <remarks>
/// <para>
/// The five levels are five tables rather than one table with a discriminator, because their columns differ
/// and a legal organization is not a retail store. That makes a "list the children of this unit" question
/// level-specific, so this type names which level it is answering for instead of returning an untyped set
/// the caller would have to classify again.
/// </para>
/// <para>
/// Each query ignores the global filter and states the parent in the <c>WHERE</c> clause, because the scope
/// it receives is the *parent's*. The ambient filter would intersect with the caller's own organization,
/// which is redundant when a request is scoped to one tenant and silently wrong for a background job that
/// runs with no tenant in context — that job would see nothing and read as "this tenant has no branches".
/// </para>
/// </remarks>
public sealed class EfCoreOrganizationDirectory(NegarAzinFadakDbContext context) : IOrganizationDirectory
{
    private readonly NegarAzinFadakDbContext _context = Guard.AgainstNull(context);

    /// <inheritdoc />
    public Task<PagedResult<OrganizationalUnit>> ListAsync(
        TenantScope scope,
        OrganizationalUnitLevel level,
        PageRequest page,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(page);
        return PageAsync(Children(scope, level), page, cancellationToken);
    }

    /// <inheritdoc />
    public Task<OrganizationalUnit?> FindByCodeAsync(
        TenantScope scope,
        OrganizationalUnitLevel level,
        string code,
        CancellationToken cancellationToken = default)
    {
        var normalized = (code ?? string.Empty).Trim();
        return Children(scope, level)
            .AsNoTracking()
            .FirstOrDefaultAsync(unit => unit.Code == normalized, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<bool> CodeExistsAsync(
        TenantScope scope,
        OrganizationalUnitLevel level,
        string code,
        Guid? excludeUnitId,
        CancellationToken cancellationToken = default)
    {
        var normalized = (code ?? string.Empty).Trim();
        var query = Children(scope, level);

        if (excludeUnitId is { } excluded)
        {
            query = query.Where(unit => unit.Id != excluded);
        }

        return await query.AsNoTracking().AnyAsync(unit => unit.Code == normalized, cancellationToken)
            .ConfigureAwait(false);
    }

    /// <inheritdoc />
    public Task<OrganizationAggregate?> FindOrganizationByCodeAsync(
        string code,
        CancellationToken cancellationToken = default)
    {
        // Normalized by the aggregate's own rule rather than by a local trim, so that this lookup can only
        // ever find a tenant that exists.
        var normalized = OrganizationalUnit.NormalizeCodeForStorage(code ?? string.Empty);

        // The filter is ignored because the caller is by definition outside any tenant: it is looking for
        // the tenant root in order to learn which tenant it is.
        return _context.Organizations
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(organization => organization.Code == normalized, cancellationToken);
    }

    private static async Task<PagedResult<OrganizationalUnit>> PageAsync(
        IQueryable<OrganizationalUnit> units,
        PageRequest page,
        CancellationToken cancellationToken)
    {
        var total = await units.LongCountAsync(cancellationToken).ConfigureAwait(false);
        var items = await units
            .AsNoTracking()
            .OrderBy(unit => unit.Code)
            .ThenBy(unit => unit.Id)
            .Skip(page.Skip)
            .Take(page.PageSize)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return new PagedResult<OrganizationalUnit>(items, page.PageNumber, page.PageSize, total);
    }

    /// <summary>
    /// The children of <paramref name="scope"/> at <paramref name="level"/>, or an always-empty query for
    /// the organization level, which has no parent and therefore no "children of a parent" reading.
    /// </summary>
    private IQueryable<OrganizationalUnit> Children(TenantScope scope, OrganizationalUnitLevel level)
    {
        ArgumentNullException.ThrowIfNull(scope);

        return level switch
        {
            OrganizationalUnitLevel.Company => _context.Companies
                .IgnoreQueryFilters()
                .Where(company => company.ParentId == scope.OrganizationId),
            OrganizationalUnitLevel.Brand => _context.Brands
                .IgnoreQueryFilters()
                .Where(brand => brand.ParentId == scope.CompanyId),
            OrganizationalUnitLevel.Branch => _context.Branches
                .IgnoreQueryFilters()
                .Where(branch => branch.ParentId == scope.BrandId),
            OrganizationalUnitLevel.Store => _context.Stores
                .IgnoreQueryFilters()
                .Where(store => store.ParentId == scope.BranchId),
            _ => _context.Stores
                .IgnoreQueryFilters()
                .Where(store => store.ParentId == null)
        };
    }
}

/// <summary>Read side of the roles a tenant defines.</summary>
public sealed class EfCoreRoleDirectory(NegarAzinFadakDbContext context) : IRoleDirectory
{
    private readonly NegarAzinFadakDbContext _context = Guard.AgainstNull(context);

    /// <inheritdoc />
    public async Task<PagedResult<Role>> ListAsync(
        TenantScope scope,
        PageRequest page,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(page);

        var roles = RolesOf(scope);
        var total = await roles.LongCountAsync(cancellationToken).ConfigureAwait(false);
        var items = await roles
            .AsNoTracking()
            .Include(role => role.Permissions)
            .OrderBy(role => role.Code)
            .ThenBy(role => role.Id)
            .Skip(page.Skip)
            .Take(page.PageSize)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return new PagedResult<Role>(items, page.PageNumber, page.PageSize, total);
    }

    /// <inheritdoc />
    public Task<Role?> FindByCodeAsync(TenantScope scope, string code, CancellationToken cancellationToken = default)
        => RolesOf(scope)
            .AsNoTracking()
            .Include(role => role.Permissions)
            .FirstOrDefaultAsync(role => role.Code == (code ?? string.Empty).Trim(), cancellationToken);

    /// <inheritdoc />
    public async Task<Role?> FindTrackedByIdAsync(Guid roleId, CancellationToken cancellationToken = default)
        // No explicit organization predicate: the global filter already restricts the row to the caller's
        // tenant, and it applies to the loaded grants as well. A role of another organization is therefore
        // absent rather than refused, which is the same answer every other read gives.
        => await _context.Roles
            .Include(role => role.Permissions)
            .FirstOrDefaultAsync(role => role.Id == roleId, cancellationToken)
            .ConfigureAwait(false);

    /// <summary>
    /// Roles of the whole tenant.
    /// </summary>
    /// <remarks>
    /// A role is authorized for an organization, not for a company inside it, so the filter is on the
    /// tenant's own column rather than on the caller's exact scope. Filtering on the shadow
    /// <c>OrganizationId</c> instead of on the converted <c>Scope</c> matters: the former is a comparable,
    /// indexed Guid, while a predicate against a serialized scope string could only ever be a full-string
    /// match and would miss every row of a tenant once a session narrowed to a company.
    /// </remarks>
    private IQueryable<Role> RolesOf(TenantScope scope)
        => _context.Roles
            .IgnoreQueryFilters()
            .Where(role => EF.Property<Guid>(role, NegarAzinFadakDbContext.OrganizationIdColumn) == scope.OrganizationId);
}

/// <summary>Read side of the platform-wide permission catalog.</summary>
public sealed class EfCorePermissionCatalog(NegarAzinFadakDbContext context) : IPermissionCatalog
{
    private readonly NegarAzinFadakDbContext _context = Guard.AgainstNull(context);

    /// <inheritdoc />
    public async Task<PagedResult<Permission>> ListAsync(PageRequest page, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(page);

        var permissions = _context.Permissions.AsNoTracking();
        var total = await permissions.LongCountAsync(cancellationToken).ConfigureAwait(false);
        var items = await permissions
            .OrderBy(permission => permission.Category)
            .ThenBy(permission => permission.Code)
            .Skip(page.Skip)
            .Take(page.PageSize)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return new PagedResult<Permission>(items, page.PageNumber, page.PageSize, total);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<Permission>> ListAllAsync(CancellationToken cancellationToken = default)
        => await _context.Permissions
            .AsNoTracking()
            .OrderBy(permission => permission.Code)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

    /// <inheritdoc />
    public async Task<IReadOnlyCollection<string>> ListActiveCodesAsync(CancellationToken cancellationToken = default)
        => await _context.Permissions
            .AsNoTracking()
            .Where(permission => permission.IsActive)
            .OrderBy(permission => permission.Code)
            .Select(permission => permission.Code)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

    /// <inheritdoc />
    public Task<Permission?> FindAsync(string code, CancellationToken cancellationToken = default)
        => _context.Permissions
            .AsNoTracking()
            .FirstOrDefaultAsync(permission => permission.Code == (code ?? string.Empty).Trim(), cancellationToken);
}

/// <summary>Write side of the permission catalog.</summary>
/// <remarks>
/// Tracked rather than saved: the catalog is reconciled during startup or by an administrative use case,
/// and its rows must land in the same transaction as whatever triggered the reconciliation.
/// </remarks>
public sealed class EfCorePermissionCatalogWriter(NegarAzinFadakDbContext context) : IPermissionCatalogWriter
{
    private readonly NegarAzinFadakDbContext _context = Guard.AgainstNull(context);

    /// <inheritdoc />
    public void Add(Permission permission) => _context.Permissions.Add(Guard.AgainstNull(permission));

    /// <inheritdoc />
    public void Update(Permission permission) => _context.Permissions.Update(Guard.AgainstNull(permission));
}

/// <summary>Read side of a tenant's configuration document.</summary>
public sealed class EfCoreTenantConfigurationDirectory(NegarAzinFadakDbContext context)
    : ITenantConfigurationDirectory
{
    private readonly NegarAzinFadakDbContext _context = Guard.AgainstNull(context);

    /// <inheritdoc />
    public Task<TenantConfiguration?> FindAsync(TenantScope scope, CancellationToken cancellationToken = default)
        => _context.TenantConfigurations
            .IgnoreQueryFilters()
            .Include(configuration => configuration.Settings)
            .FirstOrDefaultAsync(
                configuration => EF.Property<Guid>(configuration, NegarAzinFadakDbContext.OrganizationIdColumn) == scope.OrganizationId,
                cancellationToken);
}
