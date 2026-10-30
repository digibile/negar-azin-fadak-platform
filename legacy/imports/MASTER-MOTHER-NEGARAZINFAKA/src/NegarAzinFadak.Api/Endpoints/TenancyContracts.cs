using NegarAzinFadak.Api.Authorization;
using NegarAzinFadak.Api.Errors;
using NegarAzinFadak.Application.Tenancy;
using NegarAzinFadak.Core.Auditing;
using NegarAzinFadak.Core.Paging;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Organization.Domain;
using NegarAzinFadak.Organization.Domain.Configuration;
using NegarAzinFadak.Organization.Domain.Roles;

namespace NegarAzinFadak.Api.Endpoints;

/// <summary>Body of a tenant-provisioning request.</summary>
/// <param name="Code">Short unique code of the tenant.</param>
/// <param name="Name">Display name.</param>
/// <param name="LegalName">Legal name for contracts; defaults to <paramref name="Name"/>.</param>
/// <param name="CurrencyCode">ISO 4217 code of the tenant's default currency.</param>
/// <param name="EconomicCode">Economic identification code, when the tenant is a legal entity.</param>
/// <param name="NationalRegistrationNumber">National registration number, when the tenant is a legal entity.</param>
public sealed record ProvisionTenantRequest(
    string Code,
    string Name,
    string? LegalName,
    string? CurrencyCode,
    string? EconomicCode,
    string? NationalRegistrationNumber);

/// <summary>What provisioning created.</summary>
/// <param name="OrganizationId">Identifier of the new organization.</param>
/// <param name="ConfigurationId">Identifier of its configuration document.</param>
/// <param name="RoleIds">Identifiers of the roles minted from the configured templates.</param>
/// <param name="IsActive">True when the tenant was activated as part of provisioning.</param>
public sealed record ProvisionTenantResponse(
    Guid OrganizationId,
    Guid ConfigurationId,
    IReadOnlyList<Guid> RoleIds,
    bool IsActive);

/// <summary>Body of a tenant lifecycle request.</summary>
/// <param name="Reason">Why the tenant is being suspended. Required: an unexplained hold is indistinguishable from a defect.</param>
public sealed record TenantLifecycleRequest(string? Reason);

/// <summary>Body of an organizational-unit creation or rename request.</summary>
/// <param name="Code">Short unique code among the unit's siblings.</param>
/// <param name="Name">Display name.</param>
/// <param name="LegalName">Legal name for contracts; defaults to <paramref name="Name"/>.</param>
public sealed record OrganizationalUnitRequest(string Code, string Name, string? LegalName);

/// <summary>An organizational unit, as read by a client.</summary>
/// <param name="Id">Identifier of the unit.</param>
/// <param name="Code">Short unique code among the unit's siblings.</param>
/// <param name="Name">Display name.</param>
/// <param name="LegalName">Legal name used on contracts.</param>
/// <param name="Status">Lifecycle status.</param>
/// <param name="IsActive">True when the unit may take part in business operations.</param>
/// <param name="IsRetail">Whether a store serves customers; null on other levels.</param>
public sealed record OrganizationalUnitResponse(
    Guid Id,
    string Code,
    string Name,
    string LegalName,
    string Status,
    bool IsActive,
    bool? IsRetail)
{
    /// <summary>Projects a domain unit onto the wire shape.</summary>
    public static OrganizationalUnitResponse From(OrganizationalUnit unit)
    {
        ArgumentNullException.ThrowIfNull(unit);

        return new OrganizationalUnitResponse(
            unit.Id,
            unit.Code,
            unit.Name,
            unit.LegalName,
            unit.Status.ToString(),
            unit.IsActive,
            unit is Store store ? store.IsRetail : null);
    }
}

/// <summary>Body of a role definition or rename request.</summary>
/// <param name="Code">Short unique code within the tenant.</param>
/// <param name="Name">Display name.</param>
/// <param name="Description">What the role is for.</param>
public sealed record RoleRequest(string Code, string Name, string? Description);

/// <summary>A role, as read by a client.</summary>
/// <param name="Id">Identifier of the role.</param>
/// <param name="Code">Short unique code within the tenant.</param>
/// <param name="Name">Display name.</param>
/// <param name="Description">What the role is for.</param>
/// <param name="Status">Lifecycle status of the role.</param>
/// <param name="IsActive">True when the role may be assigned.</param>
/// <param name="IsBuiltIn">True when the role came from a configured template and cannot be deleted.</param>
/// <param name="Permissions">Codes the role currently grants, revoked grants excluded.</param>
public sealed record RoleResponse(
    Guid Id,
    string Code,
    string Name,
    string? Description,
    string Status,
    bool IsActive,
    bool IsBuiltIn,
    IReadOnlyList<string> Permissions)
{
    /// <summary>Projects a domain role onto the wire shape.</summary>
    public static RoleResponse From(Role role)
    {
        ArgumentNullException.ThrowIfNull(role);

        return new RoleResponse(
            role.Id,
            role.Code,
            role.Name,
            role.Description,
            role.Status.ToString(),
            role.IsActive,
            role.IsBuiltIn,
            role.EffectivePermissions().ToArray());
    }
}

/// <summary>A permission of the platform-wide catalog.</summary>
/// <param name="Code">Stable code, exactly what a role grants and a token carries.</param>
/// <param name="Category">Grouping shown in an administration screen.</param>
/// <param name="Title">Short human label.</param>
/// <param name="Description">What holding this permission allows.</param>
/// <param name="IsActive">False when the code is withdrawn and may no longer be granted.</param>
public sealed record PermissionResponse(
    string Code,
    string Category,
    string Title,
    string? Description,
    bool IsActive)
{
    /// <summary>Projects a catalog entry onto the wire shape.</summary>
    public static PermissionResponse From(Permission permission)
    {
        ArgumentNullException.ThrowIfNull(permission);

        return new PermissionResponse(
            permission.Code,
            permission.Category,
            permission.Title,
            permission.Description,
            permission.IsActive);
    }
}

/// <summary>Body of a tenant-setting request.</summary>
/// <param name="Value">The value to store, as text. Typed by <paramref name="Kind"/> on the way in.</param>
/// <param name="Kind">Declared type of the value.</param>
/// <param name="IsSensitive">Whether the value must be masked when read.</param>
/// <param name="RangeMinimum">Inclusive lower bound enforced on a numeric value.</param>
/// <param name="RangeMaximum">Inclusive upper bound enforced on a numeric value.</param>
public sealed record TenantSettingRequest(
    string? Value,
    string Kind,
    bool IsSensitive,
    decimal? RangeMinimum,
    decimal? RangeMaximum);

/// <summary>A tenant setting, as read by a client. Sensitive values arrive masked.</summary>
/// <param name="Code">Stable setting code.</param>
/// <param name="Kind">Declared type of the value.</param>
/// <param name="IsSensitive">Whether the value is masked in <paramref name="Value"/>.</param>
/// <param name="Value">The value, or a mask when the setting is sensitive.</param>
/// <param name="RangeMinimum">Inclusive lower bound enforced on a numeric setting.</param>
/// <param name="RangeMaximum">Inclusive upper bound enforced on a numeric setting.</param>
public sealed record TenantSettingResponse(
    string Code,
    string Kind,
    bool IsSensitive,
    string Value,
    decimal RangeMinimum,
    decimal RangeMaximum)
{
    /// <summary>Projects a setting read model onto the wire shape.</summary>
    public static TenantSettingResponse From(TenantSettingView view)
    {
        ArgumentNullException.ThrowIfNull(view);

        return new TenantSettingResponse(
            view.Code,
            view.Kind.ToString(),
            view.IsSensitive,
            view.DisplayValue,
            view.Range.Minimum,
            view.Range.Maximum);
    }
}

/// <summary>An audit line, as read by a client.</summary>
/// <param name="Id">Identifier of the record.</param>
/// <param name="Action">Stable action code.</param>
/// <param name="ResourceType">Type of the affected resource.</param>
/// <param name="ResourceId">Identifier of the affected resource.</param>
/// <param name="Outcome">Whether the action succeeded, was denied or failed.</param>
/// <param name="ActorUserId">Central identity that performed the action, or null for system work.</param>
/// <param name="OccurredAt">When the action happened.</param>
/// <param name="CorrelationId">Identifier joining the line to the platform's request logs.</param>
/// <param name="ReasonCode">Machine-readable reason for a denial, when there was one.</param>
public sealed record AuditRecordResponse(
    Guid Id,
    string Action,
    string ResourceType,
    string ResourceId,
    string Outcome,
    Guid? ActorUserId,
    DateTimeOffset OccurredAt,
    string CorrelationId,
    string? ReasonCode)
{
    /// <summary>Projects an audit record onto the wire shape.</summary>
    public static AuditRecordResponse From(AuditRecord record)
    {
        ArgumentNullException.ThrowIfNull(record);

        return new AuditRecordResponse(
            record.Id,
            record.Action,
            record.ResourceType,
            record.ResourceId,
            record.Outcome.ToString(),
            record.ActorUserId,
            record.OccurredAt,
            record.CorrelationId,
            record.ReasonCode);
    }
}

/// <summary>
/// Query string accepted by the list endpoints.
/// </summary>
/// <remarks>
/// Bound with <c>[AsParameters]</c> at every call site. Without it the framework would infer a request body
/// for a type it does not recognise as a service, and a GET would then fail at request time with an error
/// about bodies rather than anything to do with paging.
/// </remarks>
/// <param name="Page">One-based page number.</param>
/// <param name="PageSize">Records per page, capped by the platform.</param>
public sealed record PageQuery(int? Page, int? PageSize)
{
    /// <summary>Converts the caller's paging into a validated, bounded request.</summary>
    public PageRequest ToPageRequest() => new(Page ?? 1, PageSize ?? PageRequest.DefaultPageSize);
}

/// <summary>Query string of the audit endpoint.</summary>
/// <param name="Page">One-based page number.</param>
/// <param name="PageSize">Records per page, capped by the platform.</param>
/// <param name="Action">Restrict to one action code.</param>
/// <param name="ResourceType">Restrict to one resource type.</param>
/// <param name="ResourceId">Restrict to one resource instance.</param>
/// <param name="ActorUserId">Restrict to one actor.</param>
/// <param name="From">Inclusive lower bound of the occurrence window.</param>
/// <param name="To">Exclusive upper bound of the occurrence window.</param>
public sealed record AuditQueryRequest(
    int? Page,
    int? PageSize,
    string? Action,
    string? ResourceType,
    string? ResourceId,
    Guid? ActorUserId,
    DateTimeOffset? From,
    DateTimeOffset? To)
{
    /// <summary>Builds the audit query for the caller's own tenant.</summary>
    public AuditQuery ToAuditQuery(TenantScopeResponse scope)
    {
        ArgumentNullException.ThrowIfNull(scope);

        return new AuditQuery(
            new TenantScope(
                scope.OrganizationId,
                scope.CompanyId,
                scope.BrandId,
                scope.BranchId,
                scope.StoreId),
            ResourceType,
            ResourceId,
            Action,
            ActorUserId,
            From,
            To,
            new PageRequest(Page ?? 1, PageSize ?? PageRequest.DefaultPageSize));
    }
}
