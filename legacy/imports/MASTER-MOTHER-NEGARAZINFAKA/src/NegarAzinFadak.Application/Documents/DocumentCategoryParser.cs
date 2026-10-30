using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Identity.Domain;
using NegarAzinFadak.Identity.Domain.Documents;

namespace NegarAzinFadak.Application.Documents;

/// <summary>
/// Turns the textual <c>Category</c> of a request or a configuration entry into the domain enumeration.
/// </summary>
/// <remarks>
/// The platform keeps the category as text on the wire and in <c>appsettings.json</c> and resolves it here,
/// in one place, rather than trusting an enum name from either side. Configuration binding into an enum
/// silently yields zero for an unrecognized name, and a category of <c>Identity</c> would pass unnoticed as
/// the default even when the operator wrote <c>identity</c> wrong or <c>Finanical</c>, so the name would be
/// stored against the wrong folder while the catalogue looked correct. Resolving it explicitly turns that
/// into a rejected definition at publish time.
/// </remarks>
public static class DocumentCategoryParser
{
    /// <summary>
    /// Parses a category name, accepting any casing and the separators an enum member may contain.
    /// </summary>
    /// <param name="value">The name as written by a caller or read from configuration.</param>
    /// <returns>The category, or a validation error naming the accepted values.</returns>
    public static Result<DocumentCategory> Parse(string? value)
    {
        var trimmed = (value ?? string.Empty).Trim();
        if (trimmed.Length is 0)
        {
            return Result<DocumentCategory>.Failure(Unknown(null));
        }

        if (Enum.TryParse(trimmed, ignoreCase: true, out DocumentCategory parsed) &&
            Enum.IsDefined(parsed) &&
            IsDeclaredName(trimmed))
        {
            return Result<DocumentCategory>.Success(parsed);
        }

        return Result<DocumentCategory>.Failure(Unknown(trimmed));
    }

    /// <summary>Parses a category, returning <see langword="null"/> instead of an error.</summary>
    /// <remarks>
    /// For callers that already validated the value elsewhere and only need a best-effort answer, such as
    /// reading back a stored category name into a projection.
    /// </remarks>
    public static DocumentCategory? ParseOrNull(string? value)
    {
        var parsed = Parse(value);
        return parsed.IsSuccess ? parsed.Value : null;
    }

    private static bool IsDeclaredName(string value)
    {
        // Matching the declared names is what closes the gap TryParse leaves open: it also accepts a numeric
        // value and a comma-separated combination of members, and both resolve to a value that happens to be
        // defined. "Identity,Financial" parses as 3, which is Employment, and "0" parses as Identity — a
        // document would then be filed under a folder nobody named, in the one interface most operators use.
        // A category is exactly one folder, so only a name that was actually declared is accepted.
        return Enum.GetNames<DocumentCategory>()
            .Any(name => string.Equals(name, value, StringComparison.OrdinalIgnoreCase));
    }

    private static Error Unknown(string? value)
    {
        var accepted = string.Join(", ", Enum.GetNames<DocumentCategory>());
        var subject = value is null || value.Length is 0 ? "A category is required." : $"'{value}' is not a category.";
        return IdentityErrors.DocumentTypeDefinitionInvalid($"{subject} Accepted categories: {accepted}.");
    }
}