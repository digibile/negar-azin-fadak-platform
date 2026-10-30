using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Auditing;
using NegarAzinFadak.Core.Domain;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Identity.Domain.Documents;

namespace NegarAzinFadak.Identity.Domain.Folders;

/// <summary>Review state of a folder entry, independent from the document's own verification state.</summary>
public enum FolderReviewStatus
{
    /// <summary>Not yet reviewed.</summary>
    Pending = 0,

    /// <summary>Reviewed and accepted for the dossier.</summary>
    Approved = 1,

    /// <summary>Reviewed and refused.</summary>
    Rejected = 2
}

/// <summary>
/// One item in a person's digital folder. Entries reference a central identity document wherever one
/// exists, so the same verified national ID is reused across every business module instead of being
/// re-uploaded per module.
/// </summary>
public sealed class DigitalDocument : Entity, IAuditable, IHasConcurrencyStamp
{
    private DigitalDocument()
    {
        Title = string.Empty;
        ConcurrencyStamp = string.Empty;
    }

    internal DigitalDocument(
        Guid id,
        Guid folderId,
        Guid? identityDocumentId,
        DocumentCategory category,
        string title,
        string? description,
        int version,
        FolderReviewStatus reviewStatus,
        DateTimeOffset createdAt)
    {
        AssignId(id);
        FolderId = Guard.AgainstEmpty(folderId);
        IdentityDocumentId = identityDocumentId;
        Category = category;
        Title = Guard.AgainstNullOrWhiteSpace(title);
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        Version = Guard.AgainstNegativeOrZero(version);
        ReviewStatus = reviewStatus;
        CreatedAtValue = createdAt;
        ConcurrencyStamp = Guid.NewGuid().ToString("N");
    }

    public Guid FolderId { get; private set; }

    /// <summary>The central identity document this entry exposes, when it is a document-backed entry.</summary>
    public Guid? IdentityDocumentId { get; private set; }

    public DocumentCategory Category { get; private set; }

    public string Title { get; private set; }

    public string? Description { get; private set; }

    public int Version { get; private set; }

    /// <summary>Identifier of the previous version, so the version chain is navigable.</summary>
    public Guid? PreviousVersionId { get; private set; }

    public FolderReviewStatus ReviewStatus { get; private set; }

    public DateTimeOffset? ReviewedAt { get; private set; }

    public Guid? ReviewedBy { get; private set; }

    public string? ReviewNotes { get; private set; }

    public DateTimeOffset CreatedAtValue { get; private set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTimeOffset? ModifiedAt { get; set; }

    public Guid? ModifiedBy { get; set; }

    public string ConcurrencyStamp { get; set; } = string.Empty;

    /// <summary>Approves the entry after review.</summary>
    public Result Approve(Guid reviewerId, DateTimeOffset at, string? notes)
    {
        if (ReviewStatus == FolderReviewStatus.Approved)
        {
            return Result.Failure(IdentityErrors.FolderEntryAlreadyReviewed);
        }

        ReviewStatus = FolderReviewStatus.Approved;
        ReviewedAt = at;
        ReviewedBy = reviewerId;
        ReviewNotes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        return Result.Success();
    }

    /// <summary>Rejects the entry. Rejected entries remain persisted for audit purposes but are excluded from the visible dossier.</summary>
    public Result Reject(Guid reviewerId, DateTimeOffset at, string reason)
    {
        var justification = Guard.AgainstNullOrWhiteSpace(reason);
        if (ReviewStatus == FolderReviewStatus.Approved)
        {
            return Result.Failure(IdentityErrors.CannotChangeVerifiedDocument);
        }

        ReviewStatus = FolderReviewStatus.Rejected;
        ReviewedAt = at;
        ReviewedBy = reviewerId;
        ReviewNotes = justification;
        return Result.Success();
    }

    /// <summary>Points this entry at the next version of the same document.</summary>
    public void LinkNextVersion(Guid nextVersionId) => PreviousVersionId = Guard.AgainstEmpty(nextVersionId);
}

/// <summary>
/// A person's secure digital folder: the single, categorised, versioned view of everything the platform
/// holds about them. It owns folder membership and review state; the documents themselves stay in the
/// identity document aggregate so that verification state has exactly one home.
/// </summary>
public sealed class DigitalFolder : AggregateRoot, IAuditable, IHasConcurrencyStamp, ITenantScoped
{
    private readonly List<DigitalDocument> _documents = [];

    private DigitalFolder()
    {
        ConcurrencyStamp = string.Empty;
        Scope = TenantScope.None;
    }

    private DigitalFolder(Guid id, Guid userId, TenantScope scope, DateTimeOffset createdAt)
        : base(id)
    {
        UserId = Guard.AgainstEmpty(userId);
        Scope = Guard.AgainstNull(scope);
        CreatedAtValue = createdAt;
        ConcurrencyStamp = Guid.NewGuid().ToString("N");
    }

    /// <summary>Owner of the folder: the central identity, never a module-local surrogate.</summary>
    public Guid UserId { get; private set; }

    public TenantScope Scope { get; private set; } = TenantScope.None;

    public IReadOnlyList<DigitalDocument> Documents => _documents.AsReadOnly();

    public DateTimeOffset CreatedAtValue { get; private set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTimeOffset? ModifiedAt { get; set; }

    public Guid? ModifiedBy { get; set; }

    public string ConcurrencyStamp { get; set; } = string.Empty;

    /// <summary>Creates the folder that accompanies every central identity.</summary>
    public static DigitalFolder CreateFor(Guid userId, TenantScope scope, DateTimeOffset now)
        => new(Guid.NewGuid(), userId, scope, now);

    /// <summary>Adds a document-backed entry that reuses a central identity document.</summary>
    public Result AddDocument(
        Guid identityDocumentId,
        DocumentCategory category,
        string title,
        string? description = null,
        int version = 1)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);

        if (_documents.Any(document => document.IdentityDocumentId == identityDocumentId))
        {
            return Result.Failure(IdentityErrors.FolderEntryExists);
        }

        _documents.Add(new DigitalDocument(
            Guid.NewGuid(),
            Id,
            identityDocumentId,
            category,
            title,
            description,
            version,
            FolderReviewStatus.Pending,
            CreatedAtValue));
        return Result.Success();
    }

    /// <summary>Adds an entry for a file that has no central identity document, e.g. a third-party statement.</summary>
    public Result AddExternalDocument(
        DocumentCategory category,
        string title,
        string? description = null,
        int version = 1)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);

        _documents.Add(new DigitalDocument(
            Guid.NewGuid(),
            Id,
            null,
            category,
            title,
            description,
            version,
            FolderReviewStatus.Pending,
            CreatedAtValue));
        return Result.Success();
    }

    /// <summary>Returns the entry with the given identifier when it belongs to this folder.</summary>
    public DigitalDocument? FindEntry(Guid entryId)
        => _documents.FirstOrDefault(document => document.Id == entryId);

    /// <summary>Number of entries in a category, used for the folder summary in the dossier.</summary>
    public int CountIn(DocumentCategory category)
        => _documents.Count(document => document.Category == category);

    /// <summary>Entries in a category, newest first.</summary>
    public IReadOnlyList<DigitalDocument> InCategory(DocumentCategory category)
        => _documents.Where(document => document.Category == category)
            .OrderByDescending(document => document.CreatedAtValue)
            .ToList()
            .AsReadOnly();
}
