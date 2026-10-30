using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Auditing;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Results;

namespace NegarAzinFadak.Identity.Domain.Users;

/// <summary>Verification state of the master identity profile.</summary>
public enum IdentityVerificationStatus
{
    /// <summary>Only OCR output is present. Never usable as master data.</summary>
    Extracted = 0,

    /// <summary>User-confirmed but not yet cross-checked by the platform.</summary>
    PendingVerification = 1,

    /// <summary>Cross-checks passed and a reviewer or automated control approved it.</summary>
    Verified = 2,

    /// <summary>Rejected: the evidence contradicted the submitted data.</summary>
    Rejected = 3,

    /// <summary>Ambiguous or conflicting evidence; a human decision is required.</summary>
    NeedsReview = 4,

    /// <summary>Nothing collected yet.</summary>
    Unverified = 5,

    /// <summary>Previously verified but the supporting document has expired.</summary>
    Expired = 6
}

/// <summary>Field-level provenance, so a reader always knows whether a value was extracted, typed or verified.</summary>
public enum FieldProvenance
{
    /// <summary>Not populated.</summary>
    None = 0,

    /// <summary>Produced by OCR extraction. Not trusted.</summary>
    OcrExtracted = 1,

    /// <summary>Entered by the user themselves.</summary>
    UserEntered = 2,

    /// <summary>Confirmed by the user after reviewing the OCR result.</summary>
    UserConfirmed = 3,

    /// <summary>Approved by a reviewer of the platform.</summary>
    ReviewerApproved = 4,

    /// <summary>Matched against an external authoritative source.</summary>
    ProviderVerified = 5
}

/// <summary>The master record of one person's identity attributes.</summary>
/// <remarks>
/// Identity data enters this profile in two ways: OCR extraction writes <see cref="FieldProvenance.OcrExtracted"/>
/// values, and user confirmation or reviewer approval upgrades provenance. Only
/// <see cref="FieldProvenance.UserConfirmed"/> and above count as confirmed master data. A
/// <see cref="UserProfileChangeRequest"/> is the only way a confirmed value is ever altered, so every change to a
/// person's legal identity is reviewed, justified and auditable.
/// </remarks>
public sealed class IdentityProfile : Core.Domain.Entity, IAuditable, IHasConcurrencyStamp
{
    private readonly Dictionary<IdentityField, FieldProvenance> _provenance = [];
    private readonly Dictionary<IdentityField, string?> _values = [];
    private readonly List<IdentityAttributeChange> _history = [];

    internal IdentityProfile(Guid id, Guid userId)
    {
        AssignId(id);
        UserId = Guard.AgainstEmpty(userId);
        VerificationStatus = IdentityVerificationStatus.Unverified;
        ConcurrencyStamp = Guid.NewGuid().ToString("N");
    }

    private IdentityProfile()
    {
        ConcurrencyStamp = string.Empty;
    }

    public Guid UserId { get; private set; }

    public string? FirstName { get; private set; }

    public string? LastName { get; private set; }

    public string? FatherName { get; private set; }

    public string? MotherName { get; private set; }

    /// <summary>National identity number, stored as a validated <c>NationalId</c> value object.</summary>
    public NationalId? NationalId { get; private set; }

    public DateOnly? DateOfBirth { get; private set; }

    public Gender Gender { get; private set; }

    public string? PlaceOfBirth { get; private set; }

    public string? Occupation { get; private set; }

    public string? MaritalStatus { get; private set; }

    public string? NationalityCode { get; private set; }

    /// <summary>Full name in display order used across the platform (name + family name).</summary>
    public string FullName => string.Join(' ', new[] { FirstName, LastName }.Where(part => !string.IsNullOrWhiteSpace(part)));

    public IdentityVerificationStatus VerificationStatus { get; private set; } = IdentityVerificationStatus.Unverified;

    public DateTimeOffset? VerifiedAt { get; private set; }

    public Guid? VerifiedBy { get; private set; }

    /// <summary>Method that produced the verification, e.g. <c>identity_information_match</c> or <c>liveness</c>.</summary>
    public string? VerificationMethod { get; private set; }

    /// <summary>Recorded change history of confirmed attributes.</summary>
    public IReadOnlyList<IdentityAttributeChange> History => _history.AsReadOnly();

    /// <summary>True when the attributes normally required for a verified identity are present.</summary>
    public bool IsComplete =>
        !string.IsNullOrWhiteSpace(FirstName)
        && !string.IsNullOrWhiteSpace(LastName)
        && !string.IsNullOrWhiteSpace(FatherName)
        && NationalId is not null
        && DateOfBirth.HasValue;

    /// <summary>Date of birth recorded as a full timestamp, for consumers that need one.</summary>
    public DateTimeOffset? DateOfBirthAsDateTimeOffset
        => DateOfBirth.HasValue ? new DateTimeOffset(DateOfBirth.Value.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero) : null;

    public DateTimeOffset CreatedAt { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTimeOffset? ModifiedAt { get; set; }

    public Guid? ModifiedBy { get; set; }

    public string ConcurrencyStamp { get; set; } = string.Empty;

    /// <summary>
    /// Writes OCR output into the profile. Extracted values never overwrite confirmed ones: an
    /// untrusted read of a document must not degrade data a human already confirmed.
    /// </summary>
    public Result ApplyOcrExtraction(IReadOnlyDictionary<IdentityField, string?> extracted)
    {
        ArgumentNullException.ThrowIfNull(extracted);

        foreach (var (field, rawValue) in extracted)
        {
            if (string.IsNullOrWhiteSpace(rawValue))
            {
                continue;
            }

            if (GetProvenance(field) is FieldProvenance.UserConfirmed
                or FieldProvenance.ReviewerApproved
                or FieldProvenance.ProviderVerified)
            {
                continue;
            }

            SetValue(field, rawValue.Trim(), FieldProvenance.OcrExtracted);
        }

        if (VerificationStatus == IdentityVerificationStatus.Unverified)
        {
            VerificationStatus = IdentityVerificationStatus.Extracted;
        }

        return Result.Success();
    }

    /// <summary>
    /// Records what the user typed or confirmed. This is the only path that promotes a value to
    /// <see cref="FieldProvenance.UserConfirmed"/>, and it never marks the profile as verified.
    /// </summary>
    public Result ApplyUserConfirmedValues(IReadOnlyDictionary<IdentityField, string?> values)
    {
        ArgumentNullException.ThrowIfNull(values);

        var nationalIdValue = values.GetValueOrDefault(IdentityField.NationalId);
        if (!string.IsNullOrWhiteSpace(nationalIdValue) && NationalId?.Value != nationalIdValue.Trim())
        {
            if (!NationalId.TryCreate(nationalIdValue, out var parsed, out var error))
            {
                return Result.Failure(Error.Validation(IdentityErrors.NationalIdInvalidCode, error));
            }

            NationalId = parsed;
        }

        var dateOfBirthValue = values.GetValueOrDefault(IdentityField.DateOfBirth);
        if (!string.IsNullOrWhiteSpace(dateOfBirthValue) && DateOfBirth?.ToString("yyyy-MM-dd") != dateOfBirthValue.Trim())
        {
            if (!TryParseGregorian(dateOfBirthValue, out var birthDate))
            {
                return Result.Failure(Error.Validation(
                    IdentityErrors.DateOfBirthInvalidCode,
                    "Date of birth must be a valid Gregorian date in yyyy-MM-dd, yyyy/MM/dd or Jalali form."));
            }

            DateOfBirth = birthDate;
        }

        foreach (var (field, rawValue) in values)
        {
            if (field is IdentityField.NationalId or IdentityField.DateOfBirth)
            {
                continue;
            }

            if (string.IsNullOrWhiteSpace(rawValue))
            {
                continue;
            }

            SetValue(field, rawValue.Trim(), FieldProvenance.UserConfirmed);
        }

        if (VerificationStatus is IdentityVerificationStatus.Unverified or IdentityVerificationStatus.Extracted)
        {
            VerificationStatus = IdentityVerificationStatus.PendingVerification;
        }

        return Result.Success();
    }

    /// <summary>
    /// Marks the profile as verified after the verification pipeline has completed. A profile that is
    /// not complete cannot be verified, which is what stops a partially captured identity from being
    /// treated as a master record.
    /// </summary>
    public Result MarkVerified(DateTimeOffset verifiedAt, Guid? verifiedBy, string verificationMethod)
    {
        if (!IsComplete)
        {
            return Result.Failure(IdentityErrors.ProfileIncomplete);
        }

        VerificationStatus = IdentityVerificationStatus.Verified;
        VerifiedAt = verifiedAt;
        VerifiedBy = verifiedBy;
        VerificationMethod = Guard.AgainstNullOrWhiteSpace(verificationMethod);
        return Result.Success();
    }

    /// <summary>Flags the profile for human review, keeping the data readable but not trusted.</summary>
    public Result MarkNeedsReview(string? reason)
    {
        VerificationStatus = IdentityVerificationStatus.NeedsReview;
        VerificationMethod = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        return Result.Success();
    }

    /// <summary>Rejects the profile, e.g. when documents contradict each other.</summary>
    public Result MarkRejected(string? reason)
    {
        VerificationStatus = IdentityVerificationStatus.Rejected;
        VerificationMethod = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        VerifiedAt = null;
        VerifiedBy = null;
        return Result.Success();
    }

    /// <summary>Marks the profile as expired because the supporting document is no longer valid.</summary>
    public void MarkExpired() => VerificationStatus = IdentityVerificationStatus.Expired;

    /// <summary>Records the outcome of automated cross-checks without changing verified state.</summary>
    public void RecordCrossCheckOutcome(bool consistent, string? detail)
    {
        if (VerificationStatus is IdentityVerificationStatus.Verified)
        {
            return;
        }

        if (!consistent)
        {
            VerificationStatus = IdentityVerificationStatus.NeedsReview;
        }

        LastCrossCheckAt = DateTimeOffset.UtcNow;
        LastCrossCheckDetail = string.IsNullOrWhiteSpace(detail) ? null : detail.Trim();
    }

    /// <summary>When the last automated cross-check ran.</summary>
    public DateTimeOffset? LastCrossCheckAt { get; private set; }

    /// <summary>Detail of the last cross-check, for support and review screens.</summary>
    public string? LastCrossCheckDetail { get; private set; }

    /// <summary>Provenance of a specific field, used by the review UI to show trust per field.</summary>
    public FieldProvenance GetProvenance(IdentityField field)
        => _provenance.TryGetValue(field, out var provenance) ? provenance : FieldProvenance.None;

    /// <summary>True when every required field has provenance of <see cref="FieldProvenance.UserConfirmed"/> or better.</summary>
    public bool HasConfirmedCoreFields =>
        GetProvenance(IdentityField.FirstName) is FieldProvenance.UserConfirmed or FieldProvenance.ReviewerApproved or FieldProvenance.ProviderVerified
        && GetProvenance(IdentityField.LastName) is FieldProvenance.UserConfirmed or FieldProvenance.ReviewerApproved or FieldProvenance.ProviderVerified
        && GetProvenance(IdentityField.FatherName) is FieldProvenance.UserConfirmed or FieldProvenance.ReviewerApproved or FieldProvenance.ProviderVerified;

    /// <summary>
    /// Applies a reviewed change to a single field. Only called for approved change requests, and it
    /// always records the previous value in the profile history.
    /// </summary>
    public Result ApplyReviewedField(IdentityField field, string? newValue, Guid reviewerId, DateTimeOffset appliedAt)
    {
        if (newValue is not null && newValue.Length > 512)
        {
            return Result.Failure(IdentityErrors.FieldValueTooLong);
        }

        if (field == IdentityField.NationalId && !string.IsNullOrWhiteSpace(newValue))
        {
            if (!NationalId.TryCreate(newValue, out var parsed, out var error))
            {
                return Result.Failure(Error.Validation(IdentityErrors.NationalIdInvalidCode, error));
            }

            RecordChange(field, NationalId?.Value, newValue, reviewerId, appliedAt);
            NationalId = parsed;
            SetProvenance(field, FieldProvenance.ReviewerApproved);
            return Result.Success();
        }

        RecordChange(field, ReadValue(field), newValue, reviewerId, appliedAt);
        SetValue(field, newValue, FieldProvenance.ReviewerApproved);
        return Result.Success();
    }

    /// <summary>Value of a field as currently stored, for cross-checks and audit comparison.</summary>
    public string? ReadValue(IdentityField field)
    {
        if (_values.TryGetValue(field, out var value))
        {
            return value;
        }

        return field switch
        {
            IdentityField.FirstName => FirstName,
            IdentityField.LastName => LastName,
            IdentityField.FatherName => FatherName,
            IdentityField.MotherName => MotherName,
            IdentityField.NationalId => NationalId?.Value,
            IdentityField.DateOfBirth => DateOfBirth?.ToString("yyyy-MM-dd"),
            IdentityField.PlaceOfBirth => PlaceOfBirth,
            IdentityField.Occupation => Occupation,
            IdentityField.MaritalStatus => MaritalStatus,
            IdentityField.NationalityCode => NationalityCode,
            _ => null
        };
    }

    /// <summary>Persian display name, used by the UI and by generated documents.</summary>
    public string FullNamePersian => FullName;

    private void SetValue(IdentityField field, string? value, FieldProvenance provenance)
    {
        _values[field] = value;

        switch (field)
        {
            case IdentityField.FirstName:
                FirstName = value;
                break;
            case IdentityField.LastName:
                LastName = value;
                break;
            case IdentityField.FatherName:
                FatherName = value;
                break;
            case IdentityField.MotherName:
                MotherName = value;
                break;
            case IdentityField.PlaceOfBirth:
                PlaceOfBirth = value;
                break;
            case IdentityField.Occupation:
                Occupation = value;
                break;
            case IdentityField.MaritalStatus:
                MaritalStatus = value;
                break;
            case IdentityField.NationalityCode:
                NationalityCode = value;
                break;
            case IdentityField.Gender when Enum.TryParse<Gender>(value, ignoreCase: true, out var gender):
                Gender = gender;
                break;
            default:
                break;
        }

        SetProvenance(field, provenance);
    }

    private void SetProvenance(IdentityField field, FieldProvenance provenance)
    {
        if (provenance > _provenance.GetValueOrDefault(field))
        {
            _provenance[field] = provenance;
        }
    }

    private void RecordChange(IdentityField field, string? previousValue, string? newValue, Guid reviewerId, DateTimeOffset at)
        => _history.Add(new IdentityAttributeChange(Guid.NewGuid(), Id, field, previousValue, newValue, reviewerId, at));

    private static bool TryParseGregorian(string value, out DateOnly date)
    {
        var trimmed = value.Trim();
        if (DateOnly.TryParse(trimmed, System.Globalization.CultureInfo.InvariantCulture, out date))
        {
            return true;
        }

        if (DateOnly.TryParse(trimmed, PersianCalendarCulture.Current, out date))
        {
            return true;
        }

        date = default;
        return false;
    }

    private static class PersianCalendarCulture
    {
        public static System.Globalization.CultureInfo Current { get; } = Create();

        private static System.Globalization.CultureInfo Create()
        {
            var culture = new System.Globalization.CultureInfo("fa-IR")
            {
                DateTimeFormat = { Calendar = new System.Globalization.PersianCalendar() }
            };
            return culture;
        }
    }
}

/// <summary>Identity attributes that can be extracted, confirmed, reviewed and reported on.</summary>
public enum IdentityField
{
    /// <summary>Given name.</summary>
    FirstName = 0,

    /// <summary>Family name.</summary>
    LastName = 1,

    /// <summary>Father's name, mandatory on Iranian identity documents.</summary>
    FatherName = 2,

    /// <summary>Mother's name.</summary>
    MotherName = 3,

    /// <summary>National identity number.</summary>
    NationalId = 4,

    /// <summary>Date of birth.</summary>
    DateOfBirth = 5,

    /// <summary>Administrative gender.</summary>
    Gender = 6,

    /// <summary>Place of birth.</summary>
    PlaceOfBirth = 7,

    /// <summary>Occupation.</summary>
    Occupation = 8,

    /// <summary>Marital status.</summary>
    MaritalStatus = 9,

    /// <summary>Nationality code.</summary>
    NationalityCode = 10
}

/// <summary>An audited change to one identity attribute, kept for legal and audit purposes.</summary>
public sealed class IdentityAttributeChange
{
    private IdentityAttributeChange()
    {
        Field = IdentityField.FirstName;
    }

    internal IdentityAttributeChange(
        Guid id,
        Guid profileId,
        IdentityField field,
        string? previousValue,
        string? newValue,
        Guid changedBy,
        DateTimeOffset changedAt)
    {
        Id = id;
        ProfileId = profileId;
        Field = field;
        PreviousValue = previousValue;
        NewValue = newValue;
        ChangedBy = changedBy;
        ChangedAt = changedAt;
    }

    public Guid Id { get; private set; }

    public Guid ProfileId { get; private set; }

    public IdentityField Field { get; private set; }

    public string? PreviousValue { get; private set; }

    public string? NewValue { get; private set; }

    public Guid ChangedBy { get; private set; }

    public DateTimeOffset ChangedAt { get; private set; }
}

/// <summary>Status of a requested change to master identity data.</summary>
public enum ProfileChangeStatus
{
    /// <summary>Awaiting reviewer decision.</summary>
    Pending = 0,

    /// <summary>Approved and applied to the profile.</summary>
    Approved = 1,

    /// <summary>Refused by the reviewer.</summary>
    Rejected = 2
}

/// <summary>A reviewed request to change a confirmed identity attribute.</summary>
public sealed class UserProfileChangeRequest
{
    private UserProfileChangeRequest()
    {
        Field = IdentityField.FirstName;
        Status = ProfileChangeStatus.Pending;
    }

    internal UserProfileChangeRequest(
        Guid id,
        Guid userId,
        IdentityField field,
        string? newValue,
        string reason,
        Guid requestedBy,
        DateTimeOffset requestedAt)
    {
        Id = id;
        UserId = userId;
        Field = field;
        NewValue = newValue;
        Reason = reason;
        RequestedBy = requestedBy;
        RequestedAt = requestedAt;
        Status = ProfileChangeStatus.Pending;
    }

    public Guid Id { get; private set; }

    public Guid UserId { get; private set; }

    public IdentityField Field { get; private set; }

    public string? NewValue { get; private set; }

    /// <summary>Why the change is being requested; mandatory so changes are never unexplained.</summary>
    public string Reason { get; private set; } = string.Empty;

    public Guid RequestedBy { get; private set; }

    public DateTimeOffset RequestedAt { get; private set; }

    public ProfileChangeStatus Status { get; private set; }

    public Guid? ReviewedBy { get; private set; }

    public DateTimeOffset? ReviewedAt { get; private set; }

    public string? ReviewNote { get; private set; }

    internal void Approve(Guid reviewerId, DateTimeOffset at)
    {
        Status = ProfileChangeStatus.Approved;
        ReviewedBy = reviewerId;
        ReviewedAt = at;
    }

    internal void Reject(Guid reviewerId, string note, DateTimeOffset at)
    {
        Status = ProfileChangeStatus.Rejected;
        ReviewedBy = reviewerId;
        ReviewedAt = at;
        ReviewNote = note;
    }
}
