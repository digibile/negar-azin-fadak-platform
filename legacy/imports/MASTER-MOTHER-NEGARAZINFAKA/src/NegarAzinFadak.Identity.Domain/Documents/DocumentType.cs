using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Auditing;
using NegarAzinFadak.Core.Domain;
using NegarAzinFadak.Core.Results;

namespace NegarAzinFadak.Identity.Domain.Documents;

/// <summary>Where a page belongs within a multi-sided identity document.</summary>
public enum DocumentSide
{
    /// <summary>Front side, e.g. the portrait side of a national ID card.</summary>
    Front = 0,

    /// <summary>Back side, e.g. the terms and conditions side.</summary>
    Back = 1,

    /// <summary>A page of a multi-page document that has no front/back semantics.</summary>
    Page = 2,

    /// <summary>A signature or stamp page.</summary>
    Attachment = 3
}

/// <summary>Where a document lives in the person's digital folder.</summary>
public enum DocumentCategory
{
    /// <summary>Identity documents: national ID, passport, driving licence, birth certificate.</summary>
    Identity = 0,

    /// <summary>Bank documents: statements, cheques, ownership cards.</summary>
    Bank = 1,

    /// <summary>Financial documents: payslips, tax records, investment statements.</summary>
    Financial = 2,

    /// <summary>Employment documents: employment contract, experience letters.</summary>
    Employment = 3,

    /// <summary>Guarantee documents: guarantee letters, collateral ownership.</summary>
    Guarantee = 4,

    /// <summary>Contracts signed by the person.</summary>
    Contract = 5,

    /// <summary>Invoices issued to or by the person.</summary>
    Invoice = 6,

    /// <summary>Receipts.</summary>
    Receipt = 7,

    /// <summary>Loan and financing files.</summary>
    Loan = 8,

    /// <summary>Anything not fitting the categories above.</summary>
    Other = 9
}

/// <summary>Verification state of a logical document. OCR output starts at <see cref="PendingVerification"/>.</summary>
public enum DocumentStatus
{
    /// <summary>OCR produced values, nothing has been confirmed or checked yet.</summary>
    Extracted = 0,

    /// <summary>Awaiting user confirmation or reviewer decision. Never usable as master data.</summary>
    PendingVerification = 1,

    /// <summary>Cross-checks passed and the document is trusted for authorised business use.</summary>
    Verified = 2,

    /// <summary>Refused: unreadable, tampered, or contradictory.</summary>
    Rejected = 3,

    /// <summary>Ambiguous; a human decision is required.</summary>
    NeedsReview = 4,

    /// <summary>Nothing has been extracted or submitted yet.</summary>
    Unverified = 5,

    /// <summary>Verified once, now past its expiry date and therefore no longer usable.</summary>
    Expired = 6
}

/// <summary>How a document's identity was proven. Values are configuration, not hard-coded switches.</summary>
public enum VerificationMethod
{
    /// <summary>Nothing beyond the document image.</summary>
    DocumentReview = 0,

    /// <summary>Fields matched against the person's other verified documents and profile.</summary>
    IdentityInformationMatch = 1,

    /// <summary>Mobile ownership match, e.g. the mobile printed on the document.</summary>
    MobileOwnershipMatch = 2,

    /// <summary>Bank account or card ownership match.</summary>
    BankAccountMatch = 3,

    /// <summary>Liveness / face-to-document match.</summary>
    FaceMatch = 4,

    /// <summary>Match against an external authoritative identity provider.</summary>
    ExternalProvider = 5
}

/// <summary>
/// A configurable document type. Document kinds, required sides, default validity and the folder
/// category they belong to are data, so the platform can add a document type without a deployment.
/// </summary>
public sealed class DocumentType : Entity, IAuditable, IHasConcurrencyStamp
{
    private DocumentType()
    {
        Code = string.Empty;
        Title = string.Empty;
        TitlePersian = string.Empty;
        ConcurrencyStamp = string.Empty;
    }

    public DocumentType(
        Guid id,
        string code,
        string title,
        string titlePersian,
        DocumentCategory category,
        bool requiresBackSide = false,
        int? defaultValidityDays = null,
        bool isIdentityDocument = false,
        string? providerTemplate = null,
        int maxPages = 1)
    {
        AssignId(id);
        Code = Guard.AgainstNullOrWhiteSpace(code).Trim().ToUpperInvariant();
        Title = Guard.AgainstNullOrWhiteSpace(title).Trim();
        TitlePersian = Guard.AgainstNullOrWhiteSpace(titlePersian).Trim();
        Category = category;
        RequiresBackSide = requiresBackSide;
        DefaultValidityDays = defaultValidityDays;
        IsIdentityDocument = isIdentityDocument;
        ProviderTemplate = string.IsNullOrWhiteSpace(providerTemplate) ? null : providerTemplate.Trim();
        MaxPages = Guard.AgainstNegativeOrZero(maxPages);
        IsActive = true;
        ConcurrencyStamp = Guid.NewGuid().ToString("N");
    }

    /// <summary>Stable data-driven code, e.g. <c>national_id</c>.</summary>
    public string Code { get; private set; }

    public string Title { get; private set; }

    /// <summary>Persian display title; the platform is Persian-first, so it is mandatory rather than optional.</summary>
    public string TitlePersian { get; private set; }

    public DocumentCategory Category { get; private set; }

    /// <summary>True when the document only counts once both sides have been captured and reviewed.</summary>
    public bool RequiresBackSide { get; private set; }

    /// <summary>Validity period applied when the document is issued, or <see langword="null"/> when it never expires.</summary>
    public int? DefaultValidityDays { get; private set; }

    /// <summary>True for documents that establish identity and may back an identity verification.</summary>
    public bool IsIdentityDocument { get; private set; }

    /// <summary>Template hint for the OCR provider, configurable per provider.</summary>
    public string? ProviderTemplate { get; private set; }

    public int MaxPages { get; private set; }

    public bool IsActive { get; private set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTimeOffset? ModifiedAt { get; set; }

    public Guid? ModifiedBy { get; set; }

    public string ConcurrencyStamp { get; set; } = string.Empty;

    /// <summary>Deactivates a document type so it can no longer be used for new submissions.</summary>
    public void Deactivate() => IsActive = false;

    /// <summary>Reactivates a previously deactivated document type.</summary>
    public void Activate() => IsActive = true;

    /// <summary>Expiry date a document of this type receives when issued on <paramref name="issuedOn"/>.</summary>
    public DateOnly? ComputeExpiryDate(DateOnly issuedOn)
    {
        Guard.AgainstDefault(issuedOn);
        return DefaultValidityDays.HasValue
            ? issuedOn.AddDays(DefaultValidityDays.Value)
            : null;
    }
}
