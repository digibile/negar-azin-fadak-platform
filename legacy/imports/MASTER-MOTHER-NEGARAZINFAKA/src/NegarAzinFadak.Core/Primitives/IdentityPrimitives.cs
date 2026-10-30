using System.Text.RegularExpressions;
using NegarAzinFadak.Core.Domain;

namespace NegarAzinFadak.Core.Primitives;

/// <summary>
/// Canonical phone number in Iranian E.164 form (<c>+989xxxxxxxxx</c>). Normalising at the value-object
/// level means OTP delivery, duplicate detection and uniqueness constraints all agree on one spelling.
/// </summary>
public sealed partial class MobileNumber : ValueObject
{
    /// <summary>International dialing prefix of Iran.</summary>
    public const string IranCountryCode = "+98";

    private MobileNumber(string canonical) => Value = canonical;

    /// <summary>The canonical, storable representation.</summary>
    public string Value { get; }

    /// <summary>Last four digits, for masked display in support and audit views.</summary>
    public string Masked => $"{Value[..3]}*****{Value[^4..]}";

    /// <summary>Creates a mobile number from any accepted local or international spelling.</summary>
    /// <exception cref="FormatException">The input is not a valid Iranian mobile number.</exception>
    public static MobileNumber Create(string value)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(value);

        var digits = NormalizeDigits(value);
        var canonical = ToCanonical(digits)
            ?? throw new FormatException("Value is not a valid Iranian mobile number.");

        return new MobileNumber(canonical);
    }

    /// <summary>Non-throwing variant, used by normalisation of OCR and user-submitted data.</summary>
    public static bool TryCreate(string? value, out MobileNumber? number, out string? error)
    {
        number = null;
        error = null;

        if (string.IsNullOrWhiteSpace(value))
        {
            error = "Mobile number is required.";
            return false;
        }

        try
        {
            number = Create(value);
            return true;
        }
        catch (FormatException)
        {
            error = "Mobile number is not a valid Iranian mobile number.";
            return false;
        }
    }

    private static string? ToCanonical(string digits)
    {
        string national;
        if (digits.StartsWith("0098", StringComparison.Ordinal))
        {
            national = digits[4..];
        }
        else if (digits.StartsWith("98", StringComparison.Ordinal) && digits.Length == 12)
        {
            national = digits[2..];
        }
        else if (digits.StartsWith('0') && digits.Length == 11)
        {
            national = digits[1..];
        }
        else if (digits.Length == 10 && digits.StartsWith('9'))
        {
            national = digits;
        }
        else
        {
            return null;
        }

        return MobilePattern().IsMatch(national) ? IranCountryCode + national : null;
    }

    /// <summary>
    /// Reduces any accepted spelling to bare digits, folding Persian and Arabic-Indic digits to ASCII.
    /// The leading <c>+</c> and separators are dropped rather than kept: <c>ToCanonical</c> matches on
    /// digit prefixes, and retaining a sign would make the canonical form this type emits unparseable
    /// by its own factory.
    /// </summary>
    private static string NormalizeDigits(string value)
    {
        var builder = new System.Text.StringBuilder(value.Length);
        foreach (var ch in value)
        {
            var c = char.ToUpperInvariant(ch);
            var mapped = c switch
            {
                '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4',
                '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
                '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
                '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
                _ => c
            };

            if (char.IsAsciiDigit(mapped))
            {
                builder.Append(mapped);
            }
        }

        return builder.ToString();
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public override string ToString() => Value;

    [GeneratedRegex(@"^9\d{9}$", RegexOptions.CultureInvariant)]
    private static partial Regex MobilePattern();
}

/// <summary>
/// Iranian national identity number, always stored as exactly ten digits. Iranian national IDs embed
/// a check digit, so an invalid checksum is rejected at the value-object level rather than surfacing
/// later as a verification failure.
/// </summary>
public sealed class NationalId : ValueObject
{
    private NationalId(string value) => Value = value;

    /// <summary>The ten-digit canonical value.</summary>
    public string Value { get; }

    /// <summary>Masked form used in list views and support tooling.</summary>
    public string Masked => $"{Value[..3]}****{Value[^2..]}";

    /// <summary>Creates a national ID from any accepted spelling, validating the check digit.</summary>
    public static NationalId Create(string value)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(value);

        var digits = new string(value.Where(char.IsAsciiDigit).ToArray());
        if (digits.Length != 10)
        {
            throw new FormatException("National ID must contain exactly ten digits.");
        }

        if (!IsChecksumValid(digits))
        {
            throw new FormatException("National ID check digit is invalid.");
        }

        return new NationalId(digits);
    }

    /// <summary>Non-throwing variant used when importing or normalising untrusted data.</summary>
    public static bool TryCreate(string? value, out NationalId? nationalId, out string? error)
    {
        nationalId = null;
        error = null;

        if (string.IsNullOrWhiteSpace(value))
        {
            error = "National ID is required.";
            return false;
        }

        try
        {
            nationalId = Create(value);
            return true;
        }
        catch (FormatException exception)
        {
            error = exception.Message;
            return false;
        }
    }

    /// <summary>True when the value is ten digits and the embedded check digit matches.</summary>
    public static bool IsChecksumValid(string digits)
    {
        if (digits.Length != 10)
        {
            return false;
        }

        var sum = 0;
        for (var i = 0; i < 9; i++)
        {
            sum += (digits[i] - '0') * (10 - i);
        }

        var remainder = sum % 11;
        var checkDigit = digits[9] - '0';
        return remainder < 2 ? checkDigit == remainder : checkDigit == 11 - remainder;
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public override string ToString() => Value;
}

/// <summary>Gregorian date used inside the domain, with the invariants the domain actually relies on.</summary>
public sealed class DateRange : ValueObject
{
    public DateRange(DateOnly start, DateOnly end)
    {
        if (end < start)
        {
            throw new ArgumentException("End date must not be earlier than start date.", nameof(end));
        }

        Start = start;
        End = end;
    }

    public DateOnly Start { get; }

    public DateOnly End { get; }

    public bool Contains(DateOnly date) => date >= Start && date <= End;

    public int DaysInclusive => End.DayNumber - Start.DayNumber + 1;

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Start;
        yield return End;
    }
}
