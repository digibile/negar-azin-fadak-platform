using Microsoft.AspNetCore.Mvc;
using NegarAzinFadak.Api.Authorization;
using NegarAzinFadak.Api.Errors;
using NegarAzinFadak.Application.Auditing;
using NegarAzinFadak.Application.Navigation;
using NegarAzinFadak.Application.Tenancy;
using NegarAzinFadak.Core.Persistence;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Security;

namespace NegarAzinFadak.Api.Endpoints;

/// <summary>
/// Navigation endpoints: the caller's own tree, and the administration of the menus of the level they act in.
/// </summary>
/// <remarks>
/// <para>
/// Two reads, and the difference between them is the whole point. <c>/menu/tree</c> is what a client
/// renders, filtered to the permissions the caller's token actually carries. <c>/menus</c> is what an
/// administrator works with, unfiltered, because the question they are answering is usually the one the
/// filtered tree cannot answer: which section is missing, and which one nobody can reach.
/// </para>
/// <para>
/// No request names a tenant or a level. Both follow from the caller's resolved principal, and a route
/// parameter naming a company would let a tenant administrator write a menu into a company. The single
/// exception is the level in the path — tenant, company or brand — and it is resolved against the caller's
/// own scope rather than trusted, so a caller asking for a level they do not act in gets an empty answer
/// instead of another level's menu.
/// </para>
/// </remarks>
internal static class MenuEndpoints
{
    /// <summary>Maps the navigation reads and the menu administration writes.</summary>
    internal static RouteGroupBuilder MapMenuEndpoints(this RouteGroupBuilder group)
    {
        ArgumentNullException.ThrowIfNull(group);

        MapNavigation(group);
        MapAdministration(group);

        return group;
    }

    private static void MapNavigation(RouteGroupBuilder group)
    {
        // The one endpoint every authenticated operator needs, and the only navigation read that is not
        // permission-gated: it is already filtered by the permissions the caller holds, so a section they
        // cannot open is a section they do not receive. Gating it as well would leave an operator with a
        // working token and no menu at all.
        group.MapGet("/menu/tree", async (
                MenuNavigationService navigation,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToResult(
                await navigation.ReadAsync(cancellationToken).ConfigureAwait(false),
                tree => Results.Ok(EffectiveMenuTreeResponse.From(tree))))
            .RequireAuthorization()
            .WithName("ReadEffectiveMenu")
            .Produces<EffectiveMenuTreeResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status403Forbidden);
    }

    private static void MapAdministration(RouteGroupBuilder group)
    {
        var menus = group.MapGroup("/menus").WithTags("Menus");

        menus.MapGet("/", async (
                MenuNavigationService navigation,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToResult(
                await navigation.ReadStructureAsync(cancellationToken).ConfigureAwait(false),
                trees => Results.Ok(trees.Select(MenuResponse.From).ToArray().AsReadOnly())))
            .RequireAuthorization()
            .RequirePermission(Permissions.MenuRead)
            .WithName("ListMenus")
            .Produces<IReadOnlyList<MenuResponse>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status403Forbidden);

        menus.MapPost("/", async (
                MenuRequest request,
                MenuAdministrationService administration,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToResult(
                await administration
                    .DefineAsync(request.Code, request.Title, request.EnglishTitle, cancellationToken)
                    .ConfigureAwait(false),
                menu => Results.Created($"/api/v1/menus/{menu.Id}", MenuResponse.From(MenuTreeBuilder.BuildOne(menu)))))
            .RequireAuthorization()
            .RequirePermission(Permissions.MenuWrite)
            .WithName("DefineMenu")
            .Produces<MenuResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        menus.MapPut("/{menuId:guid}", async (
                Guid menuId,
                MenuRequest request,
                MenuAdministrationService administration,
                CancellationToken cancellationToken) =>
            // The body carries a code that this operation does not take, because a menu's code is what the
            // base structure and the audit trail refer to it by. Changing it is a different operation with
            // its own rule, so a rename that quietly changed it would break both.
            ErrorMapping.ToNoContent(
                await administration
                    .RenameMenuAsync(menuId, request.Title, request.EnglishTitle, cancellationToken)
                    .ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.MenuWrite)
            .WithName("RenameMenu")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);

        menus.MapPost("/{menuId:guid}/activate", async (
                Guid menuId,
                MenuAdministrationService administration,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(await administration.ActivateMenuAsync(menuId, cancellationToken).ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.MenuWrite)
            .WithName("ActivateMenu")
            .Produces(StatusCodes.Status204NoContent);

        menus.MapPost("/{menuId:guid}/deactivate", async (
                Guid menuId,
                MenuAdministrationService administration,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(await administration.DeactivateMenuAsync(menuId, cancellationToken).ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.MenuWrite)
            .WithName("DeactivateMenu")
            .Produces(StatusCodes.Status204NoContent);

        menus.MapDelete("/{menuId:guid}", async (
                Guid menuId,
                MenuAdministrationService administration,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(await administration.RemoveMenuAsync(menuId, cancellationToken).ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.MenuWrite)
            .WithName("RemoveMenu")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);

        MapItems(menus);
        MapPublication(group);
    }

    private static void MapItems(RouteGroupBuilder menus)
    {
        menus.MapPost("/{menuId:guid}/items", async (
                Guid menuId,
                MenuItemRequest request,
                // Bound explicitly: a bare nullable parameter is inferred as a route parameter, and binding it
                // from the query only works when the attribute says so. Left inferred, a request that omits the
                // parent fails to bind and the platform answers "the request could not be completed" for a
                // perfectly valid top-level section.
                [FromQuery] Guid? parentId,
                MenuAdministrationService administration,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToResult(
                await administration
                    .AddItemAsync(
                        menuId,
                        parentId,
                        new MenuItemDraft(
                            request.Code,
                            request.Title,
                            request.EnglishTitle,
                            request.Icon,
                            request.Route,
                            request.SortOrder,
                            request.Permission,
                            request.Module),
                        cancellationToken)
                    .ConfigureAwait(false),
                item => Results.Created($"/api/v1/menus/{menuId}/items/{item.Id}", MenuItemResponse.From(item))))
            .RequireAuthorization()
            .RequirePermission(Permissions.MenuWrite)
            .WithName("AddMenuItem")
            .Produces<MenuItemResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        menus.MapPut("/{menuId:guid}/items/{itemId:guid}", async (
                Guid menuId,
                Guid itemId,
                MenuItemEditRequest request,
                MenuAdministrationService administration,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(
                await administration
                    .UpdateItemAsync(
                        menuId,
                        itemId,
                        new MenuItemEdit(
                            request.Title,
                            request.EnglishTitle,
                            request.Icon,
                            request.Route,
                            request.SortOrder,
                            request.Permission,
                            request.Module),
                        cancellationToken)
                    .ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.MenuWrite)
            .WithName("UpdateMenuItem")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);

        menus.MapPut("/{menuId:guid}/items/{itemId:guid}/code", async (
                Guid menuId,
                Guid itemId,
                MenuItemCodeRequest request,
                MenuAdministrationService administration,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(
                await administration.RecodeItemAsync(menuId, itemId, request.Code, cancellationToken).ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.MenuWrite)
            .WithName("RecodeMenuItem")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status409Conflict);

        menus.MapPut("/{menuId:guid}/items/{itemId:guid}/move", async (
                Guid menuId,
                Guid itemId,
                MenuItemMoveRequest request,
                MenuAdministrationService administration,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(
                await administration.MoveItemAsync(menuId, itemId, request.ParentId, cancellationToken).ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.MenuWrite)
            .WithName("MoveMenuItem")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        menus.MapPost("/{menuId:guid}/items/{itemId:guid}/activate", async (
                Guid menuId,
                Guid itemId,
                MenuAdministrationService administration,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(await administration.ActivateItemAsync(menuId, itemId, cancellationToken).ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.MenuWrite)
            .WithName("ActivateMenuItem")
            .Produces(StatusCodes.Status204NoContent);

        menus.MapPost("/{menuId:guid}/items/{itemId:guid}/deactivate", async (
                Guid menuId,
                Guid itemId,
                MenuAdministrationService administration,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(await administration.DeactivateItemAsync(menuId, itemId, cancellationToken).ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.MenuWrite)
            .WithName("DeactivateMenuItem")
            .Produces(StatusCodes.Status204NoContent);

        menus.MapDelete("/{menuId:guid}/items/{itemId:guid}", async (
                Guid menuId,
                Guid itemId,
                MenuAdministrationService administration,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(await administration.RemoveItemAsync(menuId, itemId, cancellationToken).ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.MenuWrite)
            .WithName("RemoveMenuItem")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);
    }

    private static void MapPublication(RouteGroupBuilder group)
    {
        // Kept separate from the administration writes, and given its own permission, because it is the one
        // menu operation that is not an edit of the caller's structure: it brings the menu in line with what
        // the deployment declares, which can add sections to every tenant that runs this version.
        group.MapPost("/menu/publish", async (
                MenuStructureService structure,
                IUnitOfWork unitOfWork,
                AuditTrailWriter audit,
                ICurrentUser currentUser,
                CancellationToken cancellationToken) =>
            {
                var scope = currentUser.Scope;
                var published = await structure.InstallAsync(scope, cancellationToken).ConfigureAwait(false);
                if (published.IsFailure)
                {
                    return ErrorMapping.ToProblem(published);
                }

                var installation = published.Value;

                // The installer stages the structure and leaves the unit of work to its caller, so that
                // provisioning can commit the tenant and its navigation together. Here there is no such
                // transaction around it: without this commit the endpoint would answer "published" for a
                // structure it never wrote, and every section it reported would vanish with the request.
                await audit.RecordSuccessAsync(
                        TenantAuditActions.MenuStructureInstall,
                        ResourceTypes.Menu,
                        installation.MenuId?.ToString() ?? string.Empty,
                        new Dictionary<string, string?>(StringComparer.Ordinal)
                        {
                            ["added"] = installation.SectionsAdded.ToString(System.Globalization.CultureInfo.InvariantCulture),
                            ["kept"] = installation.SectionsKept.ToString(System.Globalization.CultureInfo.InvariantCulture),
                            ["skipped"] = installation.SectionsSkipped.ToString(System.Globalization.CultureInfo.InvariantCulture)
                        },
                        cancellationToken)
                    .ConfigureAwait(false);
                await unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

                return Results.Ok(MenuPublicationResponse.From(installation));
            })
            .RequireAuthorization()
            .RequirePermission(Permissions.MenuPublish)
            .WithName("PublishBaseMenu")
            .Produces<MenuPublicationResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status403Forbidden);
    }
}
