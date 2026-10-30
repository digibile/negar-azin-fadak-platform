using NegarAzinFadak.Application.Navigation;
using NegarAzinFadak.Organization.Domain.Menus;

namespace NegarAzinFadak.Api.Endpoints;

/// <summary>Body of a menu definition request.</summary>
/// <param name="Code">Stable code, unique at this level within the tenant.</param>
/// <param name="Title">Display title.</param>
/// <param name="EnglishTitle">English title, when the platform produces one.</param>
/// <remarks>
/// The level is absent on purpose. It is a property of the caller's session, so a body that carried one
/// would let a tenant administrator define a menu that every company would then see.
/// </remarks>
public sealed record MenuRequest(string Code, string Title, string? EnglishTitle);

/// <summary>Body of a section creation request.</summary>
/// <param name="Code">Stable code, unique among the siblings it is added next to.</param>
/// <param name="Title">Display title.</param>
/// <param name="EnglishTitle">English title, when the platform produces one.</param>
/// <param name="Icon">Icon name for the client to draw.</param>
/// <param name="Route">Client route the section opens, omitted for a pure grouping section.</param>
/// <param name="SortOrder">Position among its siblings.</param>
/// <param name="Permission">Catalog permission a caller must hold for the section to appear, omitted for none.</param>
/// <param name="Module">Module the section opens.</param>
public sealed record MenuItemRequest(
    string Code,
    string Title,
    string? EnglishTitle,
    string? Icon,
    string? Route,
    int SortOrder,
    string? Permission,
    string? Module);

/// <summary>Body of a section change request. The code is absent: recoding is a separate operation.</summary>
/// <param name="Title">Display title.</param>
/// <param name="EnglishTitle">English title, when the platform produces one.</param>
/// <param name="Icon">Icon name for the client to draw.</param>
/// <param name="Route">Client route the section opens, omitted for a pure grouping section.</param>
/// <param name="SortOrder">Position among its siblings.</param>
/// <param name="Permission">Catalog permission a caller must hold for the section to appear, omitted for none.</param>
/// <param name="Module">Module the section opens.</param>
public sealed record MenuItemEditRequest(
    string Title,
    string? EnglishTitle,
    string? Icon,
    string? Route,
    int SortOrder,
    string? Permission,
    string? Module);

/// <summary>Body of a section recoding request.</summary>
/// <param name="Code">New stable code, unique among the item's siblings.</param>
public sealed record MenuItemCodeRequest(string Code);

/// <summary>Body of a section move request.</summary>
/// <param name="ParentId">New parent section, or null to promote the section to the top level.</param>
public sealed record MenuItemMoveRequest(Guid? ParentId);

/// <summary>A section, as returned right after it was created.</summary>
/// <param name="Id">Identifier of the section.</param>
/// <param name="ParentId">Parent section, or null for a top-level section.</param>
/// <param name="Code">Stable code, unique among the siblings.</param>
/// <param name="Title">Display title.</param>
/// <param name="EnglishTitle">English title, when the platform produces one.</param>
/// <param name="Icon">Icon name for the client to draw.</param>
/// <param name="Route">Client route the section opens, or null for a pure grouping section.</param>
/// <param name="SortOrder">Position among its siblings.</param>
/// <param name="Permission">Catalog permission required to see the section, or null for none.</param>
/// <param name="Module">Module the section opens.</param>
/// <param name="Depth">Distance from the top level of the menu.</param>
/// <param name="IsActive">False when the section is withdrawn from navigation.</param>
/// <param name="IsPlatformDefined">True for a section of the platform's base structure, which cannot be removed.</param>
/// <remarks>
/// The flat shape, not the tree node, is returned after a create. The client already has the menu it just
/// added to, and reading the tree back to find the new section would mean re-deriving it from a payload that
/// has already been filtered by the caller's own permissions — so a section whose permission the caller
/// happens not to hold would come back as a 404.
/// </remarks>
public sealed record MenuItemResponse(
    Guid Id,
    Guid? ParentId,
    string Code,
    string Title,
    string? EnglishTitle,
    string? Icon,
    string? Route,
    int SortOrder,
    string? Permission,
    string Module,
    int Depth,
    bool IsActive,
    bool IsPlatformDefined)
{
    /// <summary>Projects a menu section onto the wire shape.</summary>
    public static MenuItemResponse From(MenuItem item)
    {
        ArgumentNullException.ThrowIfNull(item);

        return new MenuItemResponse(
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
            item.IsActive,
            item.IsPlatformDefined);
    }
}

/// <summary>
/// One section of a navigation menu, as a client receives it.
/// </summary>
/// <param name="Id">Identifier of the section.</param>
/// <param name="ParentId">Parent section, or null for a top-level section.</param>
/// <param name="Code">Stable code, unique among the siblings.</param>
/// <param name="Title">Display title.</param>
/// <param name="EnglishTitle">English title, when the platform produces one.</param>
/// <param name="Icon">Icon name for the client to draw.</param>
/// <param name="Route">Client route the section opens, or null for a pure grouping section.</param>
/// <param name="SortOrder">Position among its siblings.</param>
/// <param name="Permission">Catalog permission required to see the section, or null for none.</param>
/// <param name="Module">Module the section opens.</param>
/// <param name="Depth">Distance from the top level of the menu.</param>
/// <param name="Level">Level of the menu this section came from.</param>
/// <param name="IsActive">False when the section is withdrawn from navigation.</param>
/// <param name="IsPlatformDefined">True for a section of the platform's base structure, which cannot be removed.</param>
/// <param name="IsLeaf">True when the section opens something rather than only grouping others.</param>
/// <param name="Children">Nested sections, in display order.</param>
public sealed record MenuTreeNodeResponse(
    Guid Id,
    Guid? ParentId,
    string Code,
    string Title,
    string? EnglishTitle,
    string? Icon,
    string? Route,
    int SortOrder,
    string? Permission,
    string Module,
    int Depth,
    string Level,
    bool IsActive,
    bool IsPlatformDefined,
    bool IsLeaf,
    IReadOnlyList<MenuTreeNodeResponse> Children)
{
    /// <summary>Projects a navigation node onto the wire shape.</summary>
    public static MenuTreeNodeResponse From(MenuTreeNode node)
    {
        ArgumentNullException.ThrowIfNull(node);

        return new MenuTreeNodeResponse(
            node.Id,
            node.ParentId,
            node.Code,
            node.Title,
            node.EnglishTitle,
            node.Icon,
            node.Route,
            node.SortOrder,
            node.RequiredPermissionCode,
            node.Module,
            node.Depth,
            node.Level.ToString(),
            node.IsActive,
            node.IsPlatformDefined,
            node.IsLeaf,
            node.Children.Select(From).ToArray().AsReadOnly());
    }
}

/// <summary>One menu of the caller's navigation, as a client receives it.</summary>
/// <param name="Id">Identifier of the menu.</param>
/// <param name="Code">Code of the menu.</param>
/// <param name="Title">Display title of the menu.</param>
/// <param name="EnglishTitle">English title of the menu.</param>
/// <param name="Level">Level the menu was defined for: tenant, company or brand.</param>
/// <param name="IsActive">False when the whole menu is withdrawn from navigation.</param>
/// <param name="IsPlatformDefined">True when the menu came from the platform's base structure.</param>
/// <param name="Sections">Top-level sections, in display order, each with its own subtree.</param>
public sealed record MenuResponse(
    Guid Id,
    string Code,
    string Title,
    string? EnglishTitle,
    string Level,
    bool IsActive,
    bool IsPlatformDefined,
    IReadOnlyList<MenuTreeNodeResponse> Sections)
{
    /// <summary>Projects a menu, and the tree projected from it, onto the wire shape.</summary>
    public static MenuResponse From(MenuTree tree)
    {
        ArgumentNullException.ThrowIfNull(tree);

        return new MenuResponse(
            tree.Id,
            tree.Code,
            tree.Title,
            tree.EnglishTitle,
            tree.Level.ToString(),
            tree.IsActive,
            tree.IsPlatformDefined,
            tree.Sections.Select(MenuTreeNodeResponse.From).ToArray().AsReadOnly());
    }
}

/// <summary>The caller's effective navigation.</summary>
/// <param name="Menus">Menus that apply to the caller, ordered tenant first, then company, then brand.</param>
/// <param name="SectionCount">Number of sections across every menu, after permission filtering.</param>
public sealed record EffectiveMenuTreeResponse(IReadOnlyList<MenuResponse> Menus, int SectionCount)
{
    /// <summary>Projects the effective tree onto the wire shape.</summary>
    public static EffectiveMenuTreeResponse From(EffectiveMenuTree tree)
    {
        ArgumentNullException.ThrowIfNull(tree);

        return new EffectiveMenuTreeResponse(
            tree.Menus.Select(MenuResponse.From).ToArray().AsReadOnly(),
            tree.SectionCount);
    }
}

/// <summary>What one run of the base-structure installer did, for the client that asked for it.</summary>
/// <param name="MenuId">The menu the sections were installed into, or null when the deployment declares no base menu.</param>
/// <param name="SectionsAdded">Sections this run created.</param>
/// <param name="SectionsKept">Sections the menu already had and this run left untouched.</param>
/// <param name="SectionsSkipped">Sections this run did not install, because their parent had been withdrawn.</param>
public sealed record MenuPublicationResponse(
    Guid? MenuId,
    int SectionsAdded,
    int SectionsKept,
    int SectionsSkipped)
{
    /// <summary>Projects an installation onto the wire shape.</summary>
    public static MenuPublicationResponse From(MenuInstallation installation)
    {
        ArgumentNullException.ThrowIfNull(installation);

        return new MenuPublicationResponse(
            installation.MenuId,
            installation.SectionsAdded,
            installation.SectionsKept,
            installation.SectionsSkipped);
    }
}
