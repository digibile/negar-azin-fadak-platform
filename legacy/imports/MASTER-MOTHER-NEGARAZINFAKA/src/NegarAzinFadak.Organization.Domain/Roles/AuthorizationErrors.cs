using NegarAzinFadak.Core.Results;

namespace NegarAzinFadak.Organization.Domain.Roles;

/// <summary>Stable error codes of the roles and permissions module.</summary>
public static class AuthorizationErrors
{
    public const string RoleNotFoundCode = "authorization.role.not_found";
    public const string DuplicateRoleCode = "authorization.role.duplicate_code";
    public const string RoleCodeImmutableCode = "authorization.role.code_immutable";
    public const string RoleAlreadyRetiredCode = "authorization.role.already_retired";
    public const string RoleRetiredCode = "authorization.role.retired";
    public const string RoleNotAssignableCode = "authorization.role.not_assignable";
    public const string BuiltInRoleProtectedCode = "authorization.role.built_in_protected";
    public const string PermissionNotFoundCode = "authorization.permission.not_found";
    public const string PermissionInactiveCode = "authorization.permission.inactive";
    public const string PermissionAlreadyGrantedCode = "authorization.role.permission_already_granted";
    public const string PermissionNotGrantedCode = "authorization.role.permission_not_granted";
    public const string PermissionCodeInvalidCode = "authorization.permission.code_invalid";
    public const string RoleOutsideTenantCode = "authorization.role.outside_tenant";

    public static Error RoleNotFound(string code)
        => Error.NotFound(RoleNotFoundCode, $"Role '{code}' was not found in the current scope.");

    public static Error DuplicateRole(string code)
        => Error.Conflict(DuplicateRoleCode, $"Role '{code}' already exists in this scope.");

    public static Error RoleCodeImmutable(string code)
        => Error.DomainRule(RoleCodeImmutableCode, $"The code of role '{code}' cannot be changed because tokens reference it.");

    public static Error AlreadyRetired(string code)
        => Error.DomainRule(RoleAlreadyRetiredCode, $"Role '{code}' is already retired.");

    public static Error Retired(string code)
        => Error.DomainRule(RoleRetiredCode, $"Role '{code}' is retired and can no longer be assigned.");

    public static Error NotAssignable
        => Error.DomainRule(RoleNotAssignableCode, "The role is retired and can no longer be assigned.");

    public static Error BuiltInRoleProtected(string code)
        => Error.Forbidden(BuiltInRoleProtectedCode, $"Role '{code}' is built in and cannot be removed.");

    public static Error PermissionNotFound(string code)
        => Error.NotFound(PermissionNotFoundCode, $"Permission '{code}' is not in the catalog.");

    public static Error PermissionInactive(string code)
        => Error.DomainRule(PermissionInactiveCode, $"Permission '{code}' is no longer active and cannot be granted.");

    public static Error PermissionAlreadyGranted(string code)
        => Error.Conflict(PermissionAlreadyGrantedCode, $"Permission '{code}' is already granted to this role.");

    public static Error PermissionNotGranted(string code)
        => Error.DomainRule(PermissionNotGrantedCode, $"Permission '{code}' is not granted to this role.");

    public static Error PermissionCodeInvalid
        => Error.Validation(PermissionCodeInvalidCode, "The permission code is not valid.");

    public static Error RoleOutsideTenant
        => Error.Forbidden(RoleOutsideTenantCode, "The role belongs to another tenant.");
}
