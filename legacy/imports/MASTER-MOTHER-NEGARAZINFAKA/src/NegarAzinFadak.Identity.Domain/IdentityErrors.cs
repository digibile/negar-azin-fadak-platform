using NegarAzinFadak.Core.Results;

namespace NegarAzinFadak.Identity.Domain;

/// <summary>
/// Stable error codes of the identity module. Codes are part of the API contract: clients and tests
/// depend on them, so they change only with a deliberate versioned decision. Messages never contain
/// identity data such as a full national ID or mobile number.
/// </summary>
public static class IdentityErrors
{
    public const string NotFoundCode = "identity.user.not_found";
    public const string OutsideTenantCode = "identity.user.outside_tenant";
    public const string StatusInvalidCode = "identity.user.status_invalid";
    public const string MobileInvalidCode = "identity.user.mobile_invalid";
    public const string MobileUnchangedCode = "identity.user.mobile_unchanged";
    public const string MobileAlreadyVerifiedCode = "identity.user.mobile_already_verified";
    public const string MobileNotVerifiedCode = "identity.user.mobile_not_verified";
    public const string UserClosedCode = "identity.user.closed";
    public const string UserSuspendedCode = "identity.user.suspended";
    public const string SuspensionReasonRequiredCode = "identity.user.suspension_reason_required";
    public const string CredentialRequiredCode = "identity.user.credential_required";
    public const string CredentialInvalidCode = "identity.user.credential_invalid";
    public const string CredentialTooWeakCode = "identity.user.credential_too_weak";
    public const string AccountLockedCode = "identity.user.account_locked";
    public const string DisplayNameTooLongCode = "identity.user.display_name_too_long";
    public const string OperatorRequiredCode = "identity.user.operator_required";
    public const string SignInCredentialsRequiredCode = "identity.signin.credentials_required";
    public const string SignInInvalidCredentialsCode = "identity.signin.invalid_credentials";
    public const string RoleAlreadyGrantedCode = "identity.user.role_already_granted";
    public const string RoleNotGrantedCode = "identity.user.role_not_granted";
    public const string ContactExistsCode = "identity.user.contact_exists";
    public const string ContactInvalidEmailCode = "identity.user.contact_email_invalid";
    public const string AddressPostalCodeInvalidCode = "identity.user.address_postal_code_invalid";
    public const string BankAccountDuplicateCode = "identity.user.bank_account_duplicate";
    public const string BankOwnershipUnverifiedCode = "identity.user.bank_ownership_unverified";
    public const string NationalIdInvalidCode = "identity.profile.national_id_invalid";
    public const string NationalIdTakenCode = "identity.profile.national_id_taken";
    public const string DateOfBirthInvalidCode = "identity.profile.date_of_birth_invalid";
    public const string ProfileIncompleteCode = "identity.profile.incomplete";
    public const string ProfileNotFoundCode = "identity.profile.not_found";
    public const string FieldValueTooLongCode = "identity.profile.field_too_long";
    public const string ChangeRequestNotFoundCode = "identity.profile.change_request_not_found";
    public const string ChangeRequestNotPendingCode = "identity.profile.change_request_not_pending";
    public const string DuplicateIdentityCode = "identity.user.duplicate_identity";
    public const string DuplicateMergeRequiredCode = "identity.user.duplicate_merge_required";

    public const string DocumentNotFoundCode = "identity.document.not_found";
    public const string DocumentTypeNotFoundCode = "identity.document.type_not_found";
    public const string DocumentTypeInactiveCode = "identity.document.type_inactive";
    public const string DocumentTypeCodeInvalidCode = "identity.document.type_code_invalid";
    public const string DocumentTypeCodeExistsCode = "identity.document.type_code_exists";
    public const string DocumentTypeDefinitionInvalidCode = "identity.document.type_definition_invalid";
    public const string DocumentPageAlreadyExistsCode = "identity.document.page_already_exists";
    public const string DocumentSideAlreadyExistsCode = "identity.document.side_already_exists";
    public const string DocumentSideMissingCode = "identity.document.side_missing";
    public const string DocumentHasNoPagesCode = "identity.document.has_no_pages";
    public const string DocumentAlreadyVerifiedCode = "identity.document.already_verified";
    public const string DocumentExpiredCode = "identity.document.expired";
    public const string DocumentNotVerifiedCode = "identity.document.not_verified";
    public const string DocumentValidityInvalidCode = "identity.document.validity_invalid";
    public const string DocumentRejectionReasonRequiredCode = "identity.document.rejection_reason_required";
    public const string CaptureQualityInsufficientCode = "identity.document.capture_quality_insufficient";
    public const string CannotChangeVerifiedDocumentCode = "identity.document.verified_immutable";
    public const string DocumentAccessDeniedCode = "identity.document.access_denied";
    public const string DocumentStorageFailedCode = "identity.document.storage_failed";
    public const string DocumentCaptureUnacceptableCode = "identity.document.capture_unacceptable";
    public const string DocumentMaxPagesExceededCode = "identity.document.max_pages_exceeded";

    public const string FolderNotFoundCode = "identity.folder.not_found";
    public const string FolderEntryExistsCode = "identity.folder.entry_exists";
    public const string FolderEntryAlreadyReviewedCode = "identity.folder.entry_already_reviewed";
    public const string FolderEntryNotFoundCode = "identity.folder.entry_not_found";

    public const string OtpCodeRequiredCode = "identity.otp.code_required";
    public const string OtpCodeIncorrectCode = "identity.otp.code_incorrect";
    public const string OtpExpiredCode = "identity.otp.expired";
    public const string OtpLockedCode = "identity.otp.locked";
    public const string OtpAlreadyUsedCode = "identity.otp.already_used";
    public const string OtpSupersededCode = "identity.otp.superseded";
    public const string OtpNotActiveCode = "identity.otp.not_active";
    public const string OtpRateLimitedCode = "identity.otp.rate_limited";
    public const string OtpTooManyActiveCode = "identity.otp.too_many_active";
    public const string OtpDeliveryFailedCode = "identity.otp.delivery_failed";

    public const string DossierNotFoundCode = "identity.dossier.not_found";
    public const string DossierAccessDeniedCode = "identity.dossier.access_denied";
    public const string OcrProviderUnavailableCode = "identity.ocr.provider_unavailable";
    public const string OcrExtractionFailedCode = "identity.ocr.extraction_failed";
    public const string OcrNoFieldsExtractedCode = "identity.ocr.no_fields_extracted";

    public static Error UserNotFound() => Error.NotFound(NotFoundCode, "The requested identity does not exist.");

    /// <summary>
    /// The identity is real but is not the caller's to read, or the session carries no tenant at all.
    /// </summary>
    /// <remarks>
    /// The description names no organization and no identity, because the honest answer to "is this mine" is
    /// not something an endpoint should answer in detail to someone who may be asking about another tenant.
    /// A read of a foreign identity returns the same not-found answer as a read of a nonexistent one, and
    /// this code covers the case where the caller has no tenant to be inside in the first place.
    /// </remarks>
    public static Error OutsideTenant
        => Error.Forbidden(OutsideTenantCode, "The identity does not belong to the caller's tenant.");

    public static Error StatusInvalid(string status)
        => Error.Validation(StatusInvalidCode, $"'{status}' is not an identity status.");

    public static Error MobileInvalid(string? reason)
        => Error.Validation(MobileInvalidCode, reason ?? "Mobile number is not valid.");

    public static Error MobileUnchanged => Error.DomainRule(MobileUnchangedCode, "The new mobile number is the current one.");

    public static Error MobileAlreadyVerified
        => Error.DomainRule(MobileAlreadyVerifiedCode, "The mobile number has already been verified.");

    public static Error MobileNotVerified
        => Error.DomainRule(MobileNotVerifiedCode, "The mobile number must be verified first.");

    public static Error UserClosed => Error.DomainRule(UserClosedCode, "This identity is closed.");

    public static Error UserSuspended => Error.DomainRule(UserSuspendedCode, "This identity is suspended.");

    /// <summary>
    /// A suspension was requested without a reason.
    /// </summary>
    /// <remarks>
    /// A hold with no stated cause is indistinguishable from a defect once the person cannot sign in, so the
    /// reason is required at the point it is captured. The reason is stored in the audit trail, never on the
    /// identity: a suspension reason is often a compliance or fraud matter, and it belongs with the record of
    /// who decided it rather than on the person it was decided about.
    /// </remarks>
    public static Error SuspensionReasonRequired
        => Error.Validation(SuspensionReasonRequiredCode, "A reason is required to suspend an identity.");

    public static Error CredentialRequired
        => Error.DomainRule(CredentialRequiredCode, "This identity has no password credential.");

    public static Error DisplayNameTooLong(int maximum)
        => Error.Validation(DisplayNameTooLongCode, $"A display name must not exceed {maximum} characters.");

    public static Error OperatorRequired
        => Error.Validation(OperatorRequiredCode, "The operator performing this action must be identified.");

    /// <summary>
    /// A wrong password. The wording deliberately says nothing about which half of the credential was
    /// wrong, so a caller cannot use the message to learn that a mobile number exists.
    /// </summary>
    public static Error CredentialInvalid
        => Error.Unauthorized(CredentialInvalidCode, "The supplied password is not correct.");

    public static Error CredentialTooWeak(string reason)
        => Error.Validation(CredentialTooWeakCode, reason);

    public static Error AccountLocked(int failedAttempts)
        => Error.Unauthorized(
            AccountLockedCode,
            $"This identity is locked after {failedAttempts} failed sign-in attempts. An operator must restore it.");

    public static Error SignInCredentialsRequired
        => Error.Validation(SignInCredentialsRequiredCode, "A mobile number and a password are required.");

    /// <summary>
    /// The single failure returned for both an unknown mobile number and a wrong password. Merging them is
    /// what stops the sign-in endpoint from reporting which mobile numbers are registered.
    /// </summary>
    public static Error SignInInvalidCredentials
        => Error.Unauthorized(SignInInvalidCredentialsCode, "The mobile number or password is not correct.");

    public static Error RoleAlreadyGranted(string roleCode)
        => Error.Conflict(RoleAlreadyGrantedCode, $"Role '{roleCode}' is already granted.");

    public static Error RoleNotGranted(string roleCode)
        => Error.DomainRule(RoleNotGrantedCode, $"Role '{roleCode}' is not granted.");

    public static Error ContactAlreadyExists(string kind, string maskedValue)
        => Error.Conflict(ContactExistsCode, $"A {kind} contact with value '{maskedValue}' already exists.");

    public static Error InvalidEmail => Error.Validation(ContactInvalidEmailCode, "Email address is not valid.");

    public static Error InvalidPostalCode
        => Error.Validation(AddressPostalCodeInvalidCode, "Postal code format is not valid.");

    public static Error BankAccountDuplicate
        => Error.Conflict(BankAccountDuplicateCode, "This bank account is already registered for this identity.");

    public static Error BankOwnershipUnverified
        => Error.DomainRule(BankOwnershipUnverifiedCode, "Account ownership must be established before verification.");

    public static Error NationalIdInvalid(string? reason)
        => Error.Validation(NationalIdInvalidCode, reason ?? "National ID is not valid.");

    public static Error NationalIdTaken => Error.Conflict(NationalIdTakenCode, "This national ID belongs to another identity.");

    public static Error DateOfBirthInvalid(string? reason)
        => Error.Validation(DateOfBirthInvalidCode, reason ?? "Date of birth is not valid.");

    public static Error ProfileIncomplete
        => Error.DomainRule(ProfileIncompleteCode, "The identity profile is missing required attributes.");

    public static Error ProfileNotFound => Error.NotFound(ProfileNotFoundCode, "The identity profile does not exist.");

    public static Error FieldValueTooLong
        => Error.Validation(FieldValueTooLongCode, "The submitted value is longer than the field allows.");

    public static Error ChangeRequestNotFound
        => Error.NotFound(ChangeRequestNotFoundCode, "The change request does not exist.");

    public static Error ChangeRequestNotPending
        => Error.DomainRule(ChangeRequestNotPendingCode, "The change request has already been decided.");

    public static Error DuplicateIdentity
        => Error.Conflict(DuplicateIdentityCode, "A possible duplicate identity was found. Review before continuing.");

    public static Error DuplicateMergeRequired
        => Error.Conflict(DuplicateMergeRequiredCode, "This person already exists in the central registry. Merge or continue manually.");

    public static Error DocumentNotFound => Error.NotFound(DocumentNotFoundCode, "The requested document does not exist.");

    public static Error DocumentTypeNotFound
        => Error.NotFound(DocumentTypeNotFoundCode, "The requested document type is not configured.");

    public static Error DocumentTypeInactive
        => Error.DomainRule(DocumentTypeInactiveCode, "The requested document type is not active.");

    /// <summary>
    /// A document type code that could not be used as a stable identifier.
    /// </summary>
    /// <remarks>
    /// The code ends up in configuration, in routes and in the provider-template hint of a stored document,
    /// so it is restricted to characters that survive all three without escaping. Restricting it here rather
    /// than at each consumer means a rejected code fails once, at the only place that creates them.
    /// </remarks>
    public static Error DocumentTypeCodeInvalid(string? reason)
        => Error.Validation(DocumentTypeCodeInvalidCode, reason ?? "The document type code is not valid.");

    /// <summary>
    /// A code the catalogue already holds.
    /// </summary>
    /// <remarks>
    /// Reported even when the existing entry is deactivated. The code is what documents and configurations
    /// refer to, so a second row under the same code would make every lookup of it ambiguous rather than
    /// bringing the type back.
    /// </remarks>
    public static Error DocumentTypeCodeExists(string code)
        => Error.Conflict(DocumentTypeCodeExistsCode, $"Document type '{code}' already exists.");

    public static Error DocumentTypeDefinitionInvalid(string? reason)
        => Error.Validation(DocumentTypeDefinitionInvalidCode, reason ?? "The document type definition is not valid.");

    public static Error DocumentPageAlreadyExists(int pageNumber)
        => Error.Conflict(DocumentPageAlreadyExistsCode, $"Page {pageNumber} has already been uploaded for this document.");

    public static Error DocumentSideAlreadyExists(string side)
        => Error.Conflict(DocumentSideAlreadyExistsCode, $"A '{side}' page has already been captured for this document.");

    public static Error DocumentSideMissing(string side)
        => Error.DomainRule(DocumentSideMissingCode, $"The '{side}' page is required before this document can be verified.");

    public static Error DocumentHasNoPages
        => Error.DomainRule(DocumentHasNoPagesCode, "The document has no captured page.");

    public static Error DocumentAlreadyVerified
        => Error.DomainRule(DocumentAlreadyVerifiedCode, "The document is already verified.");

    public static Error DocumentExpired
        => Error.DomainRule(DocumentExpiredCode, "The document has expired and must be replaced.");

    public static Error DocumentNotVerified(string? reason = null)
        => Error.DomainRule(DocumentNotVerifiedCode, reason ?? "The document is not verified.");

    public static Error DocumentValidityInvalid
        => Error.Validation(DocumentValidityInvalidCode, "The expiry date must not precede the issue date.");

    public static Error DocumentRejectionReasonRequired
        => Error.Validation(DocumentRejectionReasonRequiredCode, "A rejection reason is required.");

    public static Error CaptureQualityInsufficient(IReadOnlyList<string> issues)
        => Error.Validation(CaptureQualityInsufficientCode, string.Join(" ", issues));

    public static Error CannotChangeVerifiedDocument
        => Error.DomainRule(CannotChangeVerifiedDocumentCode, "A verified document cannot be modified; upload a new version instead.");

    public static Error DocumentAccessDenied
        => Error.Forbidden(DocumentAccessDeniedCode, "You are not allowed to access this document.");

    public static Error DocumentStorageFailed(string? reason = null)
        => Error.DomainRule(DocumentStorageFailedCode, reason ?? "The document could not be stored.");

    /// <summary>A capture that failed the configured quality thresholds.</summary>
    /// <remarks>
    /// Refused at the door, before any bytes are stored, because a blurred or half-framed capture produces
    /// plausible but wrong identity data downstream: the platform would rather ask for a retake than file a
    /// document it cannot trust. The Persian guidance travels with the error so the mobile client can show it
    /// verbatim rather than inventing its own wording.
    /// </remarks>
    /// <param name="issues">What is wrong with the capture, in the order the analyzer reported it.</param>
    public static Error DocumentCaptureUnacceptable(IReadOnlyList<string>? issues)
        => Error.Validation(
            DocumentCaptureUnacceptableCode,
            issues is { Count: > 0 }
                ? string.Join(" ", issues)
                : "The capture is not good enough to accept.");

    /// <summary>More pages were offered than the document type allows.</summary>
    /// <param name="maximum">How many pages the configured document type allows.</param>
    public static Error DocumentMaxPagesReached(int maximum)
        => Error.DomainRule(
            DocumentMaxPagesExceededCode,
            $"This document type allows at most {maximum} page{(maximum == 1 ? string.Empty : "s")}.");

    public static Error FolderNotFound => Error.NotFound(FolderNotFoundCode, "The digital folder does not exist.");

    public static Error FolderEntryExists
        => Error.Conflict(FolderEntryExistsCode, "This document is already present in the folder.");

    public static Error FolderEntryNotFound(Guid entryId)
        => Error.NotFound(FolderEntryNotFoundCode, $"Folder entry '{entryId}' was not found.");

    public static Error FolderEntryAlreadyReviewed
        => Error.DomainRule(FolderEntryAlreadyReviewedCode, "The folder entry has already been reviewed.");

    public static Error OtpCodeRequired => Error.Validation(OtpCodeRequiredCode, "The verification code is required.");

    public static Error OtpCodeIncorrect(int attemptsRemaining)
        => Error.Validation(OtpCodeIncorrectCode, $"The verification code is incorrect. {attemptsRemaining} attempt(s) remaining.");

    public static Error OtpExpired => Error.DomainRule(OtpExpiredCode, "The verification code has expired. Request a new one.");

    public static Error OtpLocked => Error.DomainRule(OtpLockedCode, "Too many incorrect attempts. Request a new code.");

    public static Error OtpAlreadyUsed => Error.DomainRule(OtpAlreadyUsedCode, "The verification code has already been used.");

    public static Error OtpSuperseded => Error.DomainRule(OtpSupersededCode, "A newer verification code has been issued.");

    public static Error OtpNotActive => Error.DomainRule(OtpNotActiveCode, "The verification code is no longer active.");

    public static Error OtpRateLimited(TimeSpan retryAfter)
        => Error.RateLimited(OtpRateLimitedCode, $"Too many requests. Try again in {Math.Ceiling(retryAfter.TotalSeconds)} second(s).");

    public static Error OtpTooManyActive
        => Error.RateLimited(OtpTooManyActiveCode, "Too many active verification codes for this mobile number.");

    public static Error OtpDeliveryFailed(string? reason = null)
        => Error.DomainRule(OtpDeliveryFailedCode, reason ?? "The verification message could not be delivered.");

    public static Error DossierNotFound => Error.NotFound(DossierNotFoundCode, "The user dossier does not exist.");

    public static Error DossierAccessDenied
        => Error.Forbidden(DossierAccessDeniedCode, "You are not allowed to view this dossier.");

    public static Error OcrProviderUnavailable(string provider)
        => Error.DomainRule(OcrProviderUnavailableCode, $"OCR provider '{provider}' is not available.");

    public static Error OcrExtractionFailed(string? reason = null)
        => Error.DomainRule(OcrExtractionFailedCode, reason ?? "Text extraction failed for this document.");

    public static Error OcrNoFieldsExtracted
        => Error.DomainRule(OcrNoFieldsExtractedCode, "No identity fields could be extracted from the capture.");
}
