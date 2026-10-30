using NegarAzinFadak.Api.Authorization;
using NegarAzinFadak.Api.Errors;
using NegarAzinFadak.Application.Tenancy;
using NegarAzinFadak.Core.Auditing;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Organization.Domain.Configuration;

namespace NegarAzinFadak.Api.Endpoints;

/// <summary>
/// Tenant and organization administration endpoints.
/// </summary>
/// <remarks>
/// <para>
/// Every endpoint takes the tenant from the caller's resolved principal and never from the request body.
/// A body that could name an organization would make tenant isolation a property of client behaviour, and
/// the one client bug that omits the check would read another tenant's data.
/// </para>
/// <para>
/// The endpoints are thin on purpose: they bind, they call one use case, and they map the result. Any
/// decision here — what may be suspended, who may grant what — belongs to the use case or the aggregate,
/// where it is covered by a test that does not need an HTTP server.
/// </para>
/// </remarks>
internal static class TenancyEndpoints
{
    /// <summary>Maps tenant provisioning, lifecycle, hierarchy, roles, catalog, configuration and audit.</summary>
    internal static RouteGroupBuilder MapTenancyEndpoints(this RouteGroupBuilder group)
    {
        ArgumentNullException.ThrowIfNull(group);

        MapProvisioning(group);
        MapLifecycle(group);
        MapHierarchy(group);
        MapRoles(group);
        MapCatalog(group);
        MapConfiguration(group);
        MapAudit(group);

        return group;
    }

    private static void MapProvisioning(RouteGroupBuilder group)
    {
        var tenants = group.MapGroup("/tenants").WithTags("Tenants");

        // The result is mapped rather than returned: a bare Result is a struct whose members include
        // properties that only mean something on a failure, and handing one to the serializer walks them
        // all. Provisioning answered 500 on both outcomes, so the endpoint that creates a tenant was the one
        // endpoint that could never be exercised over HTTP.
        tenants.MapPost("/", async (ProvisionTenantRequest request, TenantProvisioningService provisioning) =>
                ErrorMapping.ToResult(
                    await provisioning.ProvisionAsync(
                            new ProvisionTenantCommand(
                                request.Code,
                                request.Name,
                                request.LegalName,
                                request.CurrencyCode ?? string.Empty,
                                request.EconomicCode,
                                request.NationalRegistrationNumber))
                        .ConfigureAwait(false),
                    provisioned => Results.Created(
                        $"/api/v1/tenants/{provisioned.Scope.OrganizationId}",
                        new ProvisionTenantResponse(
                            provisioned.Scope.OrganizationId,
                            provisioned.ConfigurationId,
                            provisioned.RoleIds,
                            provisioned.IsActive))))
            .RequireAuthorization()
            .RequirePermission(Permissions.PlatformAdminister)
            .WithName("ProvisionTenant")
            .Produces<ProvisionTenantResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        // Activation, suspension and closure act on the caller's own tenant, so there is no identifier in
        // the route: which tenant is being suspended is a property of the session, not a parameter.
        tenants.MapPost("/lifecycle/activate", async (TenantLifecycleService lifecycle) =>
                ErrorMapping.ToNoContent(await lifecycle.ActivateAsync().ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.PlatformAdminister)
            .WithName("ActivateTenant")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        tenants.MapPost("/lifecycle/suspend", async (TenantLifecycleRequest request, TenantLifecycleService lifecycle) =>
                ErrorMapping.ToNoContent(await lifecycle.SuspendAsync(request.Reason ?? string.Empty).ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.PlatformAdminister)
            .WithName("SuspendTenant")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        tenants.MapPost("/lifecycle/close", async (TenantLifecycleRequest request, TenantLifecycleService lifecycle) =>
                ErrorMapping.ToNoContent(await lifecycle.CloseAsync(request.Reason).ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.PlatformAdminister)
            .WithName("CloseTenant")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);
    }

    private static void MapLifecycle(RouteGroupBuilder group)
    {
        var lifecycle = group.MapGroup("/tenants/lifecycle").WithTags("Tenants");

        lifecycle.MapPost("/{level}/{unitId:guid}/activate", async (
                string level,
                Guid unitId,
                TenantLifecycleService tenants,
                CancellationToken cancellationToken) =>
            {
                var parsed = ParseLevel(level);
                return parsed.IsFailure
                    ? ErrorMapping.ToProblem(parsed)
                    : ErrorMapping.ToNoContent(
                        await tenants.ActivateUnitAsync(parsed.Value, unitId, cancellationToken).ConfigureAwait(false));
            })
            .RequireAuthorization()
            .RequirePermission(Permissions.OrganizationWrite)
            .WithName("ActivateOrganizationalUnit")
            .Produces(StatusCodes.Status204NoContent);

        lifecycle.MapPost("/{level}/{unitId:guid}/suspend", async (
                string level,
                Guid unitId,
                TenantLifecycleRequest request,
                TenantLifecycleService tenants,
                CancellationToken cancellationToken) =>
            {
                var parsed = ParseLevel(level);
                return parsed.IsFailure
                    ? ErrorMapping.ToProblem(parsed)
                    : ErrorMapping.ToNoContent(
                        await tenants.SuspendUnitAsync(
                            parsed.Value,
                            unitId,
                            request.Reason ?? string.Empty,
                            cancellationToken).ConfigureAwait(false));
            })
            .RequireAuthorization()
            .RequirePermission(Permissions.OrganizationWrite)
            .WithName("SuspendOrganizationalUnit")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest);
    }

    private static void MapHierarchy(RouteGroupBuilder group)
    {
        var units = group.MapGroup("/organization/units").WithTags("Organization");

        units.MapGet("/{level}", async (
                string level,
                [AsParameters] PageQuery paging,
                IOrganizationDirectory directory,
                ICurrentUser currentUser,
                CancellationToken cancellationToken) =>
            {
                var parsed = ParseLevel(level);
                if (parsed.IsFailure)
                {
                    return ErrorMapping.ToProblem(parsed);
                }

                var page = await directory
                    .ListAsync(currentUser.Scope, parsed.Value, paging.ToPageRequest(), cancellationToken)
                    .ConfigureAwait(false);

                return Results.Ok(new
                {
                    items = page.Items.Select(OrganizationalUnitResponse.From).ToArray(),
                    page.PageNumber,
                    page.PageSize,
                    page.TotalCount
                });
            })
            .RequireAuthorization()
            .RequirePermission(Permissions.OrganizationRead)
            .WithName("ListOrganizationalUnits");

        units.MapPost("/{level}", async (
                string level,
                OrganizationalUnitRequest request,
                TenantLifecycleService tenants,
                CancellationToken cancellationToken) =>
            {
                var parsed = ParseLevel(level);
                return parsed.IsFailure
                    ? ErrorMapping.ToProblem(parsed)
                    : ErrorMapping.ToResult(
                        await tenants
                            .CreateUnitAsync(parsed.Value, request.Code, request.Name, request.LegalName, cancellationToken)
                            .ConfigureAwait(false),
                        // 201 with the created unit: a client that just created a company needs its
                        // identifier to address it, and making it re-query for that is a round trip for
                        // information the server already had.
                        unit => Results.Created(
                            $"/api/v1/organization/units/{level.ToLowerInvariant()}/{unit.Id}",
                            OrganizationalUnitResponse.From(unit)));
            })
            .RequireAuthorization()
            .RequirePermission(Permissions.OrganizationWrite)
            .WithName("CreateOrganizationalUnit")
            .Produces<OrganizationalUnitResponse>(StatusCodes.Status201Created);

        units.MapPut("/{level}/{unitId:guid}", async (
                string level,
                Guid unitId,
                OrganizationalUnitRequest request,
                TenantLifecycleService tenants,
                CancellationToken cancellationToken) =>
            {
                var parsed = ParseLevel(level);
                return parsed.IsFailure
                    ? ErrorMapping.ToProblem(parsed)
                    : ErrorMapping.ToNoContent(
                        await tenants
                            .RenameUnitAsync(parsed.Value, unitId, request.Name, request.LegalName, cancellationToken)
                            .ConfigureAwait(false));
            })
            .RequireAuthorization()
            .RequirePermission(Permissions.OrganizationWrite)
            .WithName("RenameOrganizationalUnit")
            .Produces(StatusCodes.Status204NoContent);
    }

    private static void MapRoles(RouteGroupBuilder group)
    {
        var roles = group.MapGroup("/roles").WithTags("Roles");

        roles.MapGet("/", async (
                [AsParameters] PageQuery paging,
                IRoleDirectory directory,
                ICurrentUser currentUser,
                CancellationToken cancellationToken) =>
            {
                var page = await directory
                    .ListAsync(currentUser.Scope, paging.ToPageRequest(), cancellationToken)
                    .ConfigureAwait(false);

                return Results.Ok(new
                {
                    items = page.Items.Select(RoleResponse.From).ToArray(),
                    page.PageNumber,
                    page.PageSize,
                    page.TotalCount
                });
            })
            .RequireAuthorization()
            .RequirePermission(Permissions.RoleRead)
            .WithName("ListRoles");

        roles.MapPost("/", async (
                RoleRequest request,
                RoleAdministrationService administration,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToResult(
                await administration.DefineAsync(request.Code, request.Name, request.Description, cancellationToken)
                    .ConfigureAwait(false),
                role => Results.Created($"/api/v1/roles/{role.Id}", RoleResponse.From(role))))
            .RequireAuthorization()
            .RequirePermission(Permissions.RoleWrite)
            .WithName("DefineRole")
            .Produces<RoleResponse>(StatusCodes.Status201Created);

        roles.MapPut("/{roleId:guid}", async (
                Guid roleId,
                RoleRequest request,
                RoleAdministrationService administration,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(
                await administration.RenameAsync(roleId, request.Name, request.Description, cancellationToken)
                    .ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.RoleWrite)
            .WithName("RenameRole")
            .Produces(StatusCodes.Status204NoContent);

        roles.MapPost("/{roleId:guid}/permissions", async (
                Guid roleId,
                PermissionGrantRequest request,
                RoleAdministrationService administration,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(
                await administration.GrantPermissionAsync(roleId, request.PermissionCode, cancellationToken)
                    .ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.RoleWrite)
            .WithName("GrantRolePermission")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);

        roles.MapDelete("/{roleId:guid}/permissions/{permissionCode}", async (
                Guid roleId,
                string permissionCode,
                RoleAdministrationService administration,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(
                await administration.RevokePermissionAsync(roleId, permissionCode, cancellationToken)
                    .ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.RoleWrite)
            .WithName("RevokeRolePermission")
            .Produces(StatusCodes.Status204NoContent);

        roles.MapPost("/{roleId:guid}/retire", async (
                Guid roleId,
                RoleAdministrationService administration,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(await administration.RetireAsync(roleId, cancellationToken).ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.RoleWrite)
            .WithName("RetireRole")
            .Produces(StatusCodes.Status204NoContent);

        roles.MapPost("/{roleId:guid}/activate", async (
                Guid roleId,
                RoleAdministrationService administration,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(await administration.ActivateAsync(roleId, cancellationToken).ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.RoleWrite)
            .WithName("ActivateRole")
            .Produces(StatusCodes.Status204NoContent);
    }

    private static void MapCatalog(RouteGroupBuilder group)
    {
        var catalog = group.MapGroup("/permissions").WithTags("Permissions");

        catalog.MapGet("/", async ([AsParameters] PageQuery paging, IPermissionCatalog permissions, CancellationToken cancellationToken) =>
            {
                var page = await permissions.ListAsync(paging.ToPageRequest(), cancellationToken).ConfigureAwait(false);

                return Results.Ok(new
                {
                    items = page.Items.Select(PermissionResponse.From).ToArray(),
                    page.PageNumber,
                    page.PageSize,
                    page.TotalCount
                });
            })
            .RequireAuthorization()
            .RequirePermission(Permissions.PermissionCatalogRead)
            .WithName("ListPermissions");

        catalog.MapPost("/publish", async (PermissionCatalogService catalog, CancellationToken cancellationToken) =>
            {
                var published = await catalog.PublishAsync(cancellationToken).ConfigureAwait(false);
                return published.IsSuccess
                    ? Results.Ok(new { published.Value.Added, published.Value.Total })
                    : ErrorMapping.ToProblem(Result.Failure(published.Errors));
            })
            .RequireAuthorization()
            .RequirePermission(Permissions.PermissionCatalogPublish)
            .WithName("PublishPermissionCatalog")
            .Produces(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest);
    }

    private static void MapConfiguration(RouteGroupBuilder group)
    {
        var configuration = group.MapGroup("/tenant/configuration").WithTags("Tenant configuration");

        configuration.MapGet("/", async (TenantConfigurationService tenants, CancellationToken cancellationToken) =>
            {
                var described = await tenants.DescribeAsync(cancellationToken).ConfigureAwait(false);
                return described.IsSuccess
                    ? Results.Ok(described.Value.Select(TenantSettingResponse.From).ToArray())
                    : ErrorMapping.ToProblem(Result.Failure(described.Errors));
            })
            .RequireAuthorization()
            .RequirePermission(Permissions.TenantConfigurationRead)
            .WithName("DescribeTenantConfiguration");

        configuration.MapPut("/settings/{code}", async (
                string code,
                TenantSettingRequest request,
                TenantConfigurationService tenants,
                CancellationToken cancellationToken) =>
            {
                var kind = ParseKind(request.Kind);
                if (kind.IsFailure)
                {
                    return ErrorMapping.ToProblem(kind);
                }

                var range = request.RangeMinimum is { } minimum && request.RangeMaximum is { } maximum
                    ? new NumericRange(minimum, maximum)
                    : NumericRange.Unbounded;

                return ErrorMapping.ToNoContent(
                    await tenants
                        .SetAsync(code, request.Value, kind.Value, request.IsSensitive, range, cancellationToken)
                        .ConfigureAwait(false));
            })
            .RequireAuthorization()
            .RequirePermission(Permissions.TenantConfigurationWrite)
            .WithName("SetTenantSetting")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        configuration.MapDelete("/settings/{code}", async (
                string code,
                TenantConfigurationService tenants,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(await tenants.RemoveAsync(code, cancellationToken).ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.TenantConfigurationWrite)
            .WithName("RemoveTenantSetting")
            .Produces(StatusCodes.Status204NoContent);
    }

    private static void MapAudit(RouteGroupBuilder group)
    {
        group.MapGet("/audit", async (
                [AsParameters] AuditQueryRequest query,
                IAuditTrail trail,
                ICurrentUser currentUser,
                CancellationToken cancellationToken) =>
            {
                if (currentUser.Scope.IsEmpty)
                {
                    return ErrorMapping.ToProblem(Result.Failure(TenantProvisioningErrors.OutsideTenant));
                }

                // The scope comes from the principal, not from the query string: an audit request may narrow
                // the trail to a resource, an action or a window, but never to another tenant.
                var page = await trail
                    .QueryAsync(query.ToAuditQuery(TenantScopeResponse.From(currentUser.Scope)), cancellationToken)
                    .ConfigureAwait(false);

                return Results.Ok(new
                {
                    items = page.Items.Select(AuditRecordResponse.From).ToArray(),
                    page.PageNumber,
                    page.PageSize,
                    page.TotalCount
                });
            })
            .RequireAuthorization()
            .RequirePermission(Permissions.AuditRead)
            .WithName("QueryAuditTrail")
            .Produces(StatusCodes.Status200OK);
    }

    private static Result<OrganizationalUnitLevel> ParseLevel(string level) =>
        Enum.TryParse<OrganizationalUnitLevel>(level, ignoreCase: true, out var parsed) && parsed != OrganizationalUnitLevel.Organization
            ? Result<OrganizationalUnitLevel>.Success(parsed)
            : Result<OrganizationalUnitLevel>.Failure(Error.Validation(
                "organization.unit.level_invalid",
                $"'{level}' is not an addressable organizational level. Use company, brand, branch or store."));

    private static Result<TenantSettingKind> ParseKind(string kind) =>
        Enum.TryParse<TenantSettingKind>(kind, ignoreCase: true, out var parsed)
            ? Result<TenantSettingKind>.Success(parsed)
            : Result<TenantSettingKind>.Failure(Error.Validation(
                "tenant.configuration.setting_kind_invalid",
                $"'{kind}' is not a supported setting kind."));
}

/// <summary>Body of a role permission grant.</summary>
/// <param name="PermissionCode">Code of the catalog permission to grant.</param>
public sealed record PermissionGrantRequest(string PermissionCode);
