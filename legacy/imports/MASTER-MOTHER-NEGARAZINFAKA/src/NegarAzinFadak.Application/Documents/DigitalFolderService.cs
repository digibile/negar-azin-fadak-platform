using Microsoft.Extensions.Logging;
using NegarAzinFadak.Application.Abstractions.Documents;
using NegarAzinFadak.Application.Auditing;
using NegarAzinFadak.Application.Identity;
using NegarAzinFadak.Application.Tenancy;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Persistence;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Identity.Domain;
using NegarAzinFadak.Identity.Domain.Documents;
using NegarAzinFadak.Identity.Domain.Folders;

namespace NegarAzinFadak.Application.Documents;

/// <summary>One folder entry, with a short-lived link to the bytes when the entry is document-backed.</summary>
/// <param name="Id">Identifier of the entry.</param>
/// <param name="Category">Which part of the dossier the entry belongs to.</param>
/// <param name="Title">Title shown in the dossier.</param>
/// <param name="Description">Free-text note, when the entry has one.</param>
/// <param name="Version">Which version of the underlying document this entry points at.</param>
/// <param name="ReviewStatus">Whether a reviewer has accepted or refused the entry.</param>
/// <param name="ReviewedAt">When the entry was reviewed, or null.</param>
/// <param name="ReviewNotes">Why it was accepted or refused, when a reviewer said.</param>
/// <param name="IdentityDocumentId">The central identity document behind the entry, when there is one.</param>
/// <param name="IdentityDocumentStatus">Verification state of that document, when there is one.</param>
/// <param name="PreviewUrl">Short-lived link to the document's first page, when the entry is document-backed.</param>
/// <param name="PreviewExpiresAt">When that link stops working.</param>
public sealed record FolderEntryView(
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
    DateTimeOffset? PreviewExpiresAt);

/// <summary>A person's digital folder, with its entries grouped by category.</summary>
/// <param name="Id">Identifier of the folder.</param>
/// <param name="UserId">The central identity the folder belongs to.</param>
/// <param name="Categories">The dossier sections this folder currently holds something in.</param>
/// <param name="Entries">Every entry, newest first within its category.</param>
public sealed record DigitalFolderView(
    Guid Id,
    Guid UserId,
    IReadOnlyList<string> Categories,
    IReadOnlyList<FolderEntryView> Entries);

/// <summary>
/// A person's digital folder: membership, versioning and review of what the platform holds about them.
/// </summary>
/// <remarks>
/// <para>
/// The folder owns membership and review state only. The documents themselves stay in the identity document
/// aggregate, which is what keeps verification state having exactly one home: a folder entry points at a
/// document rather than copying it, so the same verified national ID can be reused by every business module
/// instead of being re-uploaded per module, and it can never end up approved in a folder while rejected in the
/// registry.
/// </para>
/// <para>
/// <see cref="EnsureAsync"/> exists because a folder accompanies every central identity rather than being
/// created when someone first needs one. It is idempotent, which is what lets registration call it without
/// having to know whether this is a new identity, and it is written by the same transaction as the identity so
/// a person can never exist without somewhere to keep their dossier.
/// </para>
/// </remarks>
public sealed class DigitalFolderService
{
    private readonly IDigitalFolderDirectory _folders;
    private readonly IDocumentDirectory _documents;
    private readonly IDocumentTypeCatalog _types;
    private readonly IIdentityDirectory _identities;
    private readonly IDocumentStorage _storage;
    private readonly IUnitOfWork _unitOfWork;
    private readonly AuditTrailWriter _audit;
    private readonly IClock _clock;
    private readonly ILogger<DigitalFolderService> _logger;

    public DigitalFolderService(
        IDigitalFolderDirectory folders,
        IDocumentDirectory documents,
        IDocumentTypeCatalog types,
        IIdentityDirectory identities,
        IDocumentStorage storage,
        IUnitOfWork unitOfWork,
        AuditTrailWriter audit,
        IClock clock,
        ILogger<DigitalFolderService> logger)
    {
        _folders = Guard.AgainstNull(folders);
        _documents = Guard.AgainstNull(documents);
        _types = Guard.AgainstNull(types);
        _identities = Guard.AgainstNull(identities);
        _storage = Guard.AgainstNull(storage);
        _unitOfWork = Guard.AgainstNull(unitOfWork);
        _audit = Guard.AgainstNull(audit);
        _clock = Guard.AgainstNull(clock);
        _logger = Guard.AgainstNull(logger);
    }

    /// <summary>Reads the dossier of an identity of the caller's organization.</summary>
    public async Task<Result<DigitalFolderView>> ReadAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var scoped = ResolveScope();
        if (scoped.IsFailure)
        {
            return Result<DigitalFolderView>.Failure(scoped.FirstError);
        }

        var folder = await _folders.FindByUserAsync(scoped.Value, userId, cancellationToken).ConfigureAwait(false);
        if (folder is null)
        {
            return await _audit.AuditDenialAsync(
                DocumentAuditActions.FolderRead,
                ResourceTypes.DigitalFolder,
                userId.ToString(),
                Result<DigitalFolderView>.Failure(IdentityErrors.FolderNotFound),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        var view = await ProjectAsync(folder, includePreviewLinks: true, cancellationToken).ConfigureAwait(false);

        await _audit.RecordSuccessAsync(
            DocumentAuditActions.FolderRead,
            ResourceTypes.DigitalFolder,
            folder.Id.ToString(),
            new Dictionary<string, string?> { ["entries"] = view.Entries.Count.ToString(System.Globalization.CultureInfo.InvariantCulture) },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result<DigitalFolderView>.Success(view);
    }

    /// <summary>
    /// Returns the dossier of an identity, creating it when it does not exist yet.
    /// </summary>
    /// <remarks>
    /// Idempotent, and that is the whole contract: an existing folder is returned untouched, so calling this
    /// after registration, on the dossier screen and on the first upload produces one folder rather than three
    /// or an argument exception. The creation is announced in the audit trail either way, with a flag saying
    /// which of the two happened, because "a folder was created" and "a folder was found" are different events
    /// for anyone reading the trail later.
    /// </remarks>
    public async Task<Result<DigitalFolderView>> EnsureAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var scoped = ResolveScope();
        if (scoped.IsFailure)
        {
            return Result<DigitalFolderView>.Failure(scoped.FirstError);
        }

        var scope = scoped.Value;

        // The owner is resolved inside the tenant first, for the same reason attaching a document does it:
        // a folder for an identity the caller cannot see is a row no screen of the caller's organization can
        // display, and it would occupy the one-folder-per-identity slot of somebody's real dossier.
        var owner = await _identities.FindByIdAsync(scope, userId, cancellationToken).ConfigureAwait(false);
        if (owner is null)
        {
            return await _audit.AuditDenialAsync(
                DocumentAuditActions.FolderEnsure,
                ResourceTypes.DigitalFolder,
                userId.ToString(),
                Result<DigitalFolderView>.Failure(IdentityErrors.UserNotFound()),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        var existing = await _folders.FindTrackedByUserAsync(scope, userId, cancellationToken).ConfigureAwait(false);
        var created = false;

        if (existing is null)
        {
            var folder = DigitalFolder.CreateFor(userId, scope, _clock.UtcNow);
            _folders.Add(folder);
            existing = folder;
            created = true;

            _logger.LogInformation("Digital folder {FolderId} created for identity {UserId}.", folder.Id, userId);
        }

        await _audit.RecordSuccessAsync(
            DocumentAuditActions.FolderEnsure,
            ResourceTypes.DigitalFolder,
            existing.Id.ToString(),
            new Dictionary<string, string?> { ["created"] = created.ToString() },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        var view = await ProjectAsync(existing, includePreviewLinks: false, cancellationToken).ConfigureAwait(false);

        return Result<DigitalFolderView>.Success(view);
    }

    /// <summary>
    /// Adds a central identity document to a person's dossier.
    /// </summary>
    /// <remarks>
    /// The document is looked up in the caller's tenant, so an entry can only ever point at a document the
    /// caller can already see. Its category comes from its configured document type rather than from the
    /// caller, because where a national ID belongs in a dossier is a property of what a national ID is, and
    /// letting a caller file it under "financial" would scatter one person's documents across sections
    /// depending on who pressed the button.
    /// </remarks>
    public async Task<Result<FolderEntryView>> AddDocumentAsync(
        Guid userId,
        Guid identityDocumentId,
        string? title = null,
        string? description = null,
        CancellationToken cancellationToken = default)
    {
        var scoped = ResolveScope();
        if (scoped.IsFailure)
        {
            return Result<FolderEntryView>.Failure(scoped.FirstError);
        }

        var scope = scoped.Value;

        var folder = await _folders.FindTrackedByUserAsync(scope, userId, cancellationToken).ConfigureAwait(false);
        if (folder is null)
        {
            return await _audit.AuditDenialAsync(
                DocumentAuditActions.FolderAddEntry,
                ResourceTypes.DigitalFolder,
                userId.ToString(),
                Result<FolderEntryView>.Failure(IdentityErrors.FolderNotFound),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        var document = await _documents.FindByIdAsync(scope, identityDocumentId, cancellationToken).ConfigureAwait(false);
        if (document is null)
        {
            return await _audit.AuditDenialAsync(
                DocumentAuditActions.FolderAddEntry,
                ResourceTypes.DigitalFolder,
                folder.Id.ToString(),
                Result<FolderEntryView>.Failure(IdentityErrors.DocumentNotFound),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        var type = await _types.FindByIdAsync(document.DocumentTypeId, cancellationToken).ConfigureAwait(false);
        if (type is null)
        {
            return await _audit.AuditDenialAsync(
                DocumentAuditActions.FolderAddEntry,
                ResourceTypes.DigitalFolder,
                folder.Id.ToString(),
                Result<FolderEntryView>.Failure(IdentityErrors.DocumentTypeNotFound),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        var entryTitle = string.IsNullOrWhiteSpace(title) ? type.TitlePersian : title.Trim();
        var added = folder.AddDocument(
            identityDocumentId,
            type.Category,
            entryTitle,
            description,
            version: document.Version);

        if (added.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                DocumentAuditActions.FolderAddEntry,
                ResourceTypes.DigitalFolder,
                folder.Id.ToString(),
                Result<FolderEntryView>.Failure(added.FirstError),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        // The aggregate appends the entry and does not hand it back, so it is picked out of the collection it
        // just joined. The unique-identity check inside AddDocument is what guarantees this finds one entry
        // and not several.
        var entry = folder.Documents.Last(document2 => document2.IdentityDocumentId == identityDocumentId);

        await _audit.RecordSuccessAsync(
            DocumentAuditActions.FolderAddEntry,
            ResourceTypes.DigitalFolder,
            folder.Id.ToString(),
            new Dictionary<string, string?>
            {
                ["entryId"] = entry?.Id.ToString(),
                ["identityDocumentId"] = identityDocumentId.ToString(),
                ["category"] = type.Category.ToString()
            },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result<FolderEntryView>.Success(new FolderEntryView(
            entry!.Id,
            type.Category.ToString(),
            entry.Title,
            entry.Description,
            entry.Version,
            entry.ReviewStatus.ToString(),
            entry.ReviewedAt,
            entry.ReviewNotes,
            entry.IdentityDocumentId,
            document.Status.ToString(),
            null,
            null));
    }

    /// <summary>
    /// Records a reviewer's decision on one folder entry.
    /// </summary>
    /// <remarks>
    /// Approving a folder entry says only that the dossier may use that document; it does not verify the
    /// document itself, which is a separate decision with its own rules and its own permission. Keeping the two
    /// apart is what allows a dossier to be assembled from documents that are still under review, without the
    /// act of assembling it quietly promoting any of them.
    /// </remarks>
    public async Task<Result<FolderEntryView>> ReviewAsync(
        Guid userId,
        Guid entryId,
        bool approve,
        Guid reviewerId,
        string? notes,
        CancellationToken cancellationToken = default)
    {
        var scoped = ResolveScope();
        if (scoped.IsFailure)
        {
            return Result<FolderEntryView>.Failure(scoped.FirstError);
        }

        var scope = scoped.Value;

        var folder = await _folders.FindTrackedByUserAsync(scope, userId, cancellationToken).ConfigureAwait(false);
        if (folder is null)
        {
            return await _audit.AuditDenialAsync(
                actionFor(approve),
                ResourceTypes.DigitalFolder,
                userId.ToString(),
                Result<FolderEntryView>.Failure(IdentityErrors.FolderNotFound),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        var entry = folder.FindEntry(entryId);
        if (entry is null)
        {
            return await _audit.AuditDenialAsync(
                actionFor(approve),
                ResourceTypes.DigitalFolder,
                folder.Id.ToString(),
                Result<FolderEntryView>.Failure(IdentityErrors.FolderEntryNotFound(entryId)),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        // A refusal must say why. A rejected entry stays visible in the dossier, and an unexplained rejection
        // is indistinguishable from a bug to whoever has to fix it, so the reason is required rather than
        // optional in the same way it is on the document review.
        var decision = approve
            ? entry.Approve(reviewerId, _clock.UtcNow, notes)
            : entry.Reject(reviewerId, _clock.UtcNow, Guard.AgainstNullOrWhiteSpace(notes ?? string.Empty));

        if (decision.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                actionFor(approve),
                ResourceTypes.DigitalFolder,
                folder.Id.ToString(),
                Result<FolderEntryView>.Failure(decision.FirstError),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        await _audit.RecordSuccessAsync(
            actionFor(approve),
            ResourceTypes.DigitalFolder,
            folder.Id.ToString(),
            new Dictionary<string, string?>
            {
                ["entryId"] = entry.Id.ToString(),
                ["reviewStatus"] = entry.ReviewStatus.ToString()
            },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result<FolderEntryView>.Success(new FolderEntryView(
            entry.Id,
            entry.Category.ToString(),
            entry.Title,
            entry.Description,
            entry.Version,
            entry.ReviewStatus.ToString(),
            entry.ReviewedAt,
            entry.ReviewNotes,
            entry.IdentityDocumentId,
            null,
            null,
            null));
    }

    /// <summary>
    /// The caller's tenant, taken from the audited principal rather than from any argument.
    /// </summary>
    /// <remarks>
    /// No public method takes a <see cref="TenantScope"/>, for the reason <see cref="DocumentService"/> gives:
    /// a dossier is private to one organization, and a route that could name another one would make a folder
    /// readable across the platform boundary it exists to keep.
    /// </remarks>
    private Result<TenantScope> ResolveScope()
        => _audit.Scope.IsEmpty
            ? Result<TenantScope>.Failure(IdentityErrors.OutsideTenant)
            : Result<TenantScope>.Success(_audit.Scope);

    private static string actionFor(bool approve)
        => approve ? DocumentAuditActions.FolderApproveEntry : DocumentAuditActions.FolderRejectEntry;

    /// <summary>
    /// Projects a folder onto the wire shape.
    /// </summary>
    /// <remarks>
    /// The preview link is issued per page of the first document and expires. That is the only way bytes leave
    /// this service: a dossier screen shows a picture of a national ID card, and it gets there through a link
    /// that stops working within minutes, issued to a caller who already passed the tenant and permission
    /// checks for this folder.
    /// </remarks>
    private async Task<DigitalFolderView> ProjectAsync(
        DigitalFolder folder,
        bool includePreviewLinks,
        CancellationToken cancellationToken)
    {
        var entries = new List<FolderEntryView>(folder.Documents.Count);

        foreach (var entry in folder.Documents
                     .Where(document => document.ReviewStatus != FolderReviewStatus.Rejected)
                     .OrderBy(document => document.Category)
                     .ThenByDescending(document => document.CreatedAtValue))
        {
            Uri? preview = null;
            DateTimeOffset? previewExpires = null;
            string? documentStatus = null;

            if (entry.IdentityDocumentId is { } documentId)
            {
                var document = await _documents.FindByIdAsync(folder.Scope, documentId, cancellationToken).ConfigureAwait(false);
                documentStatus = document?.Status.ToString();

                if (includePreviewLinks && document is not null)
                {
                    var firstPage = document.Pages.MinBy(page => page.PageNumber);
                    if (firstPage is not null)
                    {
                        var link = await _storage
                            .CreateExpiringLinkAsync(firstPage.StorageKey, TimeSpan.FromMinutes(5), cancellationToken)
                            .ConfigureAwait(false);

                        if (link.IsSuccess)
                        {
                            preview = link.Value.Url;
                            previewExpires = link.Value.ExpiresAt;
                        }
                        else
                        {
                            // A missing preview must not lose the entry. The dossier still renders the
                            // document; only the picture is absent, and the reason belongs in the log rather
                            // than in front of an operator who cannot do anything about a disk fault.
                            _logger.LogWarning(
                                "Preview link for entry {EntryId} could not be issued: {ReasonCode}.",
                                entry.Id,
                                link.FirstError.Code);
                        }
                    }
                }
            }

            entries.Add(new FolderEntryView(
                entry.Id,
                entry.Category.ToString(),
                entry.Title,
                entry.Description,
                entry.Version,
                entry.ReviewStatus.ToString(),
                entry.ReviewedAt,
                entry.ReviewNotes,
                entry.IdentityDocumentId,
                documentStatus,
                preview,
                previewExpires));
        }

        var categories = folder.Documents
            .Select(document => document.Category.ToString())
            .Distinct(StringComparer.Ordinal)
            .Order(StringComparer.Ordinal)
            .ToArray();

        return new DigitalFolderView(folder.Id, folder.UserId, [.. categories], entries);
    }
}