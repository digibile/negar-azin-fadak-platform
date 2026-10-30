using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Auditing;
using NegarAzinFadak.Core.Domain;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Tenancy;

namespace NegarAzinFadak.Organization.Domain.Menus;

/// <summary>
/// One entry of a menu, and the node of the hierarchy a menu is made of.
/// </summary>
/// <remarks>
/// <para>
/// An item is an entity, not a value object, and it is owned by its <see cref="Menu"/> aggregate root: every
/// rule about where it may sit, what it may be called and what it may require is enforced by that root,
/// because none of them can be checked from the item alone. A code must be unique among its siblings; a parent
/// must exist in the same menu; a subtree must not become its own ancestor. Keeping those invariants in the
/// root is what makes them true for every writer, including the ones that arrive as a seeded base structure.
/// </para>
/// <para>
/// The item carries <see cref="RequiredPermissionCode"/> rather than a reference to a permission row, for the
/// same reason a role grants a code instead of holding a foreign key: the permission catalog is
/// platform-wide and read on every request, so storing a code is what keeps navigation loadable in a single
/// query and keeps a menu from carrying tenant-owned copies of platform data. The application layer resolves
/// the code against the catalog before an item is accepted, so a menu can never name a capability the
/// authorization layer is unable to enforce.
/// </para>
/// </remarks>
public sealed class MenuItem : Entity, IAuditable, ITenantScoped
{
    private MenuItem()
    {
        Code = string.Empty;
        Title = string.Empty;
        Module = string.Empty;
        Scope = TenantScope.None;
    }

    private MenuItem(
        Guid id,
        Guid menuId,
        Guid parentId,
        string code,
        string title,
        string? englishTitle,
        string? icon,
        string? route,
        int sortOrder,
        string? requiredPermissionCode,
        string module,
        int depth,
        bool isPlatformDefined,
        TenantScope scope)
        : base(id)
    {
        MenuId = Guard.AgainstEmpty(menuId);
        ParentId = parentId;
        Code = NormalizeCode(code);
        Title = NormalizeTitle(title);
        EnglishTitle = NormalizeOptional(englishTitle);
        Icon = NormalizeOptional(icon);
        Route = NormalizeOptional(route);
        SortOrder = sortOrder;
        RequiredPermissionCode = NormalizePermissionCode(requiredPermissionCode);
        Module = NormalizeModule(module);
        Depth = depth;
        IsPlatformDefined = isPlatformDefined;
        IsActive = true;
        Scope = Guard.AgainstNull(scope);
    }

    /// <summary>Menu this item belongs to. Constant for the life of the item.</summary>
    public Guid MenuId { get; private set; }

    /// <summary>
    /// Identifier of the parent item, or <see cref="Guid.Empty"/> for a top-level section.
    /// </summary>
    /// <remarks>
    /// Stored as a plain indexed column rather than as <see langword="null"/>, because "a code is unique
    /// among its siblings" can only be enforced by the database when a root is a value it can compare. With
    /// a nullable parent, every root row carries <c>NULL</c>, and both PostgreSQL and SQLite treat
    /// <c>NULL</c> values as distinct inside a unique index — the index would accept any number of
    /// same-coded root sections while looking like it was enforcing the rule. <see cref="Guid.Empty"/> is
    /// the value that means "no parent", and the API projects it back to <c>null</c> so the wire contract
    /// stays the one a client expects.
    /// </remarks>
    public Guid ParentId { get; private set; }

    /// <summary>True when the item is a top-level section of its menu.</summary>
    public bool IsRoot => ParentId == Guid.Empty;

    /// <summary>
    /// Stable code, unique among the siblings of <see cref="ParentId"/>.
    /// </summary>
    /// <remarks>
    /// Normalized to lower case, because the code is the identity a configuration template, an audit record
    /// and a permission mapping all refer to, and three spellings of one item is three items to whoever
    /// reads them later. The display title is free to change; this is not.
    /// </remarks>
    public string Code { get; private set; }

    /// <summary>Display title, shown to the operator.</summary>
    public string Title { get; private set; }

    /// <summary>English title, for the bilingual headings and exports the platform produces.</summary>
    public string? EnglishTitle { get; private set; }

    /// <summary>
    /// Name of the icon the client should draw, e.g. <c>dashboard</c>.
    /// </summary>
    /// <remarks>
    /// A name and not a URL or a path. An icon is a key into the client's own icon set, so storing
    /// anything addressable would let a menu row point the browser at a host of the deployment's choosing.
    /// </remarks>
    public string? Icon { get; private set; }

    /// <summary>Client route the item opens, e.g. <c>/management/users</c>. Null for a pure grouping item.</summary>
    public string? Route { get; private set; }

    /// <summary>Position among its siblings. Lower sorts first; ties are broken by code.</summary>
    public int SortOrder { get; private set; }

    /// <summary>
    /// Code of the catalog permission a caller must hold for this item to be part of their navigation.
    /// Null means the item is visible to any authenticated caller of the tenant.
    /// </summary>
    public string? RequiredPermissionCode { get; private set; }

    /// <summary>Owning module, e.g. <c>identity</c> or <c>marketplace</c>. Data, never an enum.</summary>
    public string Module { get; private set; }

    /// <summary>Distance from the root of the menu. Zero for a top-level section.</summary>
    public int Depth { get; private set; }

    /// <summary>
    /// True when the item came from the platform's configured base structure.
    /// </summary>
    /// <remarks>
    /// Such an item may be renamed, reordered, deactivated or given a different permission, but not
    /// deleted: it is the structure a deployment ships, and a tenant that removed it would find the gap
    /// only by asking for a route the client no longer links to.
    /// </remarks>
    public bool IsPlatformDefined { get; private set; }

    /// <summary>False hides the item from navigation without discarding the structure underneath it.</summary>
    public bool IsActive { get; private set; }

    /// <summary>Organizational coordinates of the owning tenant. Mirrors the menu's scope.</summary>
    public TenantScope Scope { get; private set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTimeOffset? ModifiedAt { get; set; }

    public Guid? ModifiedBy { get; set; }

    /// <summary>True when a caller holding <paramref name="permissionCodes"/> may see this item.</summary>
    /// <param name="permissionCodes">Permission codes the caller actually holds.</param>
    /// <remarks>
    /// An item with no required permission is visible to anyone, because a section that names no capability
    /// is claiming none. A caller is never granted an item by holding an unrelated permission, and an empty
    /// token is not treated as holding everything: a caller with no permissions at all sees only the items
    /// that require nothing, which is the honest answer rather than the whole menu.
    /// </remarks>
    public bool IsVisibleTo(IReadOnlyCollection<string> permissionCodes)
    {
        if (RequiredPermissionCode is null)
        {
            return true;
        }

        ArgumentNullException.ThrowIfNull(permissionCodes);
        return permissionCodes.Contains(RequiredPermissionCode, StringComparer.Ordinal);
    }

    /// <summary>Creates an item. Only the owning <see cref="Menu"/> may construct one.</summary>
    internal static MenuItem Create(
        Guid menuId,
        Guid parentId,
        string code,
        string title,
        string? englishTitle,
        string? icon,
        string? route,
        int sortOrder,
        string? requiredPermissionCode,
        string module,
        int depth,
        bool isPlatformDefined,
        TenantScope scope)
        => new(
            Guid.NewGuid(),
            menuId,
            parentId,
            code,
            title,
            englishTitle,
            icon,
            route,
            sortOrder,
            requiredPermissionCode,
            module,
            depth,
            isPlatformDefined,
            scope);

    /// <summary>Replaces the descriptive fields and the ordering of the item.</summary>
    /// <remarks>
    /// The code and the parent are not changed here. The code is the identity the structure is referred to
    /// by, and the parent is what the depth and the sibling-uniqueness rule are computed from; both belong
    /// to <see cref="Menu.UpdateItemCode"/> and <see cref="Menu.MoveItem"/>, which can check what they
    /// would break.
    /// </remarks>
    public Result Update(
        string title,
        string? englishTitle,
        string? icon,
        string? route,
        int sortOrder,
        string? requiredPermissionCode,
        string module)
    {
        if (sortOrder < 0)
        {
            return Result.Failure(MenuErrors.ItemSortOrderInvalid);
        }

        if (!IsValidRoute(route))
        {
            return Result.Failure(MenuErrors.ItemRouteInvalid(route ?? string.Empty));
        }

        Title = NormalizeTitle(title);
        EnglishTitle = NormalizeOptional(englishTitle);
        Icon = NormalizeOptional(icon);
        Route = NormalizeOptional(route);
        SortOrder = sortOrder;
        RequiredPermissionCode = NormalizePermissionCode(requiredPermissionCode);
        Module = NormalizeModule(module);

        return Result.Success();
    }

    /// <summary>
    /// Reassigns the code, which the owning menu has already checked against the sibling-uniqueness rule.
    /// </summary>
    /// <remarks>
    /// Internal rather than public, so the only way to change a code is through the aggregate that can
    /// report a collision. An item that could recode itself would let a duplicate reach the database, where
    /// it becomes a 500 rather than the conflict the caller could act on.
    /// </remarks>
    internal void RenameCode(string normalizedCode) => Code = normalizedCode;

    /// <summary>Shows the item in navigation again.</summary>
    public Result Activate()
    {
        if (IsActive)
        {
            return Result.Failure(MenuErrors.ItemAlreadyActive(Code));
        }

        IsActive = true;
        return Result.Success();
    }

    /// <summary>
    /// Hides the item from navigation.
    /// </summary>
    /// <remarks>
    /// Deactivation rather than deletion, and the item stays in place in the tree. A section that is
    /// withdrawn and later restored should come back in the position it was designed for, and the children
    /// underneath it are not collateral damage of the parent's visibility.
    /// </remarks>
    public Result Deactivate()
    {
        if (!IsActive)
        {
            return Result.Failure(MenuErrors.ItemAlreadyInactive(Code));
        }

        IsActive = false;
        return Result.Success();
    }

    /// <summary>
    /// Re-parents the item and places it directly beneath its new parent.
    /// </summary>
    /// <param name="parentId">New parent, or <see cref="Guid.Empty"/> for a top-level section.</param>
    /// <param name="parentDepth">Depth of the new parent, or zero for a top-level section.</param>
    /// <remarks>
    /// Only this item. Its descendants keep the offsets they already have relative to it, and the owner walks
    /// them separately — an item cannot reach its own children, and a method that appeared to shift a whole
    /// subtree while shifting one row would leave a branch whose grandchildren sit at their parent's level.
    /// </remarks>
    internal void Reparent(Guid parentId, int parentDepth)
    {
        ParentId = parentId;
        Depth = parentDepth + 1;
    }

    /// <summary>Places the item one level up or down, keeping it at the same distance from its parent.</summary>
    internal void ShiftDepth(int amount)
    {
        if (amount != 0)
        {
            Depth += amount;
        }
    }

    /// <summary>Reassigns the scope after the owning menu's coordinates are known to be final.</summary>
    internal void AssignScope(TenantScope scope) => Scope = Guard.AgainstNull(scope);

    /// <summary>
    /// Whether <paramref name="route"/> is a route this platform can hand to a client.
    /// </summary>
    /// <remarks>
    /// A route must be a client-side path. An absolute URL would make a menu row an outbound link that every
    /// operator's browser would follow on click, which is a navigation feature nobody asked for and a
    /// place to hide a phishing page behind a trusted menu.
    /// </remarks>
    public static bool IsValidRoute(string? route)
    {
        if (string.IsNullOrWhiteSpace(route))
        {
            return true;
        }

        return route.Trim().StartsWith('/') && !route.Trim().StartsWith("//", StringComparison.Ordinal);
    }

    /// <summary>
    /// The canonical stored form of an item code.
    /// </summary>
    /// <remarks>
    /// Exposed because a read path has to normalize exactly the way construction does. When this rule lived
    /// only inside the constructor, a lookup that trimmed but did not lower-case would quietly stop finding
    /// sections that plainly exist — a failure that reads as a missing menu rather than a mismatched rule.
    /// </remarks>
    public static string NormalizeCodeForStorage(string code) => NormalizeCode(code);

    private static string NormalizeCode(string code)
    {
        var trimmed = Guard.AgainstNullOrWhiteSpace(code).Trim().ToLowerInvariant();
        if (trimmed.Length > 64)
        {
            throw new ArgumentException("A menu item code must not exceed 64 characters.", nameof(code));
        }

        return trimmed;
    }

    private static string NormalizeTitle(string title)
    {
        var trimmed = Guard.AgainstNullOrWhiteSpace(title).Trim();
        if (trimmed.Length > 256)
        {
            throw new ArgumentException("A menu item title must not exceed 256 characters.", nameof(title));
        }

        return trimmed;
    }

    private static string NormalizeModule(string module)
    {
        var trimmed = Guard.AgainstNullOrWhiteSpace(module).Trim().ToLowerInvariant();
        if (trimmed.Length > 64)
        {
            throw new ArgumentException("A menu item module must not exceed 64 characters.", nameof(module));
        }

        return trimmed;
    }

    private static string? NormalizePermissionCode(string? permissionCode)
    {
        if (string.IsNullOrWhiteSpace(permissionCode))
        {
            return null;
        }

        var trimmed = permissionCode.Trim().ToLowerInvariant();
        if (trimmed.Length > 128)
        {
            throw new ArgumentException("A permission code must not exceed 128 characters.", nameof(permissionCode));
        }

        return trimmed;
    }

    private static string? NormalizeOptional(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
