using NegarAzinFadak.Core;

namespace NegarAzinFadak.Application.Options;

/// <summary>Tunable thresholds for document capture analysis. Bound from configuration, never hard-coded.</summary>
public sealed class DocumentImageQualityOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "Identity:DocumentQuality";

    /// <summary>Overall score below which the user is asked to retake the capture.</summary>
    public double MinimumOverallScore { get; set; } = 0.5d;

    /// <summary>Sharpness below which the capture is refused as blurred.</summary>
    public double MinimumSharpness { get; set; } = 0.4d;

    /// <summary>Brightness below which the capture is refused as underexposed.</summary>
    public double MinimumBrightness { get; set; } = 0.25d;

    /// <summary>Largest accepted upload, in bytes.</summary>
    public long MaximumSizeInBytes { get; set; } = 10 * 1024 * 1024;

    /// <summary>Media types the platform accepts for document captures.</summary>
    public IList<string> AllowedContentTypes { get; set; } = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"];
}

/// <summary>OTP policy defaults, overridable per purpose and per environment.</summary>
public sealed class OtpOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "Identity:Otp";

    public int CodeLength { get; set; } = 5;

    public int TimeToLiveSeconds { get; set; } = 120;

    public int MaxAttempts { get; set; } = 5;

    public int ResendIntervalSeconds { get; set; } = 60;

    public int MaxActiveChallengesPerTarget { get; set; } = 3;

    /// <summary>Maximum OTP issues allowed per mobile number per hour, protecting against SMS-pumping abuse.</summary>
    public int MaxIssuesPerTargetPerHour { get; set; } = 5;

    /// <summary>Maximum OTP verifications allowed per mobile number per hour.</summary>
    public int MaxVerificationsPerTargetPerHour { get; set; } = 20;

    /// <summary>Persian template used for the SMS body. Placeholders are substituted by the notification service.</summary>
    public string MessageTemplate { get; set; } = "کد ورود شما به سامانه: {code} — اعتبار: {minutes} دقیقه";

    /// <summary>Builds the domain policy from these options.</summary>
    public NegarAzinFadak.Identity.Domain.Authentication.OtpPolicy ToPolicy() => new(
        CodeLength,
        TimeSpan.FromSeconds(TimeToLiveSeconds),
        MaxAttempts,
        TimeSpan.FromSeconds(ResendIntervalSeconds),
        MaxActiveChallengesPerTarget);
}

/// <summary>Document access and retention policy.</summary>
public sealed class DocumentOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "Identity:Documents";

    /// <summary>How long an expiring document link stays valid.</summary>
    public TimeSpan LinkLifetime { get; set; } = TimeSpan.FromMinutes(5);

    /// <summary>How many days before expiry a reminder is raised.</summary>
    public int ExpiryWarningDays { get; set; } = 30;

    /// <summary>Maximum accepted document size, in bytes.</summary>
    public long MaximumSizeInBytes { get; set; } = 10 * 1024 * 1024;

    /// <summary>Codes of document types accepted by the platform, e.g. <c>national_id</c>, <c>passport</c>.</summary>
    /// <remarks>
    /// The gate, not the catalogue. It answers which of the installed document types this deployment will
    /// accept a submission for, so a deployment may carry the full base catalogue in
    /// <see cref="Types"/> while accepting only the papers its workflows actually handle. What each code
    /// means is declared in <see cref="Types"/>.
    /// </remarks>
    public IList<string> EnabledDocumentTypes { get; set; } =
    [
        "national_id",
        "birth_certificate",
        "driving_license",
        "passport",
        "bank_statement",
        "employment_contract",
        "guarantee_letter"
    ];

    /// <summary>
    /// The base catalogue of document types published at startup.
    /// </summary>
    /// <remarks>
    /// This is the platform's answer to "which kinds of paper does the platform understand", and it is
    /// configuration rather than code so a deployment extends the catalogue without a new build. It declares
    /// shapes, not business data: no person, no document and no tenant appears here, which is what keeps
    /// seeding it from being fabricated data. Publishing is add-only, so an operator who defines a type in the
    /// administration surface keeps their definition across restarts.
    /// </remarks>
    public IList<DocumentTypeDefinition> Types { get; set; } = [];
}

/// <summary>
/// One declared document type: the paper it describes and the rules a document of that kind is judged by.
/// </summary>
/// <remarks>
/// Bound from <c>Identity:Documents:Types</c>. Properties are settable and non-nullable-because-defaulted
/// rather than positional because the configuration binder assigns them by name, and a missing entry in
/// <c>appsettings.json</c> must fail loudly at startup rather than bind to <see langword="null"/> and surface
/// much later as a null reference inside a document submission.
/// </remarks>
public sealed class DocumentTypeDefinition
{
    /// <summary>Stable code, uppercased on publish; e.g. <c>national_id</c>.</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>English title.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Persian title, which the Persian-first client renders.</summary>
    public string TitlePersian { get; set; } = string.Empty;

    /// <summary>Folder category a document of this type belongs to, by name; see <c>DocumentCategory</c>.</summary>
    public string Category { get; set; } = nameof(NegarAzinFadak.Identity.Domain.Documents.DocumentCategory.Identity);

    /// <summary>Whether the back side must be captured before the document can be verified.</summary>
    public bool RequiresBackSide { get; set; }

    /// <summary>Validity in days granted when a document is issued, or null for a document that never expires.</summary>
    public int? DefaultValidityDays { get; set; }

    /// <summary>Whether a document of this type may back an identity verification.</summary>
    public bool IsIdentityDocument { get; set; }

    /// <summary>
    /// Hint naming the OCR template to read this kind of paper with, or null to leave the choice to the
    /// configured provider. It is a hint and never a dispatch key: the platform does not require a particular
    /// OCR provider to be installed to accept a document.
    /// </summary>
    public string? ProviderTemplate { get; set; }

    /// <summary>How many pages a document of this type may hold.</summary>
    public int MaxPages { get; set; } = 1;
}

/// <summary>External provider selection. All providers are optional and configured, never assumed.</summary>
public sealed class ProviderOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "Providers";

    /// <summary>Code of the active OCR provider, e.g. <c>azure_read</c>, or <c>none</c> to disable extraction.</summary>
    public string Ocr { get; set; } = "none";

    /// <summary>Code of the active SMS gateway.</summary>
    public string Sms { get; set; } = "none";

    /// <summary>Code of the active email gateway.</summary>
    public string Email { get; set; } = "none";

    /// <summary>Code of the active document storage provider.</summary>
    public string Storage { get; set; } = "local";

    /// <summary>Code of the optional strong identity verification provider.</summary>
    public string IdentityVerification { get; set; } = "none";

    /// <summary>Code of the optional external authoritative identity source.</summary>
    public string ExternalIdentitySource { get; set; } = "none";

    /// <summary>Code of the active AI provider.</summary>
    public string Ai { get; set; } = "none";

    /// <summary>Provider-specific settings, bound per provider code.</summary>
    public Dictionary<string, Dictionary<string, string>> Settings { get; set; } = [];
}

/// <summary>Identity security policy: what a workflow requires before it may treat a person as verified.</summary>
public sealed class IdentitySecurityOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "Identity:Security";

    /// <summary>True when strong identity verification is required for credit and loan workflows.</summary>
    public bool RequireStrongVerificationForCredit { get; set; } = true;

    /// <summary>True when an expired document blocks the workflow instead of triggering a warning.</summary>
    public bool RejectExpiredDocumentsInWorkflows { get; set; } = true;

    /// <summary>Number of failed sign-in attempts before the account is temporarily locked.</summary>
    public int MaxFailedLoginAttempts { get; set; } = 5;

    /// <summary>How long an account stays locked, in minutes.</summary>
    public int LoginLockoutMinutes { get; set; } = 15;

    /// <summary>True when registering an identity must run duplicate detection before creation.</summary>
    public bool DetectDuplicatesOnRegistration { get; set; } = true;
}
