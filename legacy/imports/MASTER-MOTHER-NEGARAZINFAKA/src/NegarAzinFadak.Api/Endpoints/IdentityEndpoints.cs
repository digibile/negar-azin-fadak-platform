using Microsoft.AspNetCore.Mvc;
using NegarAzinFadak.Api.Authorization;
using NegarAzinFadak.Api.Errors;
using NegarAzinFadak.Application.Identity;
using NegarAzinFadak.Core.Results;

namespace NegarAzinFadak.Api.Endpoints;

/// <summary>
/// Central identity administration: the directory an operator works with, and the changes they make to it.
/// </summary>
/// <remarks>
/// <para>
/// This is the surface that makes the identity part of the platform's menu real. Until it existed the
/// <c>User</c> aggregate was persisted and signed in with, but no operator could see or administer it, so the
/// eight identity sections of the navigation led to nothing.
/// </para>
/// <para>
/// Two rules shape every handler. No request names a tenant: the scope is the session's, and an identity of
/// another organization is answered as not found rather than as forbidden, so the endpoints cannot be used
/// to discover which identities exist elsewhere. And reads require <c>identity.user.read</c> exactly as
/// writes require <c>identity.user.write</c> — reading a person's national identity number is the sensitive
/// act here, not writing one, and gating only the writes would leave the whole registry readable to anyone
/// who could be handed a lesser role.
/// </para>
/// </remarks>
internal static class IdentityEndpoints
{
    /// <summary>Maps the identity directory reads and the identity administration writes.</summary>
    internal static RouteGroupBuilder MapIdentityEndpoints(this RouteGroupBuilder group)
    {
        ArgumentNullException.ThrowIfNull(group);

        MapDirectory(group);
        MapLifecycle(group);
        MapRoles(group);

        return group;
    }

    private static void MapDirectory(RouteGroupBuilder group)
    {
        var users = group.MapGroup("/identity/users").WithTags("Identity");

        users.MapGet("/", async (
                [AsParameters] IdentitySearchRequest search,
                IdentityService identities,
                CancellationToken cancellationToken) =>
            {
                var query = search.ToQuery();
                if (query.IsFailure)
                {
                    return ErrorMapping.ToProblem(query);
                }

                var page = search.ToPageRequest();
                if (page.IsFailure)
                {
                    return ErrorMapping.ToProblem(page);
                }

                return ErrorMapping.ToResult(
                    await identities.SearchAsync(query.Value, page.Value, cancellationToken).ConfigureAwait(false),
                    found => Results.Ok(new
                    {
                        items = found.Items.Select(IdentitySummaryResponse.From).ToArray(),
                        found.PageNumber,
                        found.PageSize,
                        found.TotalCount
                    }));
            })
            .RequireAuthorization()
            .RequirePermission(Permissions.IdentityRead)
            .WithName("ListIdentities")
            .Produces(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        users.MapGet("/{userId:guid}", async (
                Guid userId,
                IdentityService identities,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToResult(
                await identities.ReadAsync(userId, cancellationToken).ConfigureAwait(false),
                identity => Results.Ok(IdentityResponse.From(identity))))
            .RequireAuthorization()
            .RequirePermission(Permissions.IdentityRead)
            .WithName("ReadIdentity")
            .Produces<IdentityResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        users.MapPost("/", async (
                RegisterIdentityRequest request,
                IdentityService identities,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToResult(
                await identities.RegisterAsync(
                    new RegisterIdentityCommand(
                        request.Mobile,
                        request.DisplayName,
                        request.Password,
                        request.PreferredLocale),
                    cancellationToken).ConfigureAwait(false),
                registered => Results.Created(
                    $"/api/v1/identity/users/{registered.Identity.Id}",
                    IdentityResponse.From(registered.Identity))))
            .RequireAuthorization()
            .RequirePermission(Permissions.IdentityWrite)
            .WithName("RegisterIdentity")
            .Produces<IdentityResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        users.MapPut("/{userId:guid}/display-name", async (
                Guid userId,
                SetDisplayNameRequest request,
                IdentityService identities,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(
                await identities
                    .SetDisplayNameAsync(userId, request.DisplayName, cancellationToken)
                    .ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.IdentityWrite)
            .WithName("SetIdentityDisplayName")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound);
    }

    private static void MapLifecycle(RouteGroupBuilder group)
    {
        // The lifecycle verbs are separate routes rather than a body field naming a transition, so the set of
        // things an operator may do to an identity is readable from the API surface instead of from a
        // switch statement, and a caller cannot name a transition the platform does not offer.
        var lifecycle = group.MapGroup("/identity/users/{userId:guid}/lifecycle").WithTags("Identity");

        lifecycle.MapPost("/activate", async (
                Guid userId,
                IdentityService identities,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(await identities.ActivateAsync(userId, cancellationToken).ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.IdentityWrite)
            .WithName("ActivateIdentity")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);

        lifecycle.MapPost("/suspend", async (
                Guid userId,
                IdentityLifecycleRequest request,
                IdentityService identities,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(
                await identities.SuspendAsync(userId, request.Reason ?? string.Empty, cancellationToken)
                    .ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.IdentityWrite)
            .WithName("SuspendIdentity")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        lifecycle.MapPost("/reactivate", async (
                Guid userId,
                IdentityService identities,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(
                await identities.ReactivateAsync(userId, cancellationToken).ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.IdentityWrite)
            .WithName("ReactivateIdentity")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);

        lifecycle.MapPost("/close", async (
                Guid userId,
                IdentityLifecycleRequest request,
                IdentityService identities,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(
                await identities.CloseAsync(userId, request.Reason, cancellationToken).ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.IdentityWrite)
            .WithName("CloseIdentity")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);
    }

    private static void MapRoles(RouteGroupBuilder group)
    {
        var roles = group.MapGroup("/identity/users/{userId:guid}/roles").WithTags("Identity");

        roles.MapPost("/", async (
                Guid userId,
                UserRoleAssignmentRequest request,
                IdentityService identities,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(
                await identities.GrantRoleAsync(userId, request.RoleCode, cancellationToken).ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.IdentityWrite)
            .WithName("GrantIdentityRole")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);

        roles.MapDelete("/{roleCode}", async (
                Guid userId,
                string roleCode,
                IdentityService identities,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(
                await identities.RevokeRoleAsync(userId, roleCode, cancellationToken).ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.IdentityWrite)
            .WithName("RevokeIdentityRole")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);
    }
}
