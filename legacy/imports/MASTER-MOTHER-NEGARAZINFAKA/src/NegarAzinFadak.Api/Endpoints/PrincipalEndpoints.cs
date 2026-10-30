using NegarAzinFadak.Api.Authorization;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;

namespace NegarAzinFadak.Api.Endpoints;

/// <summary>The authenticated principal, as the domain sees it.</summary>
/// <param name="UserId">Central identity identifier of the caller.</param>
/// <param name="Scope">Organizational coordinates the caller acts in.</param>
/// <param name="Roles">Role codes granted to the caller.</param>
/// <param name="Permissions">Permission codes granted to the caller.</param>
public sealed record CurrentPrincipalResponse(
    Guid UserId,
    TenantScopeResponse Scope,
    IReadOnlyCollection<string> Roles,
    IReadOnlyCollection<string> Permissions);

/// <summary>Organizational coordinates, with each optional level reported explicitly.</summary>
/// <param name="OrganizationId">Organization the caller acts in.</param>
/// <param name="CompanyId">Company context, or null when the caller is organization-wide.</param>
/// <param name="BrandId">Brand context, or null.</param>
/// <param name="BranchId">Branch context, or null.</param>
/// <param name="StoreId">Store context, or null.</param>
public sealed record TenantScopeResponse(
    Guid OrganizationId,
    Guid? CompanyId,
    Guid? BrandId,
    Guid? BranchId,
    Guid? StoreId)
{
    /// <summary>Projects a domain scope onto the wire shape.</summary>
    public static TenantScopeResponse From(TenantScope scope)
    {
        ArgumentNullException.ThrowIfNull(scope);

        return new TenantScopeResponse(
            scope.OrganizationId,
            scope.CompanyId,
            scope.BrandId,
            scope.BranchId,
            scope.StoreId);
    }
}

/// <summary>
/// Endpoints describing the caller's own resolved identity and scope.
/// </summary>
/// <remarks>
/// These exist because tenant isolation is only trustworthy if a client can see which tenant it is
/// operating in. An endpoint that reports the scope the server actually resolved, rather than echoing
/// what the client sent, is also the cheapest way to diagnose a scope that is too narrow or too wide.
/// </remarks>
internal static class PrincipalEndpoints
{
    /// <summary>Maps the principal endpoints onto the versioned route group.</summary>
    internal static RouteGroupBuilder MapPrincipalEndpoints(this RouteGroupBuilder group)
    {
        ArgumentNullException.ThrowIfNull(group);

        group.MapGet("/me", (ICurrentUser currentUser) => Results.Ok(new CurrentPrincipalResponse(
                currentUser.UserId!.Value,
                TenantScopeResponse.From(currentUser.Scope),
                currentUser.Roles,
                currentUser.Permissions)))
            .RequireAuthorization()
            .WithName("GetCurrentPrincipal")
            .WithTags("Principal");

        // A second endpoint exists so the permission requirement can be observed failing closed: an
        // authenticated caller without the permission is refused, rather than served by accident.
        group.MapGet("/me/permissions", (ICurrentUser currentUser) => Results.Ok(new { permissions = currentUser.Permissions }))
            .RequirePermission(Permissions.PlatformAdminister)
            .WithName("ListCurrentPrincipalPermissions")
            .WithTags("Principal");

        return group;
    }
}
