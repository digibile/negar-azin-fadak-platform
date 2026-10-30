using System.Text.Json;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Auditing;
using NegarAzinFadak.Core.Domain;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Identity.Domain.Users;

namespace NegarAzinFadak.Identity.Domain.Documents;

/// <summary>
/// Image-quality verdict for one captured page. Poor quality is refused at the door with guidance,
/// because a blurry capture that reaches OCR produces plausible but wrong identity data.
/// </summary>
public sealed class DocumentCaptureQuality : ValueObject
{
    public DocumentCaptureQuality(
        double sharpness,
        double brightness,
        double contrast,
        bool documentFullyVisible,
        bool perspectiveAcceptable,
        bool glareDetected)
    {
        Sharpness = Clamp(sharpness);
        Brightness = Clamp(brightness);
        Contrast = Clamp(contrast);
        DocumentFullyVisible = documentFullyVisible;
        PerspectiveAcceptable = perspectiveAcceptable;
        GlareDetected = glareDetected;
    }

    /// <summary>Sharpness score in the 0..1 range; below the threshold the page is unusable.</summary>
    public double Sharpness { get; }

    /// <summary>Brightness score in the 0..1 range.</summary>
    public double Brightness { get; }

    /// <summary>Contrast score in the 0..1 range.</summary>
    public double Contrast { get; }

    /// <summary>True when all four document edges were detected inside the frame.</summary>
    public bool DocumentFullyVisible { get; }

    /// <summary>True when the skew angle is within the acceptable range.</summary>
    public bool PerspectiveAcceptable { get; }

    public bool GlareDetected { get; }

    /// <summary>Weighted overall score used to decide between accept and retake.</summary>
    public double OverallScore =>
        (Sharpness * 0.4) + (Brightness * 0.2) + (Contrast * 0.2)
        + (DocumentFullyVisible ? 0.1 : 0) + (PerspectiveAcceptable ? 0.1 : 0);

    /// <summary>Human-readable reasons the capture was refused, in Persian for the mobile client.</summary>
    public IReadOnlyList<string> GetIssues(double minimumScore, double minimumSharpness)
    {
        var issues = new List<string>();

        if (Sharpness < minimumSharpness)
        {
            issues.Add("تصویر تار است؛ لطفاً گوشی را ثابت نگه دارید و دوباره عکس بگیرید.");
        }

        if (Brightness < 0.25d)
        {
            issues.Add("نور کافی نیست؛ تصویر در محیط روشن‌تری گرفته شود.");
        }

        else if (Brightness > 0.9d)
        {
            issues.Add("نور بیش از حد است؛ انعکاس روی کارت دیده می‌شود.");
        }

        if (Contrast < 0.2d)
        {
            issues.Add("کنتراست تصویر کافی نیست؛ پس‌زمینه را ساده‌تر کنید.");
        }

        if (!DocumentFullyVisible)
        {
            issues.Add("تمام کارت در کادر دیده نمی‌شود؛ هر چهار گوشه باید داخل تصویر باشد.");
        }

        if (!PerspectiveAcceptable)
        {
            issues.Add("تصویر از زاویه گرفته شده است؛ گوشی را موازی کارت نگه دارید.");
        }

        if (GlareDetected)
        {
            issues.Add("بازتاب نور روی کارت دیده می‌شود؛ زاویه نور را تغییر دهید.");
        }

        if (issues.Count == 0 && OverallScore < minimumScore)
        {
            issues.Add("کیفیت تصویر برای پردازش کافی نیست؛ لطفاً دوباره عکس بگیرید.");
        }

        return issues;
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Sharpness;
        yield return Brightness;
        yield return Contrast;
        yield return DocumentFullyVisible;
        yield return PerspectiveAcceptable;
        yield return GlareDetected;
    }

    private static double Clamp(double value) => Math.Clamp(double.IsNaN(value) ? 0d : value, 0d, 1d);
}

/// <summary>One physical page of a logical document, stored outside the web root and referenced by key.</summary>
public sealed class DocumentPage : Entity
{
    private DocumentPage()
    {
        StorageKey = string.Empty;
        ContentType = string.Empty;
        Sha256Hash = string.Empty;
    }

    internal DocumentPage(
        Guid id,
        Guid documentId,
        int pageNumber,
        DocumentSide side,
        string storageKey,
        string contentType,
        long sizeInBytes,
        string sha256Hash,
        DateTimeOffset uploadedAt)
    {
        AssignId(id);
        DocumentId = Guard.AgainstEmpty(documentId);
        PageNumber = Guard.AgainstNegativeOrZero(pageNumber);
        Side = side;
        StorageKey = Guard.AgainstNullOrWhiteSpace(storageKey);
        ContentType = Guard.AgainstNullOrWhiteSpace(contentType);
        SizeInBytes = sizeInBytes < 0
            ? throw new ArgumentOutOfRangeException(nameof(sizeInBytes), sizeInBytes, "Size must not be negative.")
            : sizeInBytes;
        Sha256Hash = Guard.AgainstNullOrWhiteSpace(sha256Hash);
        UploadedAt = uploadedAt;
    }

    public Guid DocumentId { get; private set; }

    /// <summary>One-based page number. Front and back of a card are pages 1 and 2 of the same logical document.</summary>
    public int PageNumber { get; private set; }

    public DocumentSide Side { get; private set; }

    /// <summary>
    /// Opaque key inside private storage. There is no public URL for this: bytes are served only by the
    /// authorized, audited, expiring document endpoint.
    /// </summary>
    public string StorageKey { get; private set; }

    public string ContentType { get; private set; }

    public long SizeInBytes { get; private set; }

    /// <summary>SHA-256 of the bytes, used to deduplicate uploads and prove the file was not swapped.</summary>
    public string Sha256Hash { get; private set; }

    public DateTimeOffset UploadedAt { get; private set; }

    public DocumentCaptureQuality? Quality { get; private set; }

    /// <summary>Records the quality verdict of this page.</summary>
    public void RecordQuality(DocumentCaptureQuality quality) => Quality = Guard.AgainstNull(quality);
}

/// <summary>Fields an OCR provider reported for one page, before normalisation.</summary>
public sealed class DocumentExtraction : Entity
{
    private DocumentExtraction()
    {
        Provider = string.Empty;
        RawText = string.Empty;
        RawFields = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
    }

    internal DocumentExtraction(
        Guid id,
        Guid documentId,
        Guid? pageId,
        string provider,
        string? template,
        string rawText,
        IReadOnlyDictionary<string, string?> rawFields,
        DateTimeOffset extractedAt,
        decimal confidence)
    {
        AssignId(id);
        DocumentId = Guard.AgainstEmpty(documentId);
        PageId = pageId;
        Provider = Guard.AgainstNullOrWhiteSpace(provider);
        Template = string.IsNullOrWhiteSpace(template) ? null : template.Trim();
        RawText = rawText ?? string.Empty;
        RawFields = new Dictionary<string, string?>(rawFields, StringComparer.OrdinalIgnoreCase);
        ExtractedAt = extractedAt;
        Confidence = Math.Clamp(confidence, 0m, 1m);
    }

    public Guid DocumentId { get; private set; }

    public Guid? PageId { get; private set; }

    /// <summary>Identifier of the OCR provider that produced this result, kept for quality analysis.</summary>
    public string Provider { get; private set; }

    public string? Template { get; private set; }

    public string RawText { get; private set; }

    /// <summary>Raw provider output keyed by field name. Serialised to JSON in the store.</summary>
    public IReadOnlyDictionary<string, string?> RawFields { get; private set; }
        = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);

    public DateTimeOffset ExtractedAt { get; private set; }

    /// <summary>Provider-reported confidence in the 0..1 range.</summary>
    public decimal Confidence { get; private set; }

    /// <summary>Serialised raw fields, used by the review UI and by provider-quality reporting.</summary>
    public string RawFieldsJson => JsonSerializer.Serialize(RawFields);
}

/// <summary>Outcome of a verification decision, with the evidence that supported it.</summary>
public sealed class DocumentVerification : Entity, IAuditable
{
    private DocumentVerification()
    {
        Method = VerificationMethod.DocumentReview;
        Notes = null;
    }

    internal DocumentVerification(
        Guid id,
        Guid documentId,
        DocumentStatus decision,
        VerificationMethod method,
        Guid? reviewerId,
        string? notes,
        DateTimeOffset decidedAt,
        decimal? confidence = null)
    {
        AssignId(id);
        DocumentId = Guard.AgainstEmpty(documentId);
        Decision = decision;
        Method = method;
        ReviewerId = reviewerId;
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        DecidedAt = decidedAt;
        Confidence = confidence;
    }

    public Guid DocumentId { get; private set; }

    /// <summary>The state the document was moved to by this decision.</summary>
    public DocumentStatus Decision { get; private set; }

    public VerificationMethod Method { get; private set; }

    /// <summary>Null for automated decisions, set for human review.</summary>
    public Guid? ReviewerId { get; private set; }

    public string? Notes { get; private set; }

    public DateTimeOffset DecidedAt { get; private set; }

    /// <summary>Confidence backing an automated decision, when one was computed.</summary>
    public decimal? Confidence { get; private set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTimeOffset? ModifiedAt { get; set; }

    public Guid? ModifiedBy { get; set; }
}

/// <summary>
/// One logical identity document. The front and back of a national ID, or the several pages of a birth
/// certificate, are pages of this single aggregate — never separate documents — so that verification,
/// versioning and downstream references stay coherent.
/// </summary>
public sealed class IdentityDocument : AggregateRoot, IAuditable, IHasConcurrencyStamp, ITenantScoped
{
    private readonly List<DocumentPage> _pages = [];
    private readonly List<DocumentExtraction> _extractions = [];
    private readonly List<DocumentVerification> _verifications = [];
    private readonly Dictionary<IdentityField, string?> _normalizedFields = [];

    private IdentityDocument()
    {
        ConcurrencyStamp = string.Empty;
        Status = DocumentStatus.Unverified;
        Scope = TenantScope.None;
    }

    private IdentityDocument(
        Guid id,
        Guid userId,
        Guid documentTypeId,
        TenantScope scope,
        string? referenceNumber)
        : base(id)
    {
        UserId = Guard.AgainstEmpty(userId);
        DocumentTypeId = Guard.AgainstEmpty(documentTypeId);
        Scope = Guard.AgainstNull(scope);
        ReferenceNumber = string.IsNullOrWhiteSpace(referenceNumber) ? null : referenceNumber.Trim();
        Status = DocumentStatus.Unverified;
        Version = 1;
        ConcurrencyStamp = Guid.NewGuid().ToString("N");
    }

    /// <summary>Owner of the document: the central identity it belongs to.</summary>
    public Guid UserId { get; private set; }

    public Guid DocumentTypeId { get; private set; }

    /// <summary>Tenant coordinates, so document queries are isolated exactly like business data.</summary>
    public TenantScope Scope { get; private set; } = TenantScope.None;

    /// <summary>Document number as printed on the document, when it has one.</summary>
    public string? ReferenceNumber { get; private set; }

    public DocumentStatus Status { get; private set; }

    /// <summary>Version number; superseded documents are kept for audit and never overwritten.</summary>
    public int Version { get; private set; }

    public Guid? SupersededByDocumentId { get; private set; }

    /// <summary>Date the document was issued, as printed on it.</summary>
    public DateOnly? IssuedOn { get; private set; }

    /// <summary>Date the document expires. Drives the expiry alerts and the "is it valid" checks.</summary>
    public DateOnly? ExpiresOn { get; private set; }

    public DateTimeOffset? VerifiedAt { get; private set; }

    public Guid? VerifiedBy { get; private set; }

    public VerificationMethod? VerificationMethod { get; private set; }

    public IReadOnlyList<DocumentPage> Pages => _pages.AsReadOnly();

    public IReadOnlyList<DocumentExtraction> Extractions => _extractions.AsReadOnly();

    public IReadOnlyList<DocumentVerification> Verifications => _verifications.AsReadOnly();

    /// <summary>Fields after normalisation, keyed by <see cref="IdentityField"/>.</summary>
    public IReadOnlyDictionary<IdentityField, string?> NormalizedFields => _normalizedFields;

    public DateTimeOffset CreatedAt { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTimeOffset? ModifiedAt { get; set; }

    public Guid? ModifiedBy { get; set; }

    public string ConcurrencyStamp { get; set; } = string.Empty;

    /// <summary>Starts a new logical document for a person.</summary>
    public static IdentityDocument Create(
        Guid id,
        Guid userId,
        Guid documentTypeId,
        TenantScope scope,
        string? referenceNumber = null)
        => new(id, userId, documentTypeId, scope, referenceNumber);

    /// <summary>Records the issue and expiry dates found on the document.</summary>
    public Result SetValidity(DateOnly? issuedOn, DateOnly? expiresOn)
    {
        if (issuedOn.HasValue && expiresOn.HasValue && expiresOn < issuedOn)
        {
            return Result.Failure(IdentityErrors.DocumentValidityInvalid);
        }

        IssuedOn = issuedOn;
        ExpiresOn = expiresOn;
        return Result.Success();
    }

    /// <summary>
    /// Adds a captured page. The front and back of a card are two pages of this document; a multi-page
    /// certificate is several pages of one document.
    /// </summary>
    public Result AddPage(
        Guid pageId,
        int pageNumber,
        DocumentSide side,
        string storageKey,
        string contentType,
        long sizeInBytes,
        string sha256Hash,
        DocumentCaptureQuality? quality,
        DateTimeOffset uploadedAt)
    {
        if (_pages.Any(page => page.PageNumber == pageNumber))
        {
            return Result.Failure(IdentityErrors.DocumentPageAlreadyExists(pageNumber));
        }

        if (side is DocumentSide.Front && _pages.Any(page => page.Side == DocumentSide.Front))
        {
            return Result.Failure(IdentityErrors.DocumentSideAlreadyExists(side.ToString()));
        }

        if (side is DocumentSide.Back && _pages.Any(page => page.Side == DocumentSide.Back))
        {
            return Result.Failure(IdentityErrors.DocumentSideAlreadyExists(side.ToString()));
        }

        var page = new DocumentPage(
            pageId,
            Id,
            pageNumber,
            side,
            storageKey,
            contentType,
            sizeInBytes,
            sha256Hash,
            uploadedAt);

        if (quality is not null)
        {
            page.RecordQuality(quality);
        }

        _pages.Add(page);
        return Result.Success();
    }

    /// <summary>Replaces the page for a given side, used when the user is asked to retake a poor capture.</summary>
    public Result ReplacePage(
        DocumentSide side,
        Guid pageId,
        int pageNumber,
        string storageKey,
        string contentType,
        long sizeInBytes,
        string sha256Hash,
        DocumentCaptureQuality quality,
        DateTimeOffset uploadedAt)
    {
        if (quality.OverallScore < 0.35d)
        {
            return Result.Failure(IdentityErrors.CaptureQualityInsufficient(quality.GetIssues(0.5d, 0.4d).ToArray()));
        }

        var existingIndex = _pages.FindIndex(page => page.Side == side);
        if (existingIndex < 0)
        {
            return AddPage(pageId, pageNumber, side, storageKey, contentType, sizeInBytes, sha256Hash, quality, uploadedAt);
        }

        var replacement = new DocumentPage(
            pageId,
            Id,
            pageNumber,
            side,
            storageKey,
            contentType,
            sizeInBytes,
            sha256Hash,
            uploadedAt);

        replacement.RecordQuality(quality);
        _pages[existingIndex] = replacement;
        return Result.Success();
    }

    /// <summary>True when a page of the given side has been captured.</summary>
    public bool HasSide(DocumentSide side) => _pages.Any(page => page.Side == side);

    /// <summary>Records raw OCR output for a page.</summary>
    public Result RecordExtraction(
        Guid extractionId,
        Guid? pageId,
        string provider,
        string? template,
        string rawText,
        IReadOnlyDictionary<string, string?> rawFields,
        DateTimeOffset extractedAt,
        decimal confidence)
    {
        if (Status == DocumentStatus.Verified)
        {
            return Result.Failure(IdentityErrors.DocumentAlreadyVerified);
        }

        _extractions.Add(new DocumentExtraction(
            extractionId,
            Id,
            pageId,
            provider,
            template,
            rawText,
            rawFields,
            extractedAt,
            confidence));

        if (Status == DocumentStatus.Unverified)
        {
            Status = DocumentStatus.Extracted;
        }

        return Result.Success();
    }

    /// <summary>
    /// Stores the normalised values produced by the normalisation step. The document stays
    /// <see cref="DocumentStatus.PendingVerification"/>: normalisation is not verification.
    /// </summary>
    public Result ApplyNormalizedFields(IReadOnlyDictionary<IdentityField, string?> fields)
    {
        ArgumentNullException.ThrowIfNull(fields);

        if (Status == DocumentStatus.Verified)
        {
            return Result.Failure(IdentityErrors.DocumentAlreadyVerified);
        }

        foreach (var (field, value) in fields)
        {
            _normalizedFields[field] = value;
        }

        Status = DocumentStatus.PendingVerification;
        return Result.Success();
    }

    /// <summary>
    /// Marks the document as verified. Requires every mandatory side to be present, which is what
    /// stops a one-sided capture from being trusted.
    /// </summary>
    public Result Verify(bool requiresBackSide, DateTimeOffset verifiedAt, Guid? reviewerId, VerificationMethod method, string? notes, IClock clock)
    {
        ArgumentNullException.ThrowIfNull(clock);

        if (Status == DocumentStatus.Verified)
        {
            return Result.Failure(IdentityErrors.DocumentAlreadyVerified);
        }

        if (_pages.Count == 0)
        {
            return Result.Failure(IdentityErrors.DocumentHasNoPages);
        }

        if (requiresBackSide && !HasSide(DocumentSide.Back))
        {
            return Result.Failure(IdentityErrors.DocumentSideMissing(nameof(DocumentSide.Back)));
        }

        if (ExpiresOn.HasValue && ExpiresOn.Value < clock.Today)
        {
            return Result.Failure(IdentityErrors.DocumentExpired);
        }

        Status = DocumentStatus.Verified;
        VerifiedAt = verifiedAt;
        VerifiedBy = reviewerId;
        VerificationMethod = method;
        _verifications.Add(new DocumentVerification(
            Guid.NewGuid(),
            Id,
            DocumentStatus.Verified,
            method,
            reviewerId,
            notes,
            verifiedAt));
        return Result.Success();
    }

    /// <summary>Rejects the document, recording the reason for the audit trail.</summary>
    public Result Reject(string reason, DateTimeOffset at, Guid? reviewerId, VerificationMethod method)
    {
        var justification = Guard.AgainstNullOrWhiteSpace(reason);
        if (Status == DocumentStatus.Verified)
        {
            return Result.Failure(IdentityErrors.CannotChangeVerifiedDocument);
        }

        Status = DocumentStatus.Rejected;
        VerifiedAt = null;
        VerifiedBy = null;
        VerificationMethod = method;
        _verifications.Add(new DocumentVerification(
            Guid.NewGuid(),
            Id,
            DocumentStatus.Rejected,
            method,
            reviewerId,
            justification,
            at));
        return Result.Success();
    }

    /// <summary>Flags the document for human review without changing the data.</summary>
    public Result FlagForReview(string? reason, DateTimeOffset at, VerificationMethod method)
    {
        if (Status == DocumentStatus.Verified)
        {
            return Result.Failure(IdentityErrors.CannotChangeVerifiedDocument);
        }

        Status = DocumentStatus.NeedsReview;
        VerificationMethod = method;
        _verifications.Add(new DocumentVerification(
            Guid.NewGuid(),
            Id,
            DocumentStatus.NeedsReview,
            method,
            null,
            reason,
            at));
        return Result.Success();
    }

    /// <summary>
    /// Evaluates expiry against the current date. Called by the daily expiry sweep and before any
    /// workflow that requires a currently valid document.
    /// </summary>
    public bool RefreshExpiry(DateOnly today)
    {
        if (Status != DocumentStatus.Verified)
        {
            return false;
        }

        if (!ExpiresOn.HasValue || ExpiresOn.Value >= today)
        {
            return false;
        }

        Status = DocumentStatus.Expired;
        return true;
    }

    /// <summary>True when the document is verified and not past its expiry date.</summary>
    public bool IsCurrentlyValid(DateOnly today)
        => Status == DocumentStatus.Verified && (!ExpiresOn.HasValue || ExpiresOn.Value >= today);

    /// <summary>True when the document expires within the given window, used for expiry alerts.</summary>
    public bool IsExpiringWithin(DateOnly today, int days)
    {
        Guard.AgainstNegative(days);
        return Status == DocumentStatus.Verified
            && ExpiresOn.HasValue
            && ExpiresOn.Value >= today
            && ExpiresOn.Value <= today.AddDays(days);
    }

    /// <summary>Links this document to the one that replaced it.</summary>
    public void MarkSupersededBy(Guid newerDocumentId) => SupersededByDocumentId = Guard.AgainstEmpty(newerDocumentId);

    /// <summary>Updates the page count reference and raises a new version when replaced.</summary>
    public void MarkSuperseded(Guid newerDocumentId)
    {
        MarkSupersededBy(newerDocumentId);
        Status = DocumentStatus.Expired;
    }
}
