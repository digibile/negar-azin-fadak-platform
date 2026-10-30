using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NegarAzinFadak.Application.Abstractions.Documents;
using NegarAzinFadak.Application.Auditing;
using NegarAzinFadak.Application.Identity;
using NegarAzinFadak.Application.Options;
using NegarAzinFadak.Application.Tenancy;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Paging;
using NegarAzinFadak.Core.Persistence;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Identity.Domain;
using NegarAzinFadak.Identity.Domain.Documents;

namespace NegarAzinFadak.Application.Documents;

/// <summary>One document as a list row.</summary>
/// <param name="Id">Identifier of the document.</param>
/// <param name="UserId">The central identity the document belongs to.</param>
/// <param name="DocumentTypeCode">Code of the configured document type.</param>
/// <param name="DocumentTypeTitlePersian">Persian title of the document type.</param>
/// <param name="ReferenceNumber">The document number as printed on it, when it has one.</param>
/// <param name="Status">Verification state.</param>
/// <param name="PageCount">How many pages have been captured.</param>
/// <param name="IssuedOn">Issue date printed on the document, or null.</param>
/// <param name="ExpiresOn">Expiry date printed on the document, or null.</param>
/// <param name="IsCurrentlyValid">Whether the document is verified and not past its expiry date.</param>
/// <param name="CreatedAt">When the document was started.</param>
public sealed record DocumentSummary(
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
    DateTimeOffset CreatedAt);

/// <summary>One captured page, without its bytes and without any way to reach them.</summary>
/// <param name="Id">Identifier of the page.</param>
/// <param name="PageNumber">Position of the page within the document.</param>
/// <param name="Side">Which side of the document the page shows.</param>
/// <param name="ContentType">Media type of the stored bytes.</param>
/// <param name="SizeInBytes">Size of the stored bytes.</param>
/// <param name="Sha256Hash">Digest of the stored bytes, so an auditor can prove what was filed.</param>
/// <param name="UploadedAt">When the page was captured.</param>
/// <param name="QualityScore">Overall capture quality, when it was analysed.</param>
public sealed record DocumentPageSummary(
    Guid Id,
    int PageNumber,
    string Side,
    string ContentType,
    long SizeInBytes,
    string Sha256Hash,
    DateTimeOffset UploadedAt,
    double? QualityScore);

/// <summary>One recorded verification decision.</summary>
/// <param name="Id">Identifier of the decision.</param>
/// <param name="Decision">The state it put the document into.</param>
/// <param name="Method">How the decision was reached.</param>
/// <param name="ReviewerId">Who decided, when a person did.</param>
/// <param name="Notes">Why, when the decision carries an explanation.</param>
/// <param name="DecidedAt">When the decision was taken.</param>
public sealed record DocumentDecisionSummary(
    Guid Id,
    string Decision,
    string Method,
    Guid? ReviewerId,
    string? Notes,
    DateTimeOffset DecidedAt);

/// <summary>A document with its pages and decisions, and a short-lived link to each page's bytes.</summary>
/// <param name="Id">Identifier of the document.</param>
/// <param name="UserId">The central identity the document belongs to.</param>
/// <param name="DocumentTypeCode">Code of the configured document type.</param>
/// <param name="DocumentTypeTitlePersian">Persian title of the document type.</param>
/// <param name="ReferenceNumber">The document number as printed on it, when it has one.</param>
/// <param name="Status">Verification state.</param>
/// <param name="IssuedOn">Issue date printed on the document, or null.</param>
/// <param name="ExpiresOn">Expiry date printed on the document, or null.</param>
/// <param name="IsCurrentlyValid">Whether the document is verified and not past its expiry date.</param>
/// <param name="CreatedAt">When the document was started.</param>
/// <param name="Pages">The captured pages.</param>
/// <param name="Decisions">The verification decisions recorded so far, newest first.</param>
public sealed record DocumentDetails(
    Guid Id,
    Guid UserId,
    string DocumentTypeCode,
    string DocumentTypeTitlePersian,
    string? ReferenceNumber,
    string Status,
    DateOnly? IssuedOn,
    DateOnly? ExpiresOn,
    bool IsCurrentlyValid,
    DateTimeOffset CreatedAt,
    IReadOnlyList<DocumentPageSummary> Pages,
    IReadOnlyList<DocumentDecisionSummary> Decisions);

/// <summary>A grant to read one page's bytes, valid until the stated instant.</summary>
/// <param name="Url">Link served by the platform's own authorized content endpoint.</param>
/// <param name="ExpiresAt">When the link stops working.</param>
/// <param name="ContentType">Media type the caller will receive.</param>
/// <param name="SizeInBytes">Size the caller will receive.</param>
public sealed record DocumentContentGrant(Uri Url, DateTimeOffset ExpiresAt, string ContentType, long SizeInBytes);

/// <summary>
/// Attaching identity documents, capturing their pages and reading them back.
/// </summary>
/// <remarks>
/// <para>
/// This use case stops where the chosen scope stops: it creates a document and stores its pages, and it never
/// moves the document to <see cref="DocumentStatus.Verified"/>. Verification is a different decision with
/// different rules and different permissions, and folding it in here would mean the endpoint that stores a
/// photo could also make a photo into trusted master data — which is precisely the boundary the platform
/// exists to hold. Everything this service writes stays in a state no business module may treat as verified.
/// </para>
/// <para>
/// Nothing here ever returns a durable URL. Pages are reachable through
/// <see cref="CreateContentLinkAsync"/> and <see cref="OpenContentAsync"/>, both of which resolve the storage
/// key against the caller's tenant first and refuse what the tenant does not own, so a key that leaks out of a
/// log or a URL is not a capability on its own.
/// </para>
/// </remarks>
public sealed class DocumentService
{
    private readonly IDocumentDirectory _documents;
    private readonly IDocumentTypeCatalog _types;
    private readonly IIdentityDirectory _identities;
    private readonly IDocumentStorage _storage;
    private readonly IDocumentImageAnalyzer _analyzer;
    private readonly IUnitOfWork _unitOfWork;
    private readonly AuditTrailWriter _audit;
    private readonly IClock _clock;
    private readonly DocumentOptions _options;
    private readonly ILogger<DocumentService> _logger;

    public DocumentService(
        IDocumentDirectory documents,
        IDocumentTypeCatalog types,
        IIdentityDirectory identities,
        IDocumentStorage storage,
        IDocumentImageAnalyzer analyzer,
        IUnitOfWork unitOfWork,
        AuditTrailWriter audit,
        IClock clock,
        IOptions<DocumentOptions> options,
        ILogger<DocumentService> logger)
    {
        _documents = Guard.AgainstNull(documents);
        _types = Guard.AgainstNull(types);
        _identities = Guard.AgainstNull(identities);
        _storage = Guard.AgainstNull(storage);
        _analyzer = Guard.AgainstNull(analyzer);
        _unitOfWork = Guard.AgainstNull(unitOfWork);
        _audit = Guard.AgainstNull(audit);
        _clock = Guard.AgainstNull(clock);
        _options = Guard.AgainstNull(options).Value;
        _logger = Guard.AgainstNull(logger);
    }

    /// <summary>One page of the documents of the caller's organization.</summary>
    public async Task<Result<PagedResult<DocumentSummary>>> ListAsync(
        DocumentQuery query,
        PageRequest page,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(query);
        ArgumentNullException.ThrowIfNull(page);

        var scoped = ResolveScope();
        if (scoped.IsFailure)
        {
            return Result<PagedResult<DocumentSummary>>.Failure(scoped.FirstError);
        }

        var scope = scoped.Value;

        var today = _clock.Today;
        var found = await _documents.ListAsync(scope, query, page, today, cancellationToken).ConfigureAwait(false);

        var codes = await LoadTypeCodesAsync(found.Items, cancellationToken).ConfigureAwait(false);
        var projected = found.Map(document => ToSummary(document, codes, today));

        await _audit.RecordSuccessAsync(
            DocumentAuditActions.List,
            ResourceTypes.IdentityDocument,
            "documents",
            new Dictionary<string, string?>
            {
                ["returned"] = projected.Count.ToString(System.Globalization.CultureInfo.InvariantCulture),
                ["total"] = projected.TotalCount.ToString(System.Globalization.CultureInfo.InvariantCulture),
                ["filtered"] = (!query.IsUnfiltered).ToString()
            },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result<PagedResult<DocumentSummary>>.Success(projected);
    }

    /// <summary>Reads one document of the caller's organization with its pages and decisions.</summary>
    public async Task<Result<DocumentDetails>> ReadAsync(
        Guid documentId,
        CancellationToken cancellationToken = default)
    {
        var scoped = ResolveScope();
        if (scoped.IsFailure)
        {
            return Result<DocumentDetails>.Failure(scoped.FirstError);
        }

        var document = await _documents.FindByIdAsync(scoped.Value, documentId, cancellationToken).ConfigureAwait(false);
        if (document is null)
        {
            return await _audit.AuditDenialAsync(
                DocumentAuditActions.Read,
                ResourceTypes.IdentityDocument,
                documentId.ToString(),
                Result<DocumentDetails>.Failure(IdentityErrors.DocumentNotFound),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        var codes = await LoadTypeCodesAsync([document], cancellationToken).ConfigureAwait(false);
        var today = _clock.Today;
        var code = codes.GetValueOrDefault(document.DocumentTypeId);

        await _audit.RecordSuccessAsync(
            DocumentAuditActions.Read,
            ResourceTypes.IdentityDocument,
            document.Id.ToString(),
            cancellationToken: cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result<DocumentDetails>.Success(new DocumentDetails(
            document.Id,
            document.UserId,
            code.Code,
            code.TitlePersian,
            document.ReferenceNumber,
            document.Status.ToString(),
            document.IssuedOn,
            document.ExpiresOn,
            document.IsCurrentlyValid(today),
            document.CreatedAt,
            [.. document.Pages
                .OrderBy(page => page.PageNumber)
                .Select(page => new DocumentPageSummary(
                    page.Id,
                    page.PageNumber,
                    page.Side.ToString(),
                    page.ContentType,
                    page.SizeInBytes,
                    page.Sha256Hash,
                    page.UploadedAt,
                    page.Quality?.OverallScore))],
            [.. document.Verifications
                .OrderByDescending(decision => decision.DecidedAt)
                .Select(decision => new DocumentDecisionSummary(
                    decision.Id,
                    decision.Decision.ToString(),
                    decision.Method.ToString(),
                    decision.ReviewerId,
                    decision.Notes,
                    decision.DecidedAt))]));
    }

    /// <summary>
    /// Starts a new document for an identity of the caller's organization.
    /// </summary>
    /// <remarks>
    /// A fresh document is <see cref="DocumentStatus.Unverified"/>. That is the only status the aggregate can
    /// start in, and it happens to be the right one: it is the state no business module may treat as trusted
    /// master data, which is exactly where a document nobody has looked at yet belongs. The type's default
    /// validity is applied when the caller supplies no expiry, so a passport does not silently get an
    /// open-ended life because nobody typed a date.
    /// </remarks>
    public async Task<Result<DocumentSummary>> AttachAsync(
        Guid userId,
        string documentTypeCode,
        string? referenceNumber = null,
        DateOnly? issuedOn = null,
        DateOnly? expiresOn = null,
        CancellationToken cancellationToken = default)
    {
        var scoped = ResolveScope();
        if (scoped.IsFailure)
        {
            return Result<DocumentSummary>.Failure(scoped.FirstError);
        }

        var scope = scoped.Value;

        // The owner is looked up inside the caller's tenant rather than accepted on trust. A document
        // attached to an identity of another organization would be a row that no screen of the caller's
        // organization can display and no workflow can use, and the unique index would then make the
        // legitimate owner's own document of the same kind impossible to file.
        var owner = await _identities.FindByIdAsync(scope, userId, cancellationToken).ConfigureAwait(false);
        if (owner is null)
        {
            return await _audit.AuditDenialAsync(
                DocumentAuditActions.Attach,
                ResourceTypes.IdentityDocument,
                userId.ToString(),
                Result<DocumentSummary>.Failure(IdentityErrors.UserNotFound()),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        var type = await ResolveTypeAsync(documentTypeCode, cancellationToken).ConfigureAwait(false);
        if (type.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                DocumentAuditActions.Attach,
                ResourceTypes.IdentityDocument,
                userId.ToString(),
                Result<DocumentSummary>.Failure(type.FirstError),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        var document = IdentityDocument.Create(Guid.NewGuid(), userId, type.Value.Id, scope, referenceNumber);

        var validity = ApplyValidity(document, type.Value, issuedOn, expiresOn);
        if (validity.IsFailure)
        {
            return Result<DocumentSummary>.Failure(validity.FirstError);
        }

        _documents.Add(document);

        await _audit.RecordSuccessAsync(
            DocumentAuditActions.Attach,
            ResourceTypes.IdentityDocument,
            document.Id.ToString(),
            new Dictionary<string, string?>
            {
                ["userId"] = userId.ToString(),
                ["documentType"] = type.Value.Code
            },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        _logger.LogInformation(
            "Document {DocumentId} of type {DocumentType} attached to identity {UserId}.",
            document.Id,
            type.Value.Code,
            userId);

        return Result<DocumentSummary>.Success(
            ToSummary(document, (type.Value.Code, type.Value.TitlePersian), _clock.Today));
    }

    /// <summary>
    /// Stores one captured page of a document.
    /// </summary>
    /// <remarks>
    /// The order is fixed and it is the whole point of the method: judge the image, then store it. Analysing
    /// first means a retake costs nothing but a refusal, and an unusable capture never reaches storage, where
    /// it would become an object the platform is unwilling to delete and unable to use. Storing before judging
    /// would leave exactly the opposite residue, which is why the analyzer is consulted here rather than by the
    /// caller.
    /// </remarks>
    public async Task<Result<DocumentPageSummary>> AddPageAsync(
        Guid documentId,
        DocumentSide side,
        ReadOnlyMemory<byte> content,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        var scoped = ResolveScope();
        if (scoped.IsFailure)
        {
            return Result<DocumentPageSummary>.Failure(scoped.FirstError);
        }

        var scope = scoped.Value;

        var document = await _documents.FindTrackedByIdAsync(scope, documentId, cancellationToken).ConfigureAwait(false);
        if (document is null)
        {
            return await _audit.AuditDenialAsync(
                DocumentAuditActions.AddPage,
                ResourceTypes.IdentityDocument,
                documentId.ToString(),
                Result<DocumentPageSummary>.Failure(IdentityErrors.DocumentNotFound),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        var type = await LoadTypeAsync(document, cancellationToken).ConfigureAwait(false);
        if (type is null || !type.IsActive)
        {
            // A document whose type has since been deactivated stops accepting new pages, which is the point
            // of deactivating it. The document itself stays readable, and the pages already captured stay
            // valid evidence of what was submitted.
            return await _audit.AuditDenialAsync(
                DocumentAuditActions.AddPage,
                ResourceTypes.IdentityDocument,
                document.Id.ToString(),
                Result<DocumentPageSummary>.Failure(IdentityErrors.DocumentTypeInactive),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        if (document.Pages.Count >= type.MaxPages)
        {
            return await _audit.AuditDenialAsync(
                DocumentAuditActions.AddPage,
                ResourceTypes.IdentityDocument,
                document.Id.ToString(),
                Result<DocumentPageSummary>.Failure(IdentityErrors.DocumentMaxPagesReached(type.MaxPages)),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        var verdict = _analyzer.Analyze(content.Span, contentType);
        if (!verdict.IsAcceptable)
        {
            return await _audit.AuditDenialAsync(
                DocumentAuditActions.AddPage,
                ResourceTypes.IdentityDocument,
                document.Id.ToString(),
                Result<DocumentPageSummary>.Failure(IdentityErrors.DocumentCaptureUnacceptable(verdict.Issues)),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        var pageNumber = NextPageNumber(document);
        var stored = await _storage.StoreAsync(
            new MemoryStream(content.ToArray(), writable: false),
            contentType,
            ExtensionFor(contentType),
            scope.OrganizationId,
            document.Id,
            cancellationToken).ConfigureAwait(false);

        if (stored.IsFailure)
        {
            await _audit.RecordFailureAsync(
                DocumentAuditActions.AddPage,
                ResourceTypes.IdentityDocument,
                document.Id.ToString(),
                stored.FirstError.Code,
                cancellationToken: cancellationToken).ConfigureAwait(false);
            return Result<DocumentPageSummary>.Failure(stored.FirstError);
        }

        var objectStored = stored.Value;
        var added = document.AddPage(
            Guid.NewGuid(),
            pageNumber,
            side,
            objectStored.StorageKey,
            objectStored.ContentType,
            objectStored.SizeInBytes,
            objectStored.Sha256Hash,
            verdict.NormalizedQuality,
            _clock.UtcNow);

        if (added.IsFailure)
        {
            // The bytes are stored but the aggregate refused the page, so the document must not refer to
            // bytes it did not accept. Deleting them is not an optimisation here: leaving them would create
            // a private object no row points at, which no later read could ever clean up.
            var discarded = await _storage.DeleteAsync(objectStored.StorageKey, cancellationToken).ConfigureAwait(false);
            if (discarded.IsFailure)
            {
                _logger.LogError(
                    "Page {PageNumber} of document {DocumentId} was refused by the aggregate and its stored bytes could not be removed. Storage key {StorageKey} is orphaned.",
                    pageNumber,
                    document.Id,
                    objectStored.StorageKey);
            }

            await _audit.AuditDenialAsync(
                DocumentAuditActions.AddPage,
                ResourceTypes.IdentityDocument,
                document.Id.ToString(),
                Result<DocumentPageSummary>.Failure(added.FirstError),
                cancellationToken: cancellationToken).ConfigureAwait(false);
            return Result<DocumentPageSummary>.Failure(added.FirstError);
        }

        var page = document.Pages.Single(candidate => candidate.PageNumber == pageNumber);

        await _audit.RecordSuccessAsync(
            DocumentAuditActions.AddPage,
            ResourceTypes.IdentityDocument,
            document.Id.ToString(),
            new Dictionary<string, string?>
            {
                ["pageNumber"] = pageNumber.ToString(System.Globalization.CultureInfo.InvariantCulture),
                ["side"] = side.ToString(),
                ["bytes"] = objectStored.SizeInBytes.ToString(System.Globalization.CultureInfo.InvariantCulture)
            },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result<DocumentPageSummary>.Success(new DocumentPageSummary(
            page.Id,
            page.PageNumber,
            page.Side.ToString(),
            page.ContentType,
            page.SizeInBytes,
            page.Sha256Hash,
            page.UploadedAt,
            page.Quality?.OverallScore));
    }

    /// <summary>
    /// Records the issue and expiry dates printed on the document.
    /// </summary>
    /// <remarks>
    /// Allowed on any document the caller can see, including a rejected one, because recording what the paper
    /// says is independent of whether the platform believes it. The expiry comes from the document type's
    /// default when the caller supplies none and the type declares one.
    /// </remarks>
    public async Task<Result> SetValidityAsync(
        Guid documentId,
        DateOnly? issuedOn,
        DateOnly? expiresOn,
        CancellationToken cancellationToken = default)
    {
        var scoped = ResolveScope();
        if (scoped.IsFailure)
        {
            return Result.Failure(scoped.FirstError);
        }

        var scope = scoped.Value;

        var document = await _documents.FindTrackedByIdAsync(scope, documentId, cancellationToken).ConfigureAwait(false);
        if (document is null)
        {
            return await _audit.AuditDenialAsync(
                DocumentAuditActions.SetValidity,
                ResourceTypes.IdentityDocument,
                documentId.ToString(),
                Result.Failure(IdentityErrors.DocumentNotFound),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        var type = await LoadTypeAsync(document, cancellationToken).ConfigureAwait(false);
        var validity = ApplyValidity(document, type, issuedOn, expiresOn);
        if (validity.IsFailure)
        {
            await _audit.AuditDenialAsync(
                DocumentAuditActions.SetValidity,
                ResourceTypes.IdentityDocument,
                document.Id.ToString(),
                validity,
                cancellationToken: cancellationToken).ConfigureAwait(false);
            return validity;
        }

        await _audit.RecordSuccessAsync(
            DocumentAuditActions.SetValidity,
            ResourceTypes.IdentityDocument,
            document.Id.ToString(),
            new Dictionary<string, string?>
            {
                ["issuedOn"] = document.IssuedOn?.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture),
                ["expiresOn"] = document.ExpiresOn?.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture)
            },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }

    /// <summary>
    /// Issues a short-lived link to one captured page of a document, identified by the page rather than by
    /// its storage key.
    /// </summary>
    /// <remarks>
    /// This is the caller-facing way to get at bytes, and it takes identifiers rather than a storage key on
    /// purpose. A key in a request is a secret that has to be treated as one: it can end up in a browser
    /// history, an access log and a proxy cache, and any of those would then hold a working reference to
    /// somebody's national ID card. Naming the document and the page instead means the only endpoint that
    /// ever accepts a key is the one an issued link points at, and that one re-authorizes per request
    /// anyway.
    /// </remarks>
    public async Task<Result<DocumentContentGrant>> CreateContentLinkAsync(
        Guid documentId,
        Guid pageId,
        CancellationToken cancellationToken = default)
    {
        var scoped = ResolveScope();
        if (scoped.IsFailure)
        {
            return Result<DocumentContentGrant>.Failure(scoped.FirstError);
        }

        var document = await _documents.FindByIdAsync(scoped.Value, documentId, cancellationToken).ConfigureAwait(false);
        var page = document?.Pages.FirstOrDefault(candidate => candidate.Id == pageId);

        if (document is null || page is null)
        {
            // One answer for both "no such document" and "no such page in it", so this endpoint cannot be
            // used to probe which page identifiers a document has.
            return await _audit.AuditDenialAsync(
                DocumentAuditActions.CreateLink,
                ResourceTypes.IdentityDocument,
                documentId.ToString(),
                Result<DocumentContentGrant>.Failure(IdentityErrors.DocumentNotFound),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        var link = await _storage
            .CreateExpiringLinkAsync(page.StorageKey, _options.LinkLifetime, cancellationToken)
            .ConfigureAwait(false);

        if (link.IsFailure)
        {
            return Result<DocumentContentGrant>.Failure(link.FirstError);
        }

        await _audit.RecordSuccessAsync(
            DocumentAuditActions.CreateLink,
            ResourceTypes.IdentityDocument,
            document.Id.ToString(),
            new Dictionary<string, string?> { ["pageId"] = page.Id.ToString() },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result<DocumentContentGrant>.Success(new DocumentContentGrant(
            link.Value.Url,
            link.Value.ExpiresAt,
            page.ContentType,
            page.SizeInBytes));
    }

    /// <summary>
    /// Opens one stored page for streaming, after re-checking that the caller's tenant owns it.
    /// </summary>
    /// <remarks>
    /// This is the method the content endpoint calls, and it is the reason the platform has no static file
    /// middleware over private storage: authorization is re-derived per request from the database rather than
    /// assumed from the possession of a URL.
    /// </remarks>
    public async Task<Result<(DocumentPage Page, Stream Content)>> OpenContentAsync(
        string storageKey,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(storageKey);

        var scoped = ResolveScope();
        if (scoped.IsFailure)
        {
            return Result<(DocumentPage, Stream)>.Failure(scoped.FirstError);
        }

        var located = await ResolveAsync(scoped.Value, storageKey, cancellationToken).ConfigureAwait(false);
        if (located.IsFailure)
        {
            await _audit.AuditDenialAsync(
                DocumentAuditActions.Download,
                ResourceTypes.IdentityDocument,
                storageKey,
                Result<(DocumentPage, Stream)>.Failure(located.FirstError),
                cancellationToken: cancellationToken).ConfigureAwait(false);
            return Result<(DocumentPage, Stream)>.Failure(located.FirstError);
        }

        var page = located.Value.Page;
        var content = await _storage.OpenReadAsync(page.StorageKey, cancellationToken).ConfigureAwait(false);
        if (content.IsFailure)
        {
            // The row says the object exists and the store says it does not. That is a storage fault, not a
            // caller mistake, and reporting it as "not found" would hide it from whoever has to repair it.
            await _audit.RecordFailureAsync(
                DocumentAuditActions.Download,
                ResourceTypes.IdentityDocument,
                located.Value.Document.Id.ToString(),
                content.FirstError.Code,
                cancellationToken: cancellationToken).ConfigureAwait(false);
            return Result<(DocumentPage, Stream)>.Failure(content.FirstError);
        }

        await _audit.RecordSuccessAsync(
            DocumentAuditActions.Download,
            ResourceTypes.IdentityDocument,
            located.Value.Document.Id.ToString(),
            new Dictionary<string, string?> { ["pageId"] = page.Id.ToString() },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result<(DocumentPage, Stream)>.Success((page, content.Value));
    }

    /// <summary>
    /// The caller's tenant, taken from the audited principal rather than from any argument.
    /// </summary>
    /// <remarks>
    /// There is deliberately no <c>TenantScope</c> parameter on any public method of this service, so no route,
    /// query string or request body can widen what a caller sees. That is the same rule the identity directory
    /// follows and for the same reason. A session with no resolved organization is refused outright rather
    /// than answered from the unfiltered catalogue, because "no tenant" must never degrade into "every
    /// tenant".
    /// </remarks>
    private Result<TenantScope> ResolveScope()
        => _audit.Scope.IsEmpty
            ? Result<TenantScope>.Failure(IdentityErrors.OutsideTenant)
            : Result<TenantScope>.Success(_audit.Scope);

    private async Task<Result<StoredPageLocation>> ResolveAsync(
        TenantScope scope,
        string storageKey,
        CancellationToken cancellationToken)
    {
        var located = await _documents
            .FindPageByStorageKeyAsync(scope, storageKey, cancellationToken)
            .ConfigureAwait(false);

        return located is null
            ? Result<StoredPageLocation>.Failure(IdentityErrors.DocumentNotFound)
            : Result<StoredPageLocation>.Success(located);
    }

    /// <summary>
    /// Resolves a document type code to an active type.
    /// </summary>
    /// <remarks>
    /// <c>FindActiveByCodeAsync</c> rather than a plain lookup, so a deactivated type refuses new documents
    /// without needing its own error path: the type is simply not there to be attached.
    /// </remarks>
    private async Task<Result<DocumentType>> ResolveTypeAsync(string? code, CancellationToken cancellationToken)
    {
        var normalized = DocumentTypeRules.NormalizeCode(code);
        if (normalized.IsFailure)
        {
            return Result<DocumentType>.Failure(normalized.FirstError);
        }

        var type = await _types.FindActiveByCodeAsync(normalized.Value, cancellationToken).ConfigureAwait(false);
        return type is null
            ? Result<DocumentType>.Failure(IdentityErrors.DocumentTypeNotFound)
            : Result<DocumentType>.Success(type);
    }

    private async Task<DocumentType?> LoadTypeAsync(IdentityDocument document, CancellationToken cancellationToken)
    {
        // A document carries only the identifier of its type, so resolving the type costs a second read. It
        // is resolved rather than denormalized onto the aggregate on purpose: the code and titles belong to
        // the catalogue, and a second copy stored on every document is how two copies drift apart.
        return await _types.FindByIdAsync(document.DocumentTypeId, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Applies the supplied validity, falling back to the document type's default expiry.
    /// </summary>
    private static Result ApplyValidity(IdentityDocument document, DocumentType? type, DateOnly? issuedOn, DateOnly? expiresOn)
    {
        var effectiveExpiry = expiresOn ?? (type?.DefaultValidityDays is { } days
            ? issuedOn?.AddDays(days)
            : null);

        return document.SetValidity(issuedOn, effectiveExpiry);
    }

    private static int NextPageNumber(IdentityDocument document)
        => document.Pages.Count is 0 ? 1 : document.Pages.Max(page => page.PageNumber) + 1;

    private async Task<Dictionary<Guid, (string Code, string TitlePersian)>> LoadTypeCodesAsync(
        IReadOnlyList<IdentityDocument> documents,
        CancellationToken cancellationToken)
    {
        var ids = documents.Select(document => document.DocumentTypeId).Distinct().ToArray();
        var loaded = await _types.LoadByIdsAsync(ids, cancellationToken).ConfigureAwait(false);

        var wanted = loaded.ToDictionary(
            pair => pair.Key,
            pair => (pair.Value.Code, pair.Value.TitlePersian));

        // A type that has disappeared entirely still gets a placeholder, so one unresolvable row degrades to
        // showing its identifier instead of throwing away the whole page of results.
        foreach (var id in ids.Where(id => !wanted.ContainsKey(id)))
        {
            wanted[id] = (id.ToString(), string.Empty);
        }

        return wanted;
    }

    private static DocumentSummary ToSummary(
        IdentityDocument document,
        IReadOnlyDictionary<Guid, (string Code, string TitlePersian)> codes,
        DateOnly today)
        => ToSummary(document, codes.GetValueOrDefault(document.DocumentTypeId, (document.DocumentTypeId.ToString(), string.Empty)), today);

    private static DocumentSummary ToSummary(
        IdentityDocument document,
        (string Code, string TitlePersian) type,
        DateOnly today)
        => new(
            document.Id,
            document.UserId,
            type.Code,
            type.TitlePersian,
            document.ReferenceNumber,
            document.Status.ToString(),
            document.Pages.Count,
            document.IssuedOn,
            document.ExpiresOn,
            document.IsCurrentlyValid(today),
            document.CreatedAt);

    private static string ExtensionFor(string contentType)
    {
        var separator = contentType.IndexOf('/', StringComparison.Ordinal);
        if (separator < 0 || separator == contentType.Length - 1)
        {
            return string.Empty;
        }

        // Only the subtype survives. A content type is caller-supplied, and letting its parameters through
        // would let a caller choose the stored file's extension, which is a path-shaped decision.
        var subtype = contentType[(separator + 1)..].Split(';')[0].Trim().ToLowerInvariant();
        subtype = subtype switch
        {
            "jpeg" => "jpg",
            "svg+xml" or "x-subxml" => "svg",
            _ => subtype
        };

        return subtype.Length is 0 ? string.Empty : "." + subtype;
    }
}