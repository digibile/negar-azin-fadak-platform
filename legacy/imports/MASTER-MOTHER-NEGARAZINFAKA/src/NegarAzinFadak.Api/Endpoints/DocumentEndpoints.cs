using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using NegarAzinFadak.Api.Authorization;
using NegarAzinFadak.Api.Errors;
using NegarAzinFadak.Application.Documents;
using NegarAzinFadak.Application.Options;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Security;

namespace NegarAzinFadak.Api.Endpoints;

/// <summary>
/// Identity documents, the document type catalogue and a person's digital folder.
/// </summary>
/// <remarks>
/// <para>
/// Three surfaces that are one feature to an operator and three separate permission boundaries underneath.
/// Reading a document's metadata is <c>identity.document.read</c>; reading its <em>bytes</em> is the same
/// permission but a separate endpoint that re-authorizes per request, because possession of a storage key must
/// never be the thing that grants access to a scanned national identity card. Managing the catalogue is
/// <c>identity.document.write</c> as well, deliberately not a permission of its own: a document type is
/// structure, and an operator who may upload documents but not describe what they are could file a passport
/// under the national ID and get it rejected for the wrong reason.
/// </para>
/// <para>
/// Nothing here verifies a document. <c>identity.document.verify</c> exists in the catalog and this increment
/// does not spend it, so every document this surface creates stays in a state no business module may treat as
/// master data. Verification needs cross-checks and a decision record, and it will get its own surface rather
/// than being the side effect of an upload.
/// </para>
/// </remarks>
internal static class DocumentEndpoints
{
    /// <summary>Maps the document catalogue, the documents themselves and the digital folder.</summary>
    internal static RouteGroupBuilder MapDocumentEndpoints(this RouteGroupBuilder group)
    {
        ArgumentNullException.ThrowIfNull(group);

        MapTypes(group);
        MapDocuments(group);
        MapFolder(group);

        return group;
    }

    private static void MapTypes(RouteGroupBuilder group)
    {
        var types = group.MapGroup("/identity/document-types").WithTags("Identity documents");

        types.MapGet("/", async (
                [AsParameters] DocumentTypeSearchRequest search,
                DocumentTypeService catalog,
                CancellationToken cancellationToken) =>
            {
                var page = search.ToPageRequest();
                if (page.IsFailure)
                {
                    return ErrorMapping.ToProblem(page);
                }

                return ErrorMapping.ToResult(
                    await catalog.SearchAsync(search.IncludeInactive, search.Search, page.Value, cancellationToken).ConfigureAwait(false),
                    found => Results.Ok(new
                    {
                        items = found.Items.Select(DocumentTypeResponse.From).ToArray(),
                        found.PageNumber,
                        found.PageSize,
                        found.TotalCount
                    }));
            })
            .RequireAuthorization()
            .RequirePermission(Permissions.DocumentRead)
            .WithName("ListDocumentTypes")
            .Produces(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        types.MapGet("/{code}", async (
                string code,
                DocumentTypeService catalog,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToResult(
                await catalog.ReadAsync(code, cancellationToken).ConfigureAwait(false),
                found => Results.Ok(DocumentTypeResponse.From(found))))
            .RequireAuthorization()
            .RequirePermission(Permissions.DocumentRead)
            .WithName("ReadDocumentType")
            .Produces<DocumentTypeResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        types.MapPost("/", async (
                DefineDocumentTypeRequest request,
                DocumentTypeService catalog,
                CancellationToken cancellationToken) =>
            {
                var category = DocumentCategoryParser.Parse(request.Category);
                if (category.IsFailure)
                {
                    return ErrorMapping.ToProblem(category);
                }

                return ErrorMapping.ToResult(
                    await catalog.DefineAsync(
                        request.Code,
                        request.Title,
                        request.TitlePersian,
                        category.Value,
                        request.RequiresBackSide,
                        request.DefaultValidityDays,
                        request.IsIdentityDocument,
                        request.ProviderTemplate,
                        request.MaxPages,
                        cancellationToken).ConfigureAwait(false),
                    created => Results.Created(
                        $"/api/v1/identity/document-types/{created.Code}",
                        DocumentTypeResponse.From(created)));
            })
            .RequireAuthorization()
            .RequirePermission(Permissions.DocumentWrite)
            .WithName("DefineDocumentType")
            .Produces<DocumentTypeResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        types.MapPost("/{code}/activate", async (
                string code,
                DocumentTypeService catalog,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(await catalog.ActivateAsync(code, cancellationToken).ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.DocumentWrite)
            .WithName("ActivateDocumentType")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);

        types.MapPost("/{code}/deactivate", async (
                string code,
                DocumentTypeService catalog,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(await catalog.DeactivateAsync(code, cancellationToken).ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.DocumentWrite)
            .WithName("DeactivateDocumentType")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);
    }

    private static void MapDocuments(RouteGroupBuilder group)
    {
        var documents = group.MapGroup("/identity/documents").WithTags("Identity documents");

        documents.MapGet("/", async (
                [AsParameters] DocumentSearchRequest search,
                DocumentService service,
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
                    await service.ListAsync(query.Value, page.Value, cancellationToken).ConfigureAwait(false),
                    found => Results.Ok(new
                    {
                        items = found.Items.Select(DocumentResponse.From).ToArray(),
                        found.PageNumber,
                        found.PageSize,
                        found.TotalCount
                    }));
            })
            .RequireAuthorization()
            .RequirePermission(Permissions.DocumentRead)
            .WithName("ListDocuments")
            .Produces(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        documents.MapGet("/{documentId:guid}", async (
                Guid documentId,
                DocumentService service,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToResult(
                await service.ReadAsync(documentId, cancellationToken).ConfigureAwait(false),
                found => Results.Ok(DocumentDetailsResponse.From(found))))
            .RequireAuthorization()
            .RequirePermission(Permissions.DocumentRead)
            .WithName("ReadDocument")
            .Produces<DocumentDetailsResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        documents.MapPost("/", async (
                AttachDocumentRequest request,
                DocumentService service,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToResult(
                await service.AttachAsync(
                    request.UserId,
                    request.DocumentType,
                    request.ReferenceNumber,
                    request.IssuedOn,
                    request.ExpiresOn,
                    cancellationToken).ConfigureAwait(false),
                attached => Results.Created(
                    $"/api/v1/identity/documents/{attached.Id}",
                    DocumentResponse.From(attached))))
            .RequireAuthorization()
            .RequirePermission(Permissions.DocumentWrite)
            .WithName("AttachDocument")
            .Produces<DocumentResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound);

        documents.MapPost("/{documentId:guid}/pages", async (
                Guid documentId,
                HttpRequest http,
                [FromForm] AddDocumentPageForm form,
                DocumentService service,
                IOptions<DocumentOptions> documentOptions,
                CancellationToken cancellationToken) =>
            {
                // Size is checked before the bytes are copied into memory, not after: the configured ceiling
                // exists to stop a large upload reaching the process, and enforcing it once the body has been
                // buffered would defeat the only reason for having it.
                var ceiling = documentOptions.Value.MaximumSizeInBytes;
                if (form.Content is not null && form.Content.Length > ceiling)
                {
                    return ErrorMapping.ToProblem(
                        Result.Failure(Error.Validation(
                            "identity.document.page_too_large",
                            $"A captured page must not exceed {ceiling.ToString(System.Globalization.CultureInfo.InvariantCulture)} bytes.")));
                }

                if (form.Content is null || form.Content.Length is 0)
                {
                    return ErrorMapping.ToProblem(
                        Result.Failure(Error.Validation(
                            "identity.document.page_missing",
                            "A captured page must be sent as the 'content' form field.")));
                }

                var side = Enum.TryParse<NegarAzinFadak.Identity.Domain.Documents.DocumentSide>(form.Side, ignoreCase: true, out var parsedSide)
                    ? parsedSide
                    : NegarAzinFadak.Identity.Domain.Documents.DocumentSide.Front;

                await using var buffer = new MemoryStream();
                await form.Content.CopyToAsync(buffer, http.HttpContext.RequestAborted).ConfigureAwait(false);

                return ErrorMapping.ToResult(
                    await service.AddPageAsync(
                        documentId,
                        side,
                        buffer.ToArray(),
                        form.Content.ContentType ?? "application/octet-stream",
                        cancellationToken).ConfigureAwait(false),
                    page => Results.Created($"/api/v1/identity/documents/{documentId}", DocumentPageResponse.From(page)));
            })
            .RequireAuthorization()
            .RequirePermission(Permissions.DocumentWrite)
            .WithName("AddDocumentPage")
            .Produces<DocumentPageResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .DisableAntiforgery();

        documents.MapPut("/{documentId:guid}/validity", async (
                Guid documentId,
                SetDocumentValidityRequest request,
                DocumentService service,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToNoContent(
                await service.SetValidityAsync(documentId, request.IssuedOn, request.ExpiresOn, cancellationToken)
                    .ConfigureAwait(false)))
            .RequireAuthorization()
            .RequirePermission(Permissions.DocumentWrite)
            .WithName("SetDocumentValidity")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound);

        documents.MapGet("/{documentId:guid}/pages/{pageId:guid}/content", async (
                Guid documentId,
                Guid pageId,
                DocumentService service,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToResult(
                await service.CreateContentLinkAsync(documentId, pageId, cancellationToken).ConfigureAwait(false),
                grant => Results.Ok(DocumentContentResponse.From(grant))))
            .RequireAuthorization()
            .RequirePermission(Permissions.DocumentRead)
            .WithName("CreateDocumentContentLink")
            .Produces<DocumentContentResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        // The endpoint an issued link points at. Authorization is re-derived here from the database on every
        // request: the URL carries an expiry and an opaque key, and neither is a capability on its own.
        //
        // The key is matched as a catch-all because a storage key is a path of its own — a tenant segment, an
        // owner segment and a file name. Escaped into a single route segment it could not bind at all, and
        // every link the platform issues would 404. Containment is not weakened by that: the key is resolved
        // against the private root by the store, which refuses anything that lands outside it.
        documents.MapGet("/content/{**storageKey}", async (
                string storageKey,
                DocumentService service,
                CancellationToken cancellationToken) =>
            {
                var opened = await service.OpenContentAsync(storageKey, cancellationToken).ConfigureAwait(false);
                if (opened.IsFailure)
                {
                    return ErrorMapping.ToProblem(opened);
                }

                var (page, content) = opened.Value;

                // The media type comes from the stored page, not from the request or from the key: it was
                // recorded with the bytes, and re-deriving it here would let a caller label the response as
                // whatever it liked.
                return Results.File(content, page.ContentType, enableRangeProcessing: true);
            })
            .RequireAuthorization()
            .RequirePermission(Permissions.DocumentRead)
            .WithName("ReadDocumentContent")
            .Produces(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);
    }

    private static void MapFolder(RouteGroupBuilder group)
    {
        var folder = group.MapGroup("/identity/users/{userId:guid}/folder").WithTags("Identity documents");

        folder.MapGet("/", async (
                Guid userId,
                DigitalFolderService service,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToResult(
                await service.ReadAsync(userId, cancellationToken).ConfigureAwait(false),
                found => Results.Ok(DigitalFolderResponse.From(found))))
            .RequireAuthorization()
            .RequirePermission(Permissions.DocumentRead)
            .WithName("ReadDigitalFolder")
            .Produces<DigitalFolderResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        folder.MapPost("/", async (
                Guid userId,
                DigitalFolderService service,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToResult(
                await service.EnsureAsync(userId, cancellationToken).ConfigureAwait(false),
                found => Results.Ok(DigitalFolderResponse.From(found))))
            .RequireAuthorization()
            .RequirePermission(Permissions.DocumentWrite)
            .WithName("EnsureDigitalFolder")
            .Produces<DigitalFolderResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        folder.MapPost("/entries", async (
                Guid userId,
                AddFolderEntryRequest request,
                DigitalFolderService service,
                CancellationToken cancellationToken) =>
            ErrorMapping.ToResult(
                await service.AddDocumentAsync(userId, request.IdentityDocumentId, request.Title, request.Description, cancellationToken)
                    .ConfigureAwait(false),
                entry => Results.Created($"/api/v1/identity/users/{userId}/folder", FolderEntryResponse.From(entry))))
            .RequireAuthorization()
            .RequirePermission(Permissions.DocumentWrite)
            .WithName("AddFolderEntry")
            .Produces<FolderEntryResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        folder.MapPost("/entries/{entryId:guid}/review", async (
                Guid userId,
                Guid entryId,
                ReviewFolderEntryRequest request,
                ICurrentUser caller,
                DigitalFolderService service,
                CancellationToken cancellationToken) =>
            {
                // The reviewer is the authenticated principal, never the body. Taking it from the request
                // would let anyone record a decision in somebody else's name, which for a review trail is the
                // only field that matters.
                var reviewer = caller.UserId;
                if (!reviewer.HasValue)
                {
                    return ErrorMapping.ToProblem(
                        Result.Failure(Error.Unauthorized("identity.document.reviewer_unresolved", "The authenticated principal has no identity to record the review against.")));
                }

                return ErrorMapping.ToResult(
                    await service.ReviewAsync(userId, entryId, request.Approve, reviewer.Value, request.Notes, cancellationToken)
                        .ConfigureAwait(false),
                    entry => Results.Ok(FolderEntryResponse.From(entry)));
            })
            .RequireAuthorization()
            .RequirePermission(Permissions.IdentityVerify)
            .WithName("ReviewFolderEntry")
            .Produces<FolderEntryResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound);
    }
}