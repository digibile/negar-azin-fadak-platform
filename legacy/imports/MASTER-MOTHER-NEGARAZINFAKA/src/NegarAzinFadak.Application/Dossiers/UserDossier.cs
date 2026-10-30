using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Identity.Domain.Activities;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Identity.Domain.Documents;
using NegarAzinFadak.Identity.Domain.Folders;
using NegarAzinFadak.Identity.Domain.Users;

namespace NegarAzinFadak.Application.Dossiers;

/// <summary>Identity section of the dossier.</summary>
/// <param name="UserId">Central identity identifier.</param>
/// <param name="Status">Lifecycle status of the identity.</param>
/// <param name="MaskedMobile">Masked mobile, never the full number in a list or report.</param>
/// <param name="IsMobileVerified">True when mobile ownership was proven.</param>
/// <param name="IsIdentityVerified">True when strong identity verification completed.</param>
/// <param name="VerificationStatus">Master profile verification state.</param>
/// <param name="Fields">Attribute-by-attribute values with their provenance.</param>
public sealed record DossierIdentity(
    Guid UserId,
    UserStatus Status,
    string MaskedMobile,
    bool IsMobileVerified,
    bool IsIdentityVerified,
    IdentityVerificationStatus VerificationStatus,
    IReadOnlyList<DossierField> Fields);

/// <summary>One identity attribute with the provenance of its value.</summary>
/// <param name="Field">Attribute name.</param>
/// <param name="Value">Current value, or <see langword="null"/> when unset.</param>
/// <param name="Provenance">How the value got there; OCR output is visibly distinct from verified data.</param>
public sealed record DossierField(IdentityField Field, string? Value, FieldProvenance Provenance);

/// <summary>One document in the dossier, with the state a support agent needs to act.</summary>
/// <param name="DocumentId">Identity document identifier.</param>
/// <param name="DocumentTypeCode">Data-driven type code.</param>
/// <param name="TitlePersian">Persian title of the document type.</param>
/// <param name="Status">Verification state.</param>
/// <param name="Category">Folder category.</param>
/// <param name="IssuedOn">Issue date, when printed on the document.</param>
/// <param name="ExpiresOn">Expiry date, when the document expires.</param>
/// <param name="IsCurrentlyValid">True when verified and not expired as of today.</param>
/// <param name="PageCount">Number of captured pages.</param>
/// <param name="IsExpiringSoon">True when it expires inside the configured warning window.</param>
public sealed record DossierDocument(
    Guid DocumentId,
    string DocumentTypeCode,
    string TitlePersian,
    DocumentStatus Status,
    DocumentCategory Category,
    DateOnly? IssuedOn,
    DateOnly? ExpiresOn,
    bool IsCurrentlyValid,
    int PageCount,
    bool IsExpiringSoon);

/// <summary>Bank account summary; the account number is masked.</summary>
/// <param name="AccountId">Bank account identifier.</param>
/// <param name="BankCode">Data-driven bank code.</param>
/// <param name="MaskedIban">Masked IBAN.</param>
/// <param name="IsVerified">True when ownership was proven.</param>
/// <param name="Ownership">Ownership relative to the identity.</param>
public sealed record DossierBankAccount(
    Guid AccountId,
    string BankCode,
    string MaskedIban,
    bool IsVerified,
    AccountOwnership Ownership);

/// <summary>Dossier summary counters used by dashboards and list views.</summary>
/// <param name="DocumentCount">Total documents on file.</param>
/// <param name="VerifiedDocumentCount">Documents currently trusted.</param>
/// <param name="ExpiringDocumentCount">Documents expiring inside the warning window.</param>
/// <param name="PendingReviewCount">Documents awaiting a reviewer decision.</param>
/// <param name="TimelineEventCount">Number of recorded events.</param>
public sealed record DossierSummary(
    int DocumentCount,
    int VerifiedDocumentCount,
    int ExpiringDocumentCount,
    int PendingReviewCount,
    int TimelineEventCount);

/// <summary>
/// The comprehensive user dossier. Every section is assembled from real records; nothing here is
/// generated for display, and any module that produces business data contributes to the same view
/// through the central user identifier.
/// </summary>
public sealed record UserDossier(
    DossierIdentity Identity,
    IReadOnlyList<DossierDocument> Documents,
    IReadOnlyList<DossierBankAccount> BankAccounts,
    IReadOnlyList<UserAddress> Addresses,
    IReadOnlyList<UserContact> Contacts,
    IReadOnlyList<UserEvent> Timeline,
    DossierSummary Summary)
{
    /// <summary>Timeline entries, most recent first.</summary>
    public IReadOnlyList<UserEvent> RecentEvents(int take)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(take);
        return Timeline.Take(take).ToList().AsReadOnly();
    }

    /// <summary>Documents that need attention: unverified, under review, rejected or expiring.</summary>
    public IReadOnlyList<DossierDocument> DocumentsRequiringAttention
        => Documents.Where(document =>
            document.Status is not (DocumentStatus.Verified or DocumentStatus.Expired)
            || document.IsExpiringSoon).ToList().AsReadOnly();
}

/// <summary>Everything the dossier needs, gathered by a single tenant-scoped read.</summary>
/// <param name="User">The central identity.</param>
/// <param name="Documents">Identity documents with their types.</param>
/// <param name="DocumentTypes">Document types referenced by the documents, for titles and categories.</param>
/// <param name="Events">Timeline events.</param>
/// <param name="Today">Current date, used for validity and expiry decisions.</param>
public sealed record DossierSource(
    User User,
    IReadOnlyList<IdentityDocument> Documents,
    IReadOnlyList<DocumentType> DocumentTypes,
    IReadOnlyList<UserEvent> Events,
    DateOnly Today);

/// <summary>Builds the dossier from gathered data. Pure, so it is exhaustively testable and cannot bypass authorization.</summary>
public static class UserDossierBuilder
{
    /// <summary>Reads every identity attribute of a profile in the shape the cross-checker and UI expect.</summary>
    public static IReadOnlyDictionary<IdentityField, string?> ProfileFields(IdentityProfile? profile)
    {
        var fields = new Dictionary<IdentityField, string?>();
        if (profile is null)
        {
            return fields;
        }

        foreach (IdentityField field in Enum.GetValues<IdentityField>())
        {
            fields[field] = profile.ReadValue(field);
        }

        return fields;
    }
    /// <summary>Assembles the dossier.</summary>
    /// <param name="source">Tenant-scoped data gathered by the caller.</param>
    /// <param name="expiryWarningDays">Window inside which a document counts as expiring soon.</param>
    public static UserDossier Build(DossierSource source, int expiryWarningDays)
    {
        ArgumentNullException.ThrowIfNull(source);
        ArgumentOutOfRangeException.ThrowIfNegative(expiryWarningDays);

        var typeById = source.DocumentTypes.ToDictionary(type => type.Id);
        var identity = BuildIdentity(source.User);

        var documents = source.Documents
            .Select(document => BuildDocument(document, typeById, source.Today, expiryWarningDays))
            .OrderByDescending(document => document.ExpiresOn ?? DateOnly.MaxValue)
            .ToList()
            .AsReadOnly();

        var bankAccounts = source.User.BankAccounts
            .Select(account => new DossierBankAccount(
                account.Id,
                account.BankCode,
                account.Iban.Masked,
                account.IsVerified,
                account.Ownership))
            .ToList()
            .AsReadOnly();

        var timeline = source.Events
            .OrderByDescending(@event => @event.OccurredAt)
            .ToList()
            .AsReadOnly();

        var summary = new DossierSummary(
            documents.Count,
            documents.Count(document => document.IsCurrentlyValid),
            documents.Count(document => document.IsExpiringSoon),
            documents.Count(document => document.Status is DocumentStatus.NeedsReview or DocumentStatus.PendingVerification),
            timeline.Count);

        return new UserDossier(
            identity,
            documents,
            bankAccounts,
            source.User.Addresses,
            source.User.Contacts,
            timeline,
            summary);
    }

    private static DossierIdentity BuildIdentity(User user)
    {
        var profile = user.Profile;
        var fields = new List<DossierField>();

        foreach (IdentityField field in Enum.GetValues<IdentityField>())
        {
            if (profile is null)
            {
                continue;
            }

            fields.Add(new DossierField(field, profile.ReadValue(field), profile.GetProvenance(field)));
        }

        return new DossierIdentity(
            user.Id,
            user.Status,
            user.Mobile.Masked,
            user.MobileVerifiedAt.HasValue,
            user.IsIdentityVerified,
            profile?.VerificationStatus ?? IdentityVerificationStatus.Unverified,
            fields.AsReadOnly());
    }

    private static DossierDocument BuildDocument(
        IdentityDocument document,
        IReadOnlyDictionary<Guid, DocumentType> typeById,
        DateOnly today,
        int expiryWarningDays)
    {
        typeById.TryGetValue(document.DocumentTypeId, out var documentType);

        return new DossierDocument(
            document.Id,
            documentType?.Code ?? "unknown",
            documentType?.TitlePersian ?? "مدرک نامشخص",
            document.Status,
            documentType?.Category ?? DocumentCategory.Other,
            document.IssuedOn,
            document.ExpiresOn,
            document.IsCurrentlyValid(today),
            document.Pages.Count,
            document.IsExpiringWithin(today, expiryWarningDays));
    }
}

/// <summary>Outcome of a document access check, used to audit every read of identity data.</summary>
/// <param name="IsAllowed">True when the caller may read the document.</param>
/// <param name="ReasonCode">Why access was refused, recorded in the audit trail.</param>
public sealed record DocumentAccessDecision(bool IsAllowed, string ReasonCode);

/// <summary>
/// Decides who may read which identity document. Ownership and permission are both required, and an
/// internal user is not automatically entitled: seeing identity data always needs an explicit permission.
/// </summary>
public static class DocumentAccessPolicy
{
    /// <summary>Permission required to read identity data belonging to other people.</summary>
    public const string ReadIdentityDataPermission = "identity.document.read";

    /// <summary>Permission required to review and decide on documents.</summary>
    public const string ReviewIdentityDataPermission = "identity.document.review";

    /// <summary>Permission required to see documents of a dossier that is not the caller's own.</summary>
    public const string ReadDossierPermission = "identity.dossier.read";

    /// <summary>Evaluates access to a single document.</summary>
    public static DocumentAccessDecision CanReadDocument(
        Guid callerUserId,
        Guid documentOwnerUserId,
        bool callerHasReadPermission)
    {
        if (callerUserId == documentOwnerUserId)
        {
            return new DocumentAccessDecision(true, "owner");
        }

        return callerHasReadPermission
            ? new DocumentAccessDecision(true, ReadIdentityDataPermission)
            : new DocumentAccessDecision(false, "permission_missing");
    }

    /// <summary>Evaluates access to a whole dossier.</summary>
    public static DocumentAccessDecision CanReadDossier(
        Guid callerUserId,
        Guid dossierOwnerUserId,
        bool callerHasDossierPermission)
    {
        if (callerUserId == dossierOwnerUserId)
        {
            return new DocumentAccessDecision(true, "owner");
        }

        return callerHasDossierPermission
            ? new DocumentAccessDecision(true, ReadDossierPermission)
            : new DocumentAccessDecision(false, "permission_missing");
    }

    /// <summary>Evaluates whether a caller may decide on a document's verification.</summary>
    public static DocumentAccessDecision CanReviewDocument(
        Guid callerUserId,
        Guid documentOwnerUserId,
        bool callerHasReviewPermission)
    {
        if (callerUserId == documentOwnerUserId)
        {
            return new DocumentAccessDecision(false, "self_review_not_permitted");
        }

        return callerHasReviewPermission
            ? new DocumentAccessDecision(true, ReviewIdentityDataPermission)
            : new DocumentAccessDecision(false, "permission_missing");
    }
}
