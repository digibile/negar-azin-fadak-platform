using System.Text.RegularExpressions;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Identity.Domain.Users;
using NegarAzinFadak.Identity.Domain.Verification;

namespace NegarAzinFadak.Application.Identity;

/// <summary>
/// Turns raw OCR output into canonical identity values. Normalisation is a pure function so it can be
/// unit-tested exhaustively, and it is applied before any validation or cross-check: comparing raw OCR
/// text to master data would report conflicts that do not exist.
/// </summary>
public static partial class IdentityFieldNormalizer
{
    private static readonly Dictionary<string, IdentityField> FieldAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["name"] = IdentityField.FirstName,
        ["first_name"] = IdentityField.FirstName,
        ["firstname"] = IdentityField.FirstName,
        ["given_name"] = IdentityField.FirstName,
        ["نام"] = IdentityField.FirstName,

        ["surname"] = IdentityField.LastName,
        ["last_name"] = IdentityField.LastName,
        ["lastname"] = IdentityField.LastName,
        ["family_name"] = IdentityField.LastName,
        ["نام خانوادگی"] = IdentityField.LastName,
        ["نام‌خانوادگی"] = IdentityField.LastName,

        ["father_name"] = IdentityField.FatherName,
        ["fathername"] = IdentityField.FatherName,
        ["father"] = IdentityField.FatherName,
        ["نام پدر"] = IdentityField.FatherName,

        ["mother_name"] = IdentityField.MotherName,
        ["mothername"] = IdentityField.MotherName,
        ["نام مادر"] = IdentityField.MotherName,

        ["national_id"] = IdentityField.NationalId,
        ["nationalid"] = IdentityField.NationalId,
        ["national_id_number"] = IdentityField.NationalId,
        ["کد ملی"] = IdentityField.NationalId,
        ["شماره ملی"] = IdentityField.NationalId,

        ["date_of_birth"] = IdentityField.DateOfBirth,
        ["birth_date"] = IdentityField.DateOfBirth,
        ["dob"] = IdentityField.DateOfBirth,
        ["birthdate"] = IdentityField.DateOfBirth,
        ["تاریخ تولد"] = IdentityField.DateOfBirth,

        ["gender"] = IdentityField.Gender,
        ["جنسیت"] = IdentityField.Gender,

        ["place_of_birth"] = IdentityField.PlaceOfBirth,
        ["birth_place"] = IdentityField.PlaceOfBirth,
        ["محل تولد"] = IdentityField.PlaceOfBirth,

        ["occupation"] = IdentityField.Occupation,
        ["شغل"] = IdentityField.Occupation,

        ["marital_status"] = IdentityField.MaritalStatus,
        ["وضعیت تاهل"] = IdentityField.MaritalStatus,

        ["nationality"] = IdentityField.NationalityCode,
        ["nationality_code"] = IdentityField.NationalityCode,
        ["تابعیت"] = IdentityField.NationalityCode
    };

    /// <summary>Resolves a provider field name, Persian or English, to a domain field.</summary>
    public static bool TryResolveField(string? rawName, out IdentityField field)
    {
        field = IdentityField.FirstName;
        if (string.IsNullOrWhiteSpace(rawName))
        {
            return false;
        }

        var key = PersianTextComparer.Normalize(rawName);
        if (FieldAliases.TryGetValue(key, out field))
        {
            return true;
        }

        foreach (var (alias, candidate) in FieldAliases)
        {
            if (key.Contains(alias, StringComparison.OrdinalIgnoreCase))
            {
                field = candidate;
                return true;
            }
        }

        return false;
    }

    /// <summary>
    /// Normalises a raw provider field map into domain fields. Values that fail their own type check are
    /// dropped rather than forwarded, so a bad national ID never reaches the profile as a valid-looking
    /// string.
    /// </summary>
    public static IReadOnlyDictionary<IdentityField, string?> Normalize(
        IReadOnlyDictionary<string, string?> rawFields)
    {
        ArgumentNullException.ThrowIfNull(rawFields);

        var normalized = new Dictionary<IdentityField, string?>();
        foreach (var (rawName, rawValue) in rawFields)
        {
            if (!TryResolveField(rawName, out var field) || string.IsNullOrWhiteSpace(rawValue))
            {
                continue;
            }

            var value = field switch
            {
                IdentityField.NationalId => NormalizeNationalId(rawValue),
                IdentityField.DateOfBirth => NormalizeDate(rawValue),
                IdentityField.FirstName or IdentityField.LastName or IdentityField.FatherName
                    or IdentityField.MotherName or IdentityField.PlaceOfBirth
                    => PersianTextComparer.Normalize(rawValue).ToLowerInvariant(),
                IdentityField.Gender => NormalizeGender(rawValue),
                _ => rawValue.Trim()
            };

            if (!string.IsNullOrWhiteSpace(value))
            {
                normalized[field] = value;
            }
        }

        return normalized;
    }

    /// <summary>Extracts the ten national-ID digits from text such as «کد ملی: ۰۰۱۲۳۴۵۶۷۸».</summary>
    public static string? NormalizeNationalId(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var digits = NormalizeDigits(value);
        var matches = DigitSequencePattern().Matches(digits);
        foreach (Match match in matches)
        {
            if (match.Length == 10)
            {
                return match.Value;
            }
        }

        return digits.Length == 10 ? digits : null;
    }

    /// <summary>Parses a date of birth from ISO, Jalali or common Persian formats, returning ISO form.</summary>
    public static string? NormalizeDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        var digitsOnly = NormalizeDigits(trimmed);
        var separated = SeparatedDatePattern().Match(digitsOnly);
        if (separated.Success && DateOnly.TryParse(
                $"{separated.Groups[1].Value}-{separated.Groups[2].Value}-{separated.Groups[3].Value}",
                System.Globalization.CultureInfo.InvariantCulture,
                out var iso))
        {
            return iso.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        }

        if (JalaliYearMonthDayPattern().Match(trimmed) is { Success: true } jalali)
        {
            var calendar = new System.Globalization.PersianCalendar();
            if (int.TryParse(jalali.Groups[1].Value, out var year)
                && int.TryParse(jalali.Groups[2].Value, out var month)
                && int.TryParse(jalali.Groups[3].Value, out var day)
                && year is >= 1200 and <= 1500
                && month is >= 1 and <= 12
                && day >= 1
                && day <= calendar.GetDaysInMonth(year, month))
            {
                var date = calendar.ToDateTime(year, month, day, 0, 0, 0, 0);
                return DateOnly.FromDateTime(date).ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
            }
        }

        if (DateOnly.TryParse(trimmed, System.Globalization.CultureInfo.InvariantCulture, out var parsed))
        {
            return parsed.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        }

        if (DateOnly.TryParse(trimmed, PersianDateCulture.Current, out var persian))
        {
            return persian.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        }

        return null;
    }

    private static string? NormalizeGender(string? value)
    {
        var normalized = PersianTextComparer.Normalize(value);
        if (normalized.Contains("مرد", StringComparison.Ordinal) || normalized.Contains("male", StringComparison.OrdinalIgnoreCase))
        {
            return nameof(Gender.Male);
        }

        if (normalized.Contains("زن", StringComparison.Ordinal) || normalized.Contains("female", StringComparison.OrdinalIgnoreCase))
        {
            return nameof(Gender.Female);
        }

        return null;
    }

    private static string NormalizeDigits(string value)
    {
        var builder = new System.Text.StringBuilder(value.Length);
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

    private static class PersianDateCulture
    {
        public static System.Globalization.CultureInfo Current { get; } = new("fa-IR")
        {
            DateTimeFormat = { Calendar = new System.Globalization.PersianCalendar() }
        };
    }

    [GeneratedRegex(@"\d{10}", RegexOptions.CultureInvariant)]
    private static partial Regex DigitSequencePattern();

    [GeneratedRegex(@"(?<y>\d{4})[-/.](?<m>\d{1,2})[-/.](?<d>\d{1,2})", RegexOptions.CultureInvariant)]
    private static partial Regex SeparatedDatePattern();

    [GeneratedRegex(@"^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$", RegexOptions.CultureInvariant)]
    private static partial Regex JalaliYearMonthDayPattern();
}
