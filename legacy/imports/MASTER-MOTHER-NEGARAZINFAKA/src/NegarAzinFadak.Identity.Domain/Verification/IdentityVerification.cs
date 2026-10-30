using System.Text;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Identity.Domain.Documents;
using NegarAzinFadak.Identity.Domain.Users;

namespace NegarAzinFadak.Identity.Domain.Verification;

/// <summary>One disagreement between a document and the person's confirmed master data.</summary>
/// <param name="Field">The identity field in conflict.</param>
/// <param name="DocumentValue">Value found on the document after normalisation.</param>
/// <param name="ProfileValue">Value currently stored in the master profile.</param>
/// <param name="Kind">Whether the mismatch is a value mismatch or a missing value.</param>
public sealed record IdentityFieldConflict(
    IdentityField Field,
    string? DocumentValue,
    string? ProfileValue,
    IdentityConflictKind Kind);

/// <summary>Nature of a cross-check conflict.</summary>
public enum IdentityConflictKind
{
    /// <summary>The document and the profile hold different values.</summary>
    Mismatch = 0,

    /// <summary>The document has no value for a field the profile requires.</summary>
    Missing = 1
}

/// <summary>Outcome of cross-checking one document against the master profile.</summary>
/// <param name="IsConsistent">True when nothing conflicts, which allows automatic verification.</param>
/// <param name="Conflicts">Field-level conflicts, empty when consistent.</param>
/// <param name="Checks">Names of the checks that were actually executed, for auditability.</param>
public sealed record IdentityCrossCheckResult(
    bool IsConsistent,
    IReadOnlyList<IdentityFieldConflict> Conflicts,
    IReadOnlyList<string> Checks)
{
    /// <summary>True when the conflicts are severe enough to require a human decision.</summary>
    public bool RequiresHumanReview => Conflicts.Any(conflict => conflict.Field is IdentityField.NationalId);
}

/// <summary>
/// Cross-checks a document's normalised values against the person's confirmed master data.
/// </summary>
/// <remarks>
/// This is the gate that stops OCR from becoming master identity data: OCR proposes, the user
/// confirms, and only this check decides whether the result can be trusted automatically. Name
/// comparison is diacritic- and Persian-character-insensitive because Persian OCR of the same name
/// legitimately varies in Arabic ی/ك forms and in ZWNJ.
/// </remarks>
public static class IdentityConsistencyChecker
{
    /// <summary>Fields compared on a national-ID style document.</summary>
    private static readonly IdentityField[] ComparedFields =
    [
        IdentityField.FirstName,
        IdentityField.LastName,
        IdentityField.FatherName,
        IdentityField.NationalId,
        IdentityField.DateOfBirth
    ];

    public static IdentityCrossCheckResult Check(
        IReadOnlyDictionary<IdentityField, string?> documentFields,
        IReadOnlyDictionary<IdentityField, string?> profileFields)
    {
        ArgumentNullException.ThrowIfNull(documentFields);
        ArgumentNullException.ThrowIfNull(profileFields);

        var conflicts = new List<IdentityFieldConflict>();
        var checks = new List<string>();

        foreach (var field in ComparedFields)
        {
            documentFields.TryGetValue(field, out var documentValue);
            profileFields.TryGetValue(field, out var profileValue);

            if (string.IsNullOrWhiteSpace(documentValue))
            {
                if (!string.IsNullOrWhiteSpace(profileValue))
                {
                    conflicts.Add(new IdentityFieldConflict(field, documentValue, profileValue, IdentityConflictKind.Missing));
                    checks.Add($"{field}_present");
                }

                continue;
            }

            if (string.IsNullOrWhiteSpace(profileValue))
            {
                continue;
            }

            var equal = field switch
            {
                IdentityField.NationalId => CompareNationalId(documentValue, profileValue),
                IdentityField.DateOfBirth => CompareDates(documentValue, profileValue),
                _ => PersianTextComparer.AreEquivalent(documentValue, profileValue)
            };

            checks.Add($"{field}_match");
            if (!equal)
            {
                conflicts.Add(new IdentityFieldConflict(field, documentValue, profileValue, IdentityConflictKind.Mismatch));
            }
        }

        return new IdentityCrossCheckResult(conflicts.Count == 0, conflicts.AsReadOnly(), checks.AsReadOnly());
    }

    private static bool CompareNationalId(string left, string right)
    {
        var leftDigits = new string(left.Where(char.IsAsciiDigit).ToArray());
        var rightDigits = new string(right.Where(char.IsAsciiDigit).ToArray());
        return leftDigits.Length == 10
            && rightDigits.Length == 10
            && leftDigits == rightDigits;
    }

    private static bool CompareDates(string left, string right)
    {
        if (DateOnly.TryParse(left.Trim(), out var leftDate)
            && DateOnly.TryParse(right.Trim(), out var rightDate))
        {
            return leftDate == rightDate;
        }

        return left.Trim() == right.Trim();
    }
}

/// <summary>
/// Persian-aware text comparison for identity names. Arabic ي/ك, Persian ی/ک, ZWNJ, diacritics,
/// tatweel and non-spacing marks are folded so that a legitimately OCR'd name is not reported as a
/// mismatch and sent to a reviewer for nothing.
/// </summary>
public static class PersianTextComparer
{
    public static bool AreEquivalent(string? left, string? right)
        => string.Equals(Normalize(left), Normalize(right), StringComparison.Ordinal);

    /// <summary>Folds a Persian string to a comparable canonical form.</summary>
    public static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var builder = new StringBuilder(value.Length);
        var previousWasSpace = false;

        foreach (var ch in NormalizeDigits(value.Trim()))
        {
            var folded = Fold(ch);
            if (folded == ' ')
            {
                if (!previousWasSpace)
                {
                    builder.Append(' ');
                }

                previousWasSpace = true;
                continue;
            }

            previousWasSpace = false;
            builder.Append(folded);
        }

        return builder.ToString().Normalize(System.Text.NormalizationForm.FormKC);
    }

    private static string NormalizeDigits(string value)
    {
        var builder = new StringBuilder(value.Length);
        foreach (var ch in value)
        {
            builder.Append(ch switch
            {
                '۰' or '٠' => '0',
                '۱' or '١' => '1',
                '۲' or '٢' => '2',
                '۳' or '٣' => '3',
                '۴' or '٤' => '4',
                '۵' or '٥' => '5',
                '۶' or '٦' => '6',
                '۷' or '٧' => '7',
                '۸' or '٨' => '8',
                '۹' or '٩' => '9',
                _ => ch
            });
        }

        return builder.ToString();
    }

    private static char Fold(char ch) => ch switch
    {
        'ي' or 'ی' => 'ی',
        'ك' or 'ک' => 'ک',
        'ة' => 'ه',
        'أ' or 'إ' or 'آ' or 'ا' => 'ا',
        'ؤ' => 'و',
        'ئ' => 'ی',
        'ء' => ' ',
        'ـ' => ' ',
        '‌' or '‍' or '‎' or '‏' => ' ',
        '\u064B' or '\u064C' or '\u064D' or '\u064E' or '\u064F' or '\u0650' or '\u0651' or '\u0652' => '\0',
        _ => ch
    };
}

/// <summary>One possible duplicate of a person being registered.</summary>
/// <param name="ExistingUserId">Identity that already exists.</param>
/// <param name="MatchedOn">Which identifier matched, e.g. <c>national_id</c> or <c>mobile</c>.</param>
/// <param name="MatchConfidence">Confidence in the match, 0..1.</param>
/// <param name="RequiresMerge">True when the platform believes these are the same person.</param>
public sealed record DuplicateIdentityCandidate(
    Guid ExistingUserId,
    string MatchedOn,
    decimal MatchConfidence,
    bool RequiresMerge);

/// <summary>Outcome of a duplicate check, which is a decision input and never an automatic merge.</summary>
public sealed record DuplicateDetectionResult(
    bool HasCandidates,
    IReadOnlyList<DuplicateIdentityCandidate> Candidates)
{
    /// <summary>No candidate found: registration may proceed.</summary>
    public static DuplicateDetectionResult None { get; } = new(false, Array.Empty<DuplicateIdentityCandidate>());

    /// <summary>True when at least one candidate is strong enough to block automatic creation.</summary>
    public bool RequiresManualReview => Candidates.Any(candidate => candidate.RequiresMerge);
}

/// <summary>Decides whether a person about to be registered already exists in the central registry.</summary>
/// <remarks>
/// The policy is deliberately conservative: an exact national-ID match blocks creation, a mobile match
/// blocks it too, and a fuzzy name match only raises a review flag. Merging is always a human decision
/// with an audit trail, because silently merging two identities destroys accountability.
/// </remarks>
public static class DuplicateDetectionPolicy
{
    /// <summary>Confidence at or above which a candidate is treated as the same person.</summary>
    public const decimal MergeThreshold = 0.95m;

    public static DuplicateDetectionResult Evaluate(
        string? nationalId,
        string? mobile,
        string? firstName,
        string? lastName,
        string? fatherName,
        IReadOnlyList<DuplicateIdentityCandidate> existingMatches)
    {
        ArgumentNullException.ThrowIfNull(existingMatches);

        if (existingMatches.Count == 0)
        {
            return DuplicateDetectionResult.None;
        }

        var normalizedNationalId = Normalize(nationalId);
        var normalizedMobile = Normalize(mobile);
        var name = $"{PersianTextComparer.Normalize(firstName)}|{PersianTextComparer.Normalize(lastName)}|{PersianTextComparer.Normalize(fatherName)}";

        var evaluated = new List<DuplicateIdentityCandidate>(existingMatches.Count);
        foreach (var match in existingMatches)
        {
            var confidence = ScoreMatch(match.MatchedOn, normalizedNationalId, normalizedMobile, name);
            evaluated.Add(match with { MatchConfidence = confidence, RequiresMerge = confidence >= MergeThreshold });
        }

        return new DuplicateDetectionResult(true, evaluated.AsReadOnly());
    }

    private static decimal ScoreMatch(string matchedOn, string nationalId, string mobile, string name)
    {
        var reason = Normalize(matchedOn);

        if (reason.Equals("national_id", StringComparison.OrdinalIgnoreCase))
        {
            // A national ID is issued to exactly one person, so an exact hit is the same human.
            return NationalId.TryCreate(nationalId, out var parsed, out _)
                && Normalize(parsed!.Value) == nationalId
                    ? 1m
                    : 0.5m;
        }

        if (reason.Equals("mobile", StringComparison.OrdinalIgnoreCase))
        {
            return mobile.Length > 0 ? 0.9m : 0.3m;
        }

        if (reason.Equals("name", StringComparison.OrdinalIgnoreCase))
        {
            return name.Trim('|').Length > 4 ? 0.6m : 0.3m;
        }

        if (reason.Equals("date_of_birth", StringComparison.OrdinalIgnoreCase))
        {
            return 0.7m;
        }

        return 0.4m;
    }

    private static string Normalize(string? value) => (value ?? string.Empty).Trim().ToLowerInvariant();
}
