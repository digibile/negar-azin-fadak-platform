using Microsoft.Extensions.Options;
using NegarAzinFadak.Application.Options;

namespace NegarAzinFadak.Application.Documents;

/// <summary>
/// Validates the declared base document type catalogue before the platform serves anything.
/// </summary>
/// <remarks>
/// <para>
/// The catalogue is deployment configuration, and a mistake in it is invisible until someone tries to submit
/// the affected document: an unknown category silently binds to the first enum member, and a code with a
/// character that cannot survive a URL segment only fails when a request carries it. Refusing to start is the
/// only moment at which a deployment owner is still certain that fixing the file is enough.
/// </para>
/// <para>
/// It is a separate validator rather than a lambda because the checks need to report every problem at once.
/// A startup that fails on the first bad entry would otherwise make an operator restart the service once per
/// mistake.
/// </para>
/// </remarks>
public sealed class DocumentTypeCatalogueValidator : IValidateOptions<DocumentOptions>
{
    /// <inheritdoc />
    public ValidateOptionsResult Validate(string? name, DocumentOptions options)
    {
        if (options is null)
        {
            return ValidateOptionsResult.Skip;
        }

        var problems = new List<string>();
        var seen = new HashSet<string>(StringComparer.Ordinal);

        foreach (var definition in options.Types)
        {
            foreach (var error in DocumentTypeRules.ValidateDeclaration(definition))
            {
                problems.Add($"{DocumentOptions.SectionName}:Types[{definition.Code}] {error.Description}");
            }

            var normalized = DocumentTypeRules.NormalizeCode(definition.Code);
            if (normalized.IsSuccess && !seen.Add(normalized.Value))
            {
                problems.Add(
                    $"{DocumentOptions.SectionName}:Types declares '{normalized.Value}' more than once. Codes are unique, and a duplicate here would make every lookup of that document type ambiguous.");
            }
        }

        foreach (var code in options.EnabledDocumentTypes)
        {
            if (!DocumentTypeRules.NormalizeCode(code).IsSuccess)
            {
                problems.Add(
                    $"{DocumentOptions.SectionName}:EnabledDocumentTypes contains an unusable code '{code}'.");
            }
        }

        if (options.MaximumSizeInBytes <= 0)
        {
            problems.Add($"{DocumentOptions.SectionName}:MaximumSizeInBytes must be positive.");
        }

        if (options.LinkLifetime <= TimeSpan.Zero)
        {
            problems.Add($"{DocumentOptions.SectionName}:LinkLifetime must be positive.");
        }

        return problems.Count is 0
            ? ValidateOptionsResult.Success
            : ValidateOptionsResult.Fail(string.Join(" ", problems));
    }
}