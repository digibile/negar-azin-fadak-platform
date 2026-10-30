using System.Text.RegularExpressions;

namespace NegarAzinFadak.Infrastructure.Notifications;

/// <summary>
/// Redacts one-time codes and other short digit sequences from text bound for a log sink.
/// </summary>
/// <remarks>
/// A message body exists only to carry a code, so it must never be logged. This is the second line of
/// defence for the cases where such a value reaches a log by accident: an interpolated exception, a
/// diagnostic dump, or a future provider that logs the message it was handed. A caller that redacts
/// before logging does not have to remember which of those it is.
/// <para>
/// The pattern is deliberately broad. Over-redacting a long number in a log line is a cosmetic cost;
/// under-redacting a one-time code is an account-takeover cost, so the trade is not close.
/// </para>
/// </remarks>
public static partial class OtpLogRedaction
{
    /// <summary>Replacement written in place of a redacted value.</summary>
    public const string Mask = "***";

    [GeneratedRegex(@"\d{4,}", RegexOptions.CultureInvariant)]
    private static partial Regex DigitRunPattern();

    /// <summary>
    /// Replaces every run of at least four digits with <see cref="Mask"/>. Returns an empty string for
    /// null input so a redaction helper can be applied inline without a null check at every call site.
    /// </summary>
    public static string Redact(string? value)
        => string.IsNullOrEmpty(value) ? string.Empty : DigitRunPattern().Replace(value, Mask);

    /// <summary>
    /// Describes a one-time code without disclosing it, for logs that need to show that one was present.
    /// </summary>
    public static string DescribeCode(string? code)
        => string.IsNullOrEmpty(code) ? "absent" : $"present ({code.Length} characters, value withheld)";
}
