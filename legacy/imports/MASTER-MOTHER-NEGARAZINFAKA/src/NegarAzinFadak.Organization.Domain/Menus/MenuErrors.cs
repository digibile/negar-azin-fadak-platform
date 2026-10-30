using NegarAzinFadak.Core.Results;

namespace NegarAzinFadak.Organization.Domain.Menus;

/// <summary>
/// Stable error codes of the menu and navigation module.
/// </summary>
/// <remarks>
/// Navigation is what an operator sees, so a refusal here is not cosmetic: an item created with the wrong
/// parent disappears from the tree, and an item created with a permission code the catalog does not hold
/// never appears for anybody. Every code below therefore names the rule that was broken rather than the
/// shape of the request that broke it.
/// </remarks>
public static class MenuErrors
{
    public const string MenuNotFoundCode = "navigation.menu.not_found";
    public const string MenuCodeInvalidCode = "navigation.menu.code_invalid";
    public const string MenuTitleInvalidCode = "navigation.menu.title_invalid";
    public const string MenuDuplicateCodeCode = "navigation.menu.duplicate_code";
    public const string MenuScopeInvalidCode = "navigation.menu.scope_invalid";
    public const string MenuInactiveCode = "navigation.menu.inactive";
    public const string MenuAlreadyActiveCode = "navigation.menu.already_active";
    public const string MenuAlreadyInactiveCode = "navigation.menu.already_inactive";
    public const string MenuNotEmptyCode = "navigation.menu.not_empty";

    public const string ItemNotFoundCode = "navigation.item.not_found";
    public const string ItemCodeInvalidCode = "navigation.item.code_invalid";
    public const string ItemTitleInvalidCode = "navigation.item.title_invalid";
    public const string ItemRouteInvalidCode = "navigation.item.route_invalid";
    public const string ItemIconInvalidCode = "navigation.item.icon_invalid";
    public const string ItemModuleInvalidCode = "navigation.item.module_invalid";
    public const string ItemPermissionInvalidCode = "navigation.item.permission_invalid";
    public const string ItemSortOrderInvalidCode = "navigation.item.sort_order_invalid";
    public const string ItemDuplicateCodeCode = "navigation.item.duplicate_code";
    public const string ItemParentNotFoundCode = "navigation.item.parent_not_found";
    public const string ItemParentInOtherMenuCode = "navigation.item.parent_in_other_menu";
    public const string ItemDepthExceededCode = "navigation.item.depth_exceeded";
    public const string ItemCycleCode = "navigation.item.cycle";
    public const string ItemParentInactiveCode = "navigation.item.parent_inactive";
    public const string ItemHasChildrenCode = "navigation.item.has_children";
    public const string ItemAlreadyActiveCode = "navigation.item.already_active";
    public const string ItemAlreadyInactiveCode = "navigation.item.already_inactive";
    public const string ItemDescendantCode = "navigation.item.has_descendants";
    public const string ItemNotRemovableCode = "navigation.item.not_removable";

    public const string StructureTemplateInvalidCode = "navigation.structure.template_invalid";
    public const string StructurePermissionUnknownCode = "navigation.structure.permission_unknown";

    public static Error MenuNotFound(string code)
        => Error.NotFound(MenuNotFoundCode, $"Menu '{code}' was not found in the current scope.");

    public static Error MenuCodeInvalid
        => Error.Validation(MenuCodeInvalidCode, "A menu code of 1 to 64 characters is required.");

    public static Error MenuTitleInvalid
        => Error.Validation(MenuTitleInvalidCode, "A menu title of 1 to 256 characters is required.");

    public static Error MenuCodeExists(string code)
        => Error.Conflict(MenuDuplicateCodeCode, $"A menu with code '{code}' already exists in this scope.");

    public static Error MenuScopeInvalid
        => Error.Validation(
            MenuScopeInvalidCode,
            "A menu must belong to a tenant, a company or a brand, and the scope given does not describe one of them.");

    public static Error MenuInactive(string code)
        => Error.DomainRule(MenuInactiveCode, $"Menu '{code}' is inactive and cannot take new items.");

    public static Error MenuAlreadyActive(string code)
        => Error.DomainRule(MenuAlreadyActiveCode, $"Menu '{code}' is already active.");

    public static Error MenuAlreadyInactive(string code)
        => Error.DomainRule(MenuAlreadyInactiveCode, $"Menu '{code}' is already withdrawn.");

    public static Error MenuNotEmpty(string code)
        => Error.DomainRule(MenuNotEmptyCode, $"Menu '{code}' still contains items and cannot be removed.");

    public static Error ItemNotFound(string code)
        => Error.NotFound(ItemNotFoundCode, $"Menu item '{code}' was not found in the current scope.");

    public static Error ItemCodeInvalid
        => Error.Validation(ItemCodeInvalidCode, "A menu item code of 1 to 64 characters is required.");

    public static Error ItemTitleInvalid
        => Error.Validation(ItemTitleInvalidCode, "A menu item title of 1 to 256 characters is required.");

    public static Error ItemRouteInvalid(string route)
        => Error.Validation(ItemRouteInvalidCode, $"'{route}' is not a menu route: it must be empty or start with '/'.");

    public static Error ItemIconInvalid
        => Error.Validation(ItemIconInvalidCode, "A menu item icon name of at most 64 characters is required.");

    public static Error ItemModuleInvalid
        => Error.Validation(ItemModuleInvalidCode, "A menu item must name the module it opens, in 1 to 64 characters.");

    public static Error ItemPermissionInvalid
        => Error.Validation(ItemPermissionInvalidCode, "A required permission code must be empty or at most 128 characters.");

    public static Error ItemSortOrderInvalid
        => Error.Validation(ItemSortOrderInvalidCode, "A sort order must not be negative.");

    public static Error ItemCodeExists(string code, string parentCode)
        => Error.Conflict(ItemDuplicateCodeCode, $"Code '{code}' already exists under '{parentCode}'.");

    public static Error ItemParentNotFound(string parentId)
        => Error.NotFound(ItemParentNotFoundCode, $"Menu item '{parentId}' was not found in this menu.");

    public static Error ItemParentInOtherMenu
        => Error.DomainRule(
            ItemParentInOtherMenuCode,
            "A menu item can only be nested under a parent that belongs to the same menu, because a menu is one self-contained tree.");

    public static Error ItemDepthExceeded(int maximumDepth)
        => Error.DomainRule(
            ItemDepthExceededCode,
            $"A menu may not nest deeper than {maximumDepth} levels. A flat item and a grouped item are both addressable at the top level.");

    public static Error ItemCycle
        => Error.DomainRule(ItemCycleCode, "A menu item cannot be moved beneath itself or beneath one of its own descendants.");

    public static Error ItemParentInactive(string parentCode)
        => Error.DomainRule(ItemParentInactiveCode, $"Menu item '{parentCode}' is inactive and cannot take children.");

    public static Error ItemHasChildren
        => Error.DomainRule(ItemHasChildrenCode, "The menu item still has children. Move or remove them first.");

    public static Error ItemAlreadyActive(string code)
        => Error.DomainRule(ItemAlreadyActiveCode, $"Menu item '{code}' is already active.");

    public static Error ItemAlreadyInactive(string code)
        => Error.DomainRule(ItemAlreadyInactiveCode, $"Menu item '{code}' is already inactive.");

    public static Error ItemHasDescendants
        => Error.DomainRule(ItemDescendantCode, "The menu item has descendants and cannot be removed. Deactivate it instead.");

    public static Error ItemNotRemovable(string code)
        => Error.DomainRule(ItemNotRemovableCode, $"Menu item '{code}' belongs to the platform base structure and cannot be removed.");

    public static Error StructureTemplateInvalid(string code, string reason)
        => Error.Validation(StructureTemplateInvalidCode, $"Base menu section '{code}' is invalid: {reason}");

    public static Error StructurePermissionUnknown(string sectionCode, string permissionCode)
        => Error.DomainRule(
            StructurePermissionUnknownCode,
            $"Base menu section '{sectionCode}' requires permission '{permissionCode}', which is not an active catalog permission.");
}
