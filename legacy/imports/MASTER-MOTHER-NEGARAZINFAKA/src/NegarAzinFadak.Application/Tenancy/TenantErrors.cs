using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Organization.Domain.Roles;

namespace NegarAzinFadak.Application.Tenancy;

/// <summary>Stable error codes of the tenant and authorization administration use cases.</summary>
public static class TenantProvisioningErrors
{
    public const string CodeInvalidCode = "tenant.provision.code_invalid";
    public const string NameInvalidCode = "tenant.provision.name_invalid";
    public const string CurrencyInvalidCode = "tenant.provision.currency_invalid";
    public const string RoleTemplatePermissionUnknownCode = "tenant.provision.role_permission_unknown";
    public const string ConfigurationTemplateInvalidCode = "tenant.provision.configuration_template_invalid";
    public const string NotFoundCode = "tenant.provision.not_found";
    public const string OutsideTenantCode = "tenant.provision.outside_tenant";
    public const string NotOperableCode = "tenant.provision.not_operable";
    public const string CodeExistsCode = "tenant.provision.code_exists";

    public static Error CodeInvalid
        => Error.Validation(CodeInvalidCode, "A tenant code of 1 to 64 characters is required.");

    public static Error NameInvalid
        => Error.Validation(NameInvalidCode, "A tenant name of 1 to 256 characters is required.");

    public static Error CurrencyInvalid(string currency)
        => Error.Validation(CurrencyInvalidCode, $"'{currency}' is not a valid ISO 4217 currency code.");

    public static Error RoleTemplatePermissionUnknown(string roleCode, string permissionCode)
        => Error.DomainRule(
            RoleTemplatePermissionUnknownCode,
            $"Role template '{roleCode}' references permission '{permissionCode}', which is not an active catalog permission.");

    public static Error ConfigurationTemplateInvalid(string settingCode, string reason)
        => Error.Validation(ConfigurationTemplateInvalidCode, $"Starter setting '{settingCode}' is invalid: {reason}");

    public static Error NotFound(string code)
        => Error.NotFound(NotFoundCode, $"Tenant '{code}' was not found.");

    public static Error OutsideTenant
        => Error.Forbidden(OutsideTenantCode, "The unit belongs to another tenant.");

    public static Error NotOperable(string code)
        => Error.DomainRule(NotOperableCode, $"Tenant '{code}' must be active to perform this operation.");

    public static Error CodeExists(string code)
        => Error.Conflict(CodeExistsCode, $"Code '{code}' already exists under the same parent.");
}

/// <summary>
/// Audit action codes of the tenant and authorization modules.
/// </summary>
/// <remarks>
/// Written down once, because an audit trail whose action names are improvised per call site cannot be
/// filtered afterwards — and a trail nobody can query is not an audit trail.
/// </remarks>
public static class TenantAuditActions
{
    public const string Provision = "tenant.organization.provision";
    public const string Activate = "tenant.organization.activate";
    public const string Suspend = "tenant.organization.suspend";
    public const string Close = "tenant.organization.close";
    public const string UnitCreate = "tenant.unit.create";
    public const string UnitRename = "tenant.unit.rename";
    public const string UnitSetDescription = "tenant.unit.set_description";
    public const string RoleDefine = "tenant.role.define";
    public const string RoleRename = "tenant.role.rename";
    public const string RoleGrantPermission = "tenant.role.permission_grant";
    public const string RoleRevokePermission = "tenant.role.permission_revoke";
    public const string RoleRetire = "tenant.role.retire";
    public const string RoleActivate = "tenant.role.activate";
    public const string SettingSet = "tenant.setting.set";
    public const string SettingRemove = "tenant.setting.remove";
    public const string CatalogPublish = "tenant.permission_catalog.publish";
    public const string MenuDefine = "navigation.menu.define";
    public const string MenuRename = "navigation.menu.rename";
    public const string MenuActivate = "navigation.menu.activate";
    public const string MenuDeactivate = "navigation.menu.deactivate";
    public const string MenuRemove = "navigation.menu.remove";
    public const string MenuItemAdd = "navigation.menu.item_add";
    public const string MenuItemUpdate = "navigation.menu.item_update";
    public const string MenuItemRecode = "navigation.menu.item_recode";
    public const string MenuItemMove = "navigation.menu.item_move";
    public const string MenuItemActivate = "navigation.menu.item_activate";
    public const string MenuItemDeactivate = "navigation.menu.item_deactivate";
    public const string MenuItemRemove = "navigation.menu.item_remove";
    public const string MenuStructureInstall = "navigation.menu.structure_install";
}

/// <summary>
/// Audit resource types. Kept as codes rather than type names so a renamed class does not orphan the
/// records that refer to it.
/// </summary>
public static class ResourceTypes
{
    public const string Organization = "organization";
    public const string OrganizationalUnit = "organizational_unit";
    public const string Role = "role";
    public const string Permission = "permission";
    public const string TenantConfiguration = "tenant_configuration";
    public const string TenantSetting = "tenant_setting";
    public const string Menu = "navigation_menu";
    public const string MenuItem = "navigation_menu_item";
    public const string IdentityUser = "identity_user";
    public const string DocumentType = "identity_document_type";
    public const string IdentityDocument = "identity_document";
    public const string DigitalFolder = "identity_digital_folder";
}
