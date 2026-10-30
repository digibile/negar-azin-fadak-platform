using NegarAzinFadak.Organization.Domain.Menus;

namespace NegarAzinFadak.Application.Navigation;

/// <summary>
/// One node of the navigation tree, as a client receives it.
/// </summary>
/// <remarks>
/// A projection and not the aggregate, for one reason: the aggregate is a container of siblings, and a
/// client needs a tree. Reading a menu means answering "which sections, in what order, and under which
/// parent", and a node that carries its own children is the only shape that answers it without the client
/// re-deriving the hierarchy — or getting it subtly wrong, which is how a permission-gated section ends up
/// rendered with an orphaned child under it.
/// </remarks>
/// <param name="Id">Identifier of the item.</param>
/// <param name="ParentId">Parent item, or null for a top-level section.</param>
/// <param name="Code">Stable code, unique among the siblings.</param>
/// <param name="Title">Display title.</param>
/// <param name="EnglishTitle">English title, when the platform produces one.</param>
/// <param name="Icon">Icon name for the client to draw.</param>
/// <param name="Route">Client route the item opens, or null for a pure grouping item.</param>
/// <param name="SortOrder">Position among its siblings.</param>
/// <param name="RequiredPermissionCode">Catalog permission a caller must hold, or null for none.</param>
/// <param name="Module">Module the item opens.</param>
/// <param name="Depth">Distance from the root of the menu.</param>
/// <param name="Level">Level of the menu this node came from, so a client can group by tenant, company or brand.</param>
/// <param name="MenuId">Menu this node came from.</param>
/// <param name="MenuCode">Code of that menu.</param>
/// <param name="IsActive">False when the item is withdrawn from navigation.</param>
/// <param name="IsPlatformDefined">True for an item of the platform's base structure, which cannot be removed.</param>
/// <param name="Children">Nested items, in display order.</param>
/// <remarks>
/// The two flags are carried even though the effective tree only ever contains active items, because the
/// administration read shares this projection and keeps withdrawn sections. A client that has to decide
/// between greying a section out and hiding it needs to know which it is looking at, and guessing from a
/// missing parent would be the wrong answer every time.
/// </remarks>
public sealed record MenuTreeNode(
    Guid Id,
    Guid? ParentId,
    string Code,
    string Title,
    string? EnglishTitle,
    string? Icon,
    string? Route,
    int SortOrder,
    string? RequiredPermissionCode,
    string Module,
    int Depth,
    MenuLevel Level,
    Guid MenuId,
    string MenuCode,
    bool IsActive,
    bool IsPlatformDefined,
    IReadOnlyList<MenuTreeNode> Children)
{
    /// <summary>True when the item opens something rather than only grouping other items.</summary>
    public bool IsLeaf => Route is not null;
}

/// <summary>
/// The navigation a caller is entitled to, grouped by the level each menu was defined for.
/// </summary>
/// <param name="Menus">One entry per menu that applies to the caller, ordered tenant first, then company, then brand.</param>
/// <param name="SectionCount">Number of items across every menu, for a screen that reports the size of the structure.</param>
public sealed record EffectiveMenuTree(IReadOnlyList<MenuTree> Menus, int SectionCount);

/// <summary>One menu's structure, as a client receives it.</summary>
/// <param name="Id">Identifier of the menu.</param>
/// <param name="Code">Code of the menu.</param>
/// <param name="Title">Display title of the menu.</param>
/// <param name="EnglishTitle">English title of the menu.</param>
/// <param name="Level">Level the menu was defined for.</param>
/// <param name="IsActive">False when the whole menu is withdrawn from navigation.</param>
/// <param name="IsPlatformDefined">True when the menu came from the platform's base structure.</param>
/// <param name="Sections">Top-level sections, in display order, each with its own subtree.</param>
/// <remarks>
/// The menu's own flags are carried here rather than left on the aggregate because an administration screen
/// has to answer two questions the sections cannot: is this menu withdrawn, and may it be removed. A read
/// model that dropped them would force the client to call a second endpoint to find out, and the answer
/// would be a second answer taken at a second moment.
/// </remarks>
public sealed record MenuTree(
    Guid Id,
    string Code,
    string Title,
    string? EnglishTitle,
    MenuLevel Level,
    bool IsActive,
    bool IsPlatformDefined,
    IReadOnlyList<MenuTreeNode> Sections);

/// <summary>
/// Turns menu aggregates into the tree a client renders, filtered to what a caller may actually see.
/// </summary>
/// <remarks>
/// <para>
/// The filtering rule is that a permission-gated item takes its children with it. A child whose parent was
/// withheld is itself unreachable, so sending it would produce a navigation entry with no path to it — a link
/// the operator can see and cannot use. The walk is therefore top-down from the roots and only descends
/// into nodes it has already decided to keep, which also means an orphaned row left behind by a bad edit is
/// dropped rather than promoted to the top level.
/// </para>
/// <para>
/// The order is <see cref="MenuItem.SortOrder"/> then code. The secondary key is what makes the order total:
/// two sections declared with the same position would otherwise swap places between two reads, and a menu
/// that reshuffles itself on refresh is a menu nobody trusts.
/// </para>
/// </remarks>
public static class MenuTreeBuilder
{
    /// <summary>Builds the effective tree of every supplied menu, for the permissions the caller holds.</summary>
    /// <param name="menus">Menus that apply to the caller. An inactive menu contributes nothing.</param>
    /// <param name="grantedPermissionCodes">Permission codes the caller's validated token carries.</param>
    public static EffectiveMenuTree Build(
        IReadOnlyCollection<Menu> menus,
        IReadOnlyCollection<string> grantedPermissionCodes)
    {
        ArgumentNullException.ThrowIfNull(menus);
        ArgumentNullException.ThrowIfNull(grantedPermissionCodes);

        var trees = new List<MenuTree>();
        var total = 0;

        foreach (var menu in Order(menus))
        {
            if (!menu.IsActive)
            {
                continue;
            }

            var sections = Walk(menu, menu.RootItems(), grantedPermissionCodes);
            total += Count(sections);
            trees.Add(new MenuTree(
                menu.Id,
                menu.Code,
                menu.Title,
                menu.EnglishTitle,
                menu.Level,
                menu.IsActive,
                menu.IsPlatformDefined,
                sections));
        }

        return new EffectiveMenuTree(trees.AsReadOnly(), total);
    }

    /// <summary>Builds one menu's full structure, keeping inactive items so a screen can show what is withdrawn.</summary>
    /// <param name="menu">Menu to project.</param>
    /// <param name="grantedPermissionCodes">
    /// Permission codes to filter by, or <see langword="null"/> to keep every item the caller may hold and
    /// leave the permission decision to the client. Used by the administration read, which must be able to
    /// show a section nobody currently holds, and to point at who can reach it.
    /// </param>
    public static MenuTree BuildOne(Menu menu, IReadOnlyCollection<string>? grantedPermissionCodes = null)
    {
        ArgumentNullException.ThrowIfNull(menu);

        var sections = Walk(menu, menu.RootItems(), grantedPermissionCodes, respectActive: false);
        return new MenuTree(
            menu.Id,
            menu.Code,
            menu.Title,
            menu.EnglishTitle,
            menu.Level,
            menu.IsActive,
            menu.IsPlatformDefined,
            sections);
    }

    private static IReadOnlyList<MenuTreeNode> Walk(
        Menu menu,
        IReadOnlyList<MenuItem> items,
        IReadOnlyCollection<string>? grantedPermissionCodes,
        bool respectActive = true)
    {
        var kept = new List<MenuTreeNode>(items.Count);

        foreach (var item in items)
        {
            if (respectActive && !item.IsActive)
            {
                continue;
            }

            if (grantedPermissionCodes is not null && !item.IsVisibleTo(grantedPermissionCodes))
            {
                continue;
            }

            kept.Add(new MenuTreeNode(
                item.Id,
                item.IsRoot ? null : item.ParentId,
                item.Code,
                item.Title,
                item.EnglishTitle,
                item.Icon,
                item.Route,
                item.SortOrder,
                item.RequiredPermissionCode,
                item.Module,
                item.Depth,
                menu.Level,
                menu.Id,
                menu.Code,
                item.IsActive,
                item.IsPlatformDefined,
                Walk(menu, menu.ChildrenOf(item.Id), grantedPermissionCodes, respectActive)));
        }

        return kept.AsReadOnly();
    }

    /// <summary>
    /// Tenant first, then company, then brand.
    /// </summary>
    /// <remarks>
    /// The order is the inheritance order, not an alphabetical one: the sections a brand inherits from its
    /// tenant have to be drawn before the ones it adds itself, or the client renders a general section nested
    /// under a specific one.
    /// </remarks>
    private static IEnumerable<Menu> Order(IEnumerable<Menu> menus)
        => menus
            .OrderBy(menu => menu.Level)
            .ThenBy(menu => menu.Code, StringComparer.Ordinal);

    private static int Count(IEnumerable<MenuTreeNode> nodes)
        => nodes.Sum(node => 1 + Count(node.Children));
}
