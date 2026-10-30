using NegarAzinFadak.Application.Options;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Identity.Domain;

namespace NegarAzinFadak.Application.Documents;

/// <summary>
/// The rules a document type code and definition must satisfy.
/// </summary>
/// <remarks>
/// Extracted from <see cref="DocumentTypeService"/> so the same rules run in both places a document type can
/// be introduced: an operator calling the administration surface, and a deployment whose configuration is
/// validated at startup. Duplicating them would let a definition be accepted at publish time and rejected at
/// define time, or the other way round, and the resulting failure would appear at the moment someone submits
/// a document rather than when the mistake was made.
/// </remarks>
public static class DocumentTypeRules
{
    /// <summary>Largest number of characters a document type code may have; matches the column width.</summary>
    public const int MaximumCodeLength = 64;

    /// <summary>Largest accepted title length; matches the column width.</summary>
    public const int MaximumTitleLength = 256;

    /// <summary>Largest accepted OCR template hint length; matches the column width.</summary>
    public const int MaximumProviderTemplateLength = 128;

    /// <summary>
    /// Normalizes and validates a document type code.
    /// </summary>
    /// <remarks>
    /// Uppercased to match what the entity stores, so the value compared against the catalogue and the value
    /// written into a document are the same string. The character set is restricted to what survives a
    /// configuration binding, a URL segment and a provider-template hint without escaping.
    /// </remarks>
    /// <param name="code">The code as written by a caller or read from configuration.</param>
    /// <returns>The normalized code, or a validation error explaining why it was refused.</returns>
    public static Result<string> NormalizeCode(string? code)
    {
        var trimmed = (code ?? string.Empty).Trim().ToUpperInvariant();
        if (trimmed.Length is 0)
        {
            return Result<string>.Failure(IdentityErrors.DocumentTypeCodeInvalid("A document type code is required."));
        }

        if (trimmed.Length > MaximumCodeLength)
        {
            return Result<string>.Failure(
                IdentityErrors.DocumentTypeCodeInvalid(
                    $"A document type code must not exceed {MaximumCodeLength} characters."));
        }

        foreach (var character in trimmed)
        {
            if (!char.IsAsciiLetterOrDigit(character) && character is not ('_' or '-'))
            {
                return Result<string>.Failure(
                    IdentityErrors.DocumentTypeCodeInvalid(
                        "A document type code may contain only ASCII letters, digits, underscores and hyphens."));
            }
        }

        return Result<string>.Success(trimmed);
    }

    /// <summary>
    /// Validates the descriptive parts of a document type definition.
    /// </summary>
    /// <param name="title">English title.</param>
    /// <param name="titlePersian">Persian title.</param>
    /// <param name="defaultValidityDays">Default validity, or null for a document that never expires.</param>
    /// <param name="providerTemplate">OCR template hint, or null.</param>
    /// <param name="maxPages">How many pages the document may hold.</param>
    /// <returns>The first problem found, or null when the definition is usable.</returns>
    public static Error? ValidateDefinition(
        string? title,
        string? titlePersian,
        int? defaultValidityDays,
        string? providerTemplate,
        int maxPages)
    {
        if (string.IsNullOrWhiteSpace(title) || title.Trim().Length > MaximumTitleLength)
        {
            return IdentityErrors.DocumentTypeDefinitionInvalid(
                $"An English title of 1 to {MaximumTitleLength} characters is required.");
        }

        // The platform is Persian-first, so the Persian title is mandatory rather than a fallback. A type
        // with an empty Persian title renders as a blank entry in the one interface most operators use.
        if (string.IsNullOrWhiteSpace(titlePersian) || titlePersian.Trim().Length > MaximumTitleLength)
        {
            return IdentityErrors.DocumentTypeDefinitionInvalid(
                $"A Persian title of 1 to {MaximumTitleLength} characters is required.");
        }

        if (defaultValidityDays is <= 0)
        {
            return IdentityErrors.DocumentTypeDefinitionInvalid(
                "A validity period must be positive, or left unset for a document that never expires.");
        }

        if (maxPages < 1)
        {
            return IdentityErrors.DocumentTypeDefinitionInvalid("A document type must allow at least one page.");
        }

        if (providerTemplate is { Length: > MaximumProviderTemplateLength })
        {
            return IdentityErrors.DocumentTypeDefinitionInvalid(
                $"A provider template hint must not exceed {MaximumProviderTemplateLength} characters.");
        }

        return null;
    }

    /// <summary>
    /// Validates one whole declaration as it appears in configuration, including its category.
    /// </summary>
    /// <param name="definition">The declared type.</param>
    /// <returns>Every problem found, so a deployment sees all of them at once instead of one per restart.</returns>
    public static IReadOnlyList<Error> ValidateDeclaration(DocumentTypeDefinition definition)
    {
        ArgumentNullException.ThrowIfNull(definition);

        var problems = new List<Error>();

        var code = NormalizeCode(definition.Code);
        if (code.IsFailure)
        {
            problems.Add(code.FirstError);
        }

        var shape = ValidateDefinition(
            definition.Title,
            definition.TitlePersian,
            definition.DefaultValidityDays,
            definition.ProviderTemplate,
            definition.MaxPages);
        if (shape is not null)
        {
            problems.Add(shape);
        }

        var category = DocumentCategoryParser.Parse(definition.Category);
        if (category.IsFailure)
        {
            problems.Add(category.FirstError);
        }

        return problems;
    }
}