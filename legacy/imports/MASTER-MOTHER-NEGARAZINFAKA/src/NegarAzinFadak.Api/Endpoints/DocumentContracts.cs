using NegarAzinFadak.Application.Documents;
using NegarAzinFadak.Core.Paging;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Identity.Domain;
using NegarAzinFadak.Identity.Domain.Documents;

namespace NegarAzinFadak.Api.Endpoints;

/// <summary>Query string of the identity document list.</summary>
/// <param name="Status">Restrict to one verification state, by name.</param>
/// <param name="DocumentType">Restrict to one configured document type, by code.</param>
/// <param name="UserId">Restrict to the documents of one central identity.</param>
/// <param name="CurrentlyValid">Restrict to documents that are verified and not past their expiry date.</param>
/// <param name="Page">One-based page number.</param>
/// <param name="PageSize">Page size.</param>
public sealed record DocumentSearchRequest(
    string? Status = null,
    string? DocumentType = null,
    Guid? UserId = null,
    bool? CurrentlyValid = null,
    int? Page = null,
    int? PageSize = null)
{
    /// <summary>Converts the caller's filters into a validated query.</summary>
    public Result<DocumentQuery> ToQuery()
    {
        DocumentStatus? status = null;
        if (!string.IsNullOrWhiteSpace(Status))
        {
            if (!Enum.TryParse<DocumentStatus>(Status, ignoreCase: true, out var parsed))
            {
                return Result<DocumentQuery>.Failure(IdentityErrors.StatusInvalid(Status));
            }

            status = parsed;
        }

        // Normalized here so an unusable code is rejected as a bad request rather than reaching the store,
        // where it would match nothing and be reported as an empty list — indistinguishable from "this tenant
        // has no documents of a type that does exist".
        string? documentTypeCode = null;
        if (!string.IsNullOrWhiteSpace(DocumentType))
        {
            var code = DocumentTypeRules.NormalizeCode(DocumentType);
            if (code.IsFailure)
            {
                return Result<DocumentQuery>.Failure(code.FirstError);
            }

            documentTypeCode = code.Value;
        }

        return Result<DocumentQuery>.Success(new DocumentQuery(status, documentTypeCode, UserId, CurrentlyValid));
    }

    /// <summary>Converts the caller's paging into a validated, bounded request.</summary>
    public Result<PageRequest> ToPageRequest()
    {
        try
        {
            return Result<PageRequest>.Success(new PageRequest(Page ?? 1, PageSize ?? PageRequest.DefaultPageSize));
        }
        catch (ArgumentOutOfRangeException)
        {
            return Result<PageRequest>.Failure(Error.Validation(
                "identity.document.paging_invalid",
                $"Page must be 1 or greater and pageSize between 1 and {PageRequest.MaxPageSize}."));
        }
    }
}

/// <summary>Body of an attach-document request.</summary>
/// <param name="UserId">The central identity the document belongs to.</param>
/// <param name="DocumentType">Code of the configured document type.</param>
/// <param name="ReferenceNumber">The document number as printed on it, when it has one.</param>
/// <param name="IssuedOn">Issue date printed on the document.</param>
/// <param name="ExpiresOn">Expiry date printed on the document; the type's default applies when omitted.</param>
public sealed record AttachDocumentRequest(
    Guid UserId,
    string DocumentType,
    string? ReferenceNumber = null,
    DateOnly? IssuedOn = null,
    DateOnly? ExpiresOn = null);

/// <summary>Body of a set-validity request.</summary>
/// <param name="IssuedOn">Issue date printed on the document.</param>
/// <param name="ExpiresOn">Expiry date printed on the document; the type's default applies when omitted.</param>
public sealed record SetDocumentValidityRequest(DateOnly? IssuedOn, DateOnly? ExpiresOn);

/// <summary>Body of a define-document-type request.</summary>
/// <param name="Code">Stable code; uppercased by the platform.</param>
/// <param name="Title">English title.</param>
/// <param name="TitlePersian">Persian title, which the Persian-first client renders.</param>
/// <param name="Category">Folder category, by name.</param>
/// <param name="RequiresBackSide">Whether both sides must be captured.</param>
/// <param name="DefaultValidityDays">Validity granted on issue, or null for a document that never expires.</param>
/// <param name="IsIdentityDocument">Whether this type may back an identity verification.</param>
/// <param name="ProviderTemplate">OCR template hint, or null.</param>
/// <param name="MaxPages">How many pages a document of this type may hold.</param>
public sealed record DefineDocumentTypeRequest(
    string Code,
    string Title,
    string TitlePersian,
    string Category,
    bool RequiresBackSide = false,
    int? DefaultValidityDays = null,
    bool IsIdentityDocument = false,
    string? ProviderTemplate = null,
    int MaxPages = 1);

/// <summary>Body of a folder-entry request.</summary>
/// <param name="IdentityDocumentId">The central identity document to expose in the dossier.</param>
/// <param name="Title">Title shown in the dossier; the document type's Persian title applies when omitted.</param>
/// <param name="Description">Free-text note.</param>
public sealed record AddFolderEntryRequest(Guid IdentityDocumentId, string? Title = null, string? Description = null);

/// <summary>Body of a folder-entry review request.</summary>
/// <param name="Approve">True to accept the entry into the dossier, false to refuse it.</param>
/// <param name="Notes">Why. Required when refusing.</param>
public sealed record ReviewFolderEntryRequest(bool Approve, string? Notes = null);

/// <summary>One document as a client reads it.</summary>
/// <param name="Id">Identifier of the document.</param>
/// <param name="UserId">The central identity the document belongs to.</param>
/// <param name="DocumentTypeCode">Code of the configured document type.</param>
/// <param name="DocumentTypeTitlePersian">Persian title of the document type.</param>
/// <param name="ReferenceNumber">The document number as printed on it.</param>
/// <param name="Status">Verification state.</param>
/// <param name="PageCount">How many pages have been captured.</param>
/// <param name="IssuedOn">Issue date printed on the document.</param>
/// <param name="ExpiresOn">Expiry date printed on the document.</param>
/// <param name="IsCurrentlyValid">Whether the document is verified and not past its expiry date.</param>
/// <param name="CreatedAt">When the document was started.</param>
public sealed record DocumentResponse(
    Guid Id,
    Guid UserId,
    string DocumentTypeCode,
    string DocumentTypeTitlePersian,
    string? ReferenceNumber,
    string Status,
    int PageCount,
    DateOnly? IssuedOn,
    DateOnly? ExpiresOn,
    bool IsCurrentlyValid,
    DateTimeOffset CreatedAt)
{
    /// <summary>Projects a document summary onto the wire shape.</summary>
    public static DocumentResponse From(DocumentSummary summary)
    {
        ArgumentNullException.ThrowIfNull(summary);

        return new DocumentResponse(
            summary.Id,
            summary.UserId,
            summary.DocumentTypeCode,
            summary.DocumentTypeTitlePersian,
            summary.ReferenceNumber,
            summary.Status,
            summary.PageCount,
            summary.IssuedOn,
            summary.ExpiresOn,
            summary.IsCurrentlyValid,
            summary.CreatedAt);
    }
}

/// <summary>A short-lived grant to read one stored page.</summary>
/// <param name="Url">Link served by the platform's own authorized content endpoint.</param>
/// <param name="ExpiresAt">When the link stops working.</param>
/// <param name="ContentType">Media type the caller will receive.</param>
/// <param name="SizeInBytes">Size the caller will receive.</param>
public sealed record DocumentContentResponse(Uri Url, DateTimeOffset ExpiresAt, string ContentType, long SizeInBytes)
{
    /// <summary>Projects a content grant onto the wire shape.</summary>
    public static DocumentContentResponse From(DocumentContentGrant grant)
    {
        ArgumentNullException.ThrowIfNull(grant);

        return new DocumentContentResponse(grant.Url, grant.ExpiresAt, grant.ContentType, grant.SizeInBytes);
    }
}
/// <summary>Query string of the document type catalogue.</summary>
/// <param name="Search">Free-text filter over code, English title and Persian title.</param>
/// <param name="IncludeInactive">Include deactivated types. Off by default, so a caller must ask for them.</param>
/// <param name="Page">One-based page number.</param>
/// <param name="PageSize">Page size.</param>
public sealed record DocumentTypeSearchRequest(
    string? Search = null,
    bool IncludeInactive = false,
    int? Page = null,
    int? PageSize = null)
{
    /// <summary>Converts the caller's paging into a validated, bounded request.</summary>
    public Result<PageRequest> ToPageRequest()
    {
        try
        {
            return Result<PageRequest>.Success(new PageRequest(Page ?? 1, PageSize ?? PageRequest.DefaultPageSize));
        }
        catch (ArgumentOutOfRangeException)
        {
            return Result<PageRequest>.Failure(Error.Validation(
                "identity.document.type_paging_invalid",
                $"Page must be 1 or greater and pageSize between 1 and {PageRequest.MaxPageSize}."));
        }
    }
}

/// <summary>Multipart body of an upload-document-page request.</summary>
/// <remarks>
/// <para>
/// This is a class with settable properties rather than a record, and that is deliberate. The source-generated
/// binder for a positional record treats every constructor parameter as required, so an omitted optional field
/// such as <c>side</c> fails the whole request with a generic framework error before the handler runs — which
/// would make the documented default unreachable and hide the real reason from the caller. Property binding
/// leaves an absent field null, so this endpoint can answer with its own problem document instead.
/// </para>
/// <para>
/// The media type deliberately is not a field here. It travels with the uploaded part, which is where it came
/// from and where it can be trusted; a separate field would only ask the client to restate it, and could
/// disagree with the bytes it is attached to.
/// </para>
/// </remarks>
public sealed class AddDocumentPageForm
{
    /// <summary>The captured page, absent when the request carried no file at all.</summary>
    public IFormFile? Content { get; set; }

    /// <summary>Which side of the document this is, by name; the front when omitted.</summary>
    public string? Side { get; set; }
}

/// <summary>One configured document type, as a client reads it.</summary>
/// <param name="Id">Identifier of the type.</param>
/// <param name="Code">Stable data-driven code.</param>
/// <param name="Title">English title.</param>
/// <param name="TitlePersian">Persian title, which the Persian-first client renders.</param>
/// <param name="Category">Folder category a document of this type belongs to.</param>
/// <param name="RequiresBackSide">Whether both sides must be captured before verification.</param>
/// <param name="DefaultValidityDays">Validity applied on issue, or null when the document never expires.</param>
/// <param name="IsIdentityDocument">Whether a document of this type may back an identity verification.</param>
/// <param name="ProviderTemplate">OCR template hint, or null.</param>
/// <param name="MaxPages">How many pages a document of this type may hold.</param>
/// <param name="IsActive">Whether new documents may still be created against this type.</param>
public sealed record DocumentTypeResponse(
    Guid Id,
    string Code,
    string Title,
    string TitlePersian,
    string Category,
    bool RequiresBackSide,
    int? DefaultValidityDays,
    bool IsIdentityDocument,
    string? ProviderTemplate,
    int MaxPages,
    bool IsActive)
{
    /// <summary>Projects a configured type onto the wire shape.</summary>
    public static DocumentTypeResponse From(DocumentTypeView view)
    {
        ArgumentNullException.ThrowIfNull(view);

        return new DocumentTypeResponse(
            view.Id,
            view.Code,
            view.Title,
            view.TitlePersian,
            view.Category,
            view.RequiresBackSide,
            view.DefaultValidityDays,
            view.IsIdentityDocument,
            view.ProviderTemplate,
            view.MaxPages,
            view.IsActive);
    }
}

/// <summary>One captured page, as a client reads it.</summary>
/// <param name="Id">Identifier of the page.</param>
/// <param name="PageNumber">Position of the page within the document.</param>
/// <param name="Side">Which side of the document the page shows.</param>
/// <param name="ContentType">Media type of the stored bytes.</param>
/// <param name="SizeInBytes">Size of the stored bytes.</param>
/// <param name="Sha256Hash">Digest of the stored bytes.</param>
/// <param name="UploadedAt">When the page was captured.</param>
/// <param name="QualityScore">Overall capture quality, when it was analysed.</param>
public sealed record DocumentPageResponse(
    Guid Id,
    int PageNumber,
    string Side,
    string ContentType,
    long SizeInBytes,
    string Sha256Hash,
    DateTimeOffset UploadedAt,
    double? QualityScore)
{
    /// <summary>Projects a captured page onto the wire shape.</summary>
    public static DocumentPageResponse From(DocumentPageSummary page)
    {
        ArgumentNullException.ThrowIfNull(page);

        return new DocumentPageResponse(
            page.Id,
            page.PageNumber,
            page.Side,
            page.ContentType,
            page.SizeInBytes,
            page.Sha256Hash,
            page.UploadedAt,
            page.QualityScore);
    }
}

/// <summary>One recorded verification decision on a document.</summary>
/// <param name="Id">Identifier of the decision.</param>
/// <param name="Decision">The state it put the document into.</param>
/// <param name="Method">How the decision was reached.</param>
/// <param name="ReviewerId">Who decided, when a person did.</param>
/// <param name="Notes">Why, when the decision carries an explanation.</param>
/// <param name="DecidedAt">When the decision was taken.</param>
public sealed record DocumentDecisionResponse(
    Guid Id,
    string Decision,
    string Method,
    Guid? ReviewerId,
    string? Notes,
    DateTimeOffset DecidedAt)
{
    /// <summary>Projects a decision onto the wire shape.</summary>
    public static DocumentDecisionResponse From(DocumentDecisionSummary decision)
    {
        ArgumentNullException.ThrowIfNull(decision);

        return new DocumentDecisionResponse(
            decision.Id,
            decision.Decision,
            decision.Method,
            decision.ReviewerId,
            decision.Notes,
            decision.DecidedAt);
    }
}

/// <summary>A document with its pages and decisions.</summary>
/// <param name="Document">The document itself.</param>
/// <param name="Pages">The captured pages, in page order.</param>
/// <param name="Decisions">The verification decisions recorded so far, newest first.</param>
public sealed record DocumentDetailsResponse(
    DocumentResponse Document,
    IReadOnlyList<DocumentPageResponse> Pages,
    IReadOnlyList<DocumentDecisionResponse> Decisions)
{
    /// <summary>Projects a document detail read onto the wire shape.</summary>
    public static DocumentDetailsResponse From(DocumentDetails details)
    {
        ArgumentNullException.ThrowIfNull(details);

        return new DocumentDetailsResponse(
            new DocumentResponse(
                details.Id,
                details.UserId,
                details.DocumentTypeCode,
                details.DocumentTypeTitlePersian,
                details.ReferenceNumber,
                details.Status,
                details.Pages.Count,
                details.IssuedOn,
                details.ExpiresOn,
                details.IsCurrentlyValid,
                details.CreatedAt),
            [.. details.Pages.Select(DocumentPageResponse.From)],
            [.. details.Decisions.Select(DocumentDecisionResponse.From)]);
    }
}

/// <summary>One folder entry, as a client reads it.</summary>
/// <param name="Id">Identifier of the entry.</param>
/// <param name="Category">Which part of the dossier the entry belongs to.</param>
/// <param name="Title">Title shown in the dossier.</param>
/// <param name="Description">Free-text note.</param>
/// <param name="Version">Which version of the underlying document this entry points at.</param>
/// <param name="ReviewStatus">Whether a reviewer has accepted or refused the entry.</param>
/// <param name="ReviewedAt">When the entry was reviewed.</param>
/// <param name="ReviewNotes">Why it was accepted or refused.</param>
/// <param name="IdentityDocumentId">The central identity document behind the entry.</param>
/// <param name="IdentityDocumentStatus">Verification state of that document.</param>
/// <param name="PreviewUrl">Short-lived link to the document's first page.</param>
/// <param name="PreviewExpiresAt">When that link stops working.</param>
public sealed record FolderEntryResponse(
    Guid Id,
    string Category,
    string Title,
    string? Description,
    int Version,
    string ReviewStatus,
    DateTimeOffset? ReviewedAt,
    string? ReviewNotes,
    Guid? IdentityDocumentId,
    string? IdentityDocumentStatus,
    Uri? PreviewUrl,
    DateTimeOffset? PreviewExpiresAt)
{
    /// <summary>Projects a folder entry onto the wire shape.</summary>
    public static FolderEntryResponse From(FolderEntryView entry)
    {
        ArgumentNullException.ThrowIfNull(entry);

        return new FolderEntryResponse(
            entry.Id,
            entry.Category,
            entry.Title,
            entry.Description,
            entry.Version,
            entry.ReviewStatus,
            entry.ReviewedAt,
            entry.ReviewNotes,
            entry.IdentityDocumentId,
            entry.IdentityDocumentStatus,
            entry.PreviewUrl,
            entry.PreviewExpiresAt);
    }
}

/// <summary>A person's digital folder, as a client reads it.</summary>
/// <param name="Id">Identifier of the folder.</param>
/// <param name="UserId">The central identity the folder belongs to.</param>
/// <param name="Categories">The dossier sections this folder holds something in.</param>
/// <param name="Entries">Every entry in the folder.</param>
public sealed record DigitalFolderResponse(
    Guid Id,
    Guid UserId,
    IReadOnlyList<string> Categories,
    IReadOnlyList<FolderEntryResponse> Entries)
{
    /// <summary>Projects a dossier onto the wire shape.</summary>
    public static DigitalFolderResponse From(DigitalFolderView folder)
    {
        ArgumentNullException.ThrowIfNull(folder);

        return new DigitalFolderResponse(
            folder.Id,
            folder.UserId,
            folder.Categories,
            [.. folder.Entries.Select(FolderEntryResponse.From)]);
    }
}
