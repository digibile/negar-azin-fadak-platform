using NegarAzinFadak.Application.Documents;
using NegarAzinFadak.Application.Options;
using NegarAzinFadak.Identity.Domain;
using NegarAzinFadak.Identity.Domain.Documents;

namespace NegarAzinFadak.Api.Tests;

/// <summary>
/// The rules governing a document type code and a document type definition.
/// </summary>
/// <remarks>
/// <para>
/// A document type is introduced in two places — an operator calling the administration surface and a
/// deployment publishing its base catalogue from configuration — and the same rules must refuse both, at the
/// same moment, for the same reason. If the two disagreed, the failure would surface when somebody tried to
/// submit a document of a type that a restart had quietly turned into something else.
/// </para>
/// <para>
/// These are pure functions over text, so they are tested directly rather than through HTTP. What matters is
/// the boundary: which codes are acceptable, which titles are mandatory, and which mistakes have to be
/// rejected before they can reach a row.
/// </para>
/// </remarks>
public sealed class DocumentTypeRulesTests
{
    [Theory]
    [InlineData("national_id", "NATIONAL_ID")]
    [InlineData("  passport  ", "PASSPORT")]
    [InlineData("Driving-License", "DRIVING-LICENSE")]
    [InlineData("birth_certificate_v2", "BIRTH_CERTIFICATE_V2")]
    [InlineData("a", "A")]
    public void A_code_is_trimmed_and_uppercased_because_the_entity_stores_it_uppercased(string code, string expected)
    {
        var normalized = DocumentTypeRules.NormalizeCode(code);

        // Normalizing here is what lets the catalogue comparison and the value written onto a document be the
        // same string. A caller sending "National_Id" must reach the type published as "NATIONAL_ID".
        Assert.True(normalized.IsSuccess);
        Assert.Equal(expected, normalized.Value);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void A_missing_code_is_refused(string? code)
    {
        var normalized = DocumentTypeRules.NormalizeCode(code);

        Assert.True(normalized.IsFailure);
        Assert.Equal(IdentityErrors.DocumentTypeCodeInvalidCode, normalized.FirstError.Code);
    }

    [Theory]
    [InlineData("کارت ملی")]
    [InlineData("national id")]
    [InlineData("national/id")]
    [InlineData("national.id")]
    [InlineData("national%id")]
    [InlineData("national$id")]
    [InlineData("نational_id")]
    public void A_code_that_would_not_survive_a_route_a_binding_or_a_template_hint_is_refused(string code)
    {
        // The character set is deliberately narrow. A code reaches a URL segment, a configuration binding and
        // an OCR provider template hint; a space, a separator or a Persian letter in any of those three is an
        // escaping bug waiting to be found by a caller rather than by us.
        var normalized = DocumentTypeRules.NormalizeCode(code);

        Assert.True(normalized.IsFailure);
        Assert.Equal(IdentityErrors.DocumentTypeCodeInvalidCode, normalized.FirstError.Code);
    }

    [Fact]
    public void A_code_longer_than_the_column_is_refused_rather_than_truncated()
    {
        var normalized = DocumentTypeRules.NormalizeCode(new string('a', DocumentTypeRules.MaximumCodeLength + 1));

        // Truncating would let two different configured codes collide into one row and quietly attach
        // documents to the wrong type.
        Assert.True(normalized.IsFailure);
        Assert.Equal(IdentityErrors.DocumentTypeCodeInvalidCode, normalized.FirstError.Code);
        Assert.True(DocumentTypeRules.NormalizeCode(new string('a', DocumentTypeRules.MaximumCodeLength)).IsSuccess);
    }

    [Fact]
    public void A_complete_definition_passes()
    {
        var problem = DocumentTypeRules.ValidateDefinition(
            "National Identity Card",
            "کارت ملی",
            3650,
            "ir.nid.v2",
            2);

        Assert.Null(problem);
    }

    [Theory]
    [InlineData(null, "کارت ملی", 3650, 2)]
    [InlineData("", "کارت ملی", 3650, 2)]
    [InlineData("   ", "کارت ملی", 3650, 2)]
    [InlineData("National Identity Card", null, 3650, 2)]
    [InlineData("National Identity Card", "  ", 3650, 2)]
    public void A_missing_title_in_either_language_is_refused(string? title, string? titlePersian, int? validity, int maxPages)
    {
        var problem = DocumentTypeRules.ValidateDefinition(title, titlePersian, validity, null, maxPages);

        // The Persian title is mandatory rather than optional. The platform is Persian-first, and a type with
        // an empty Persian title renders as a blank row in the one interface most operators ever use.
        Assert.NotNull(problem);
        Assert.Equal(IdentityErrors.DocumentTypeDefinitionInvalidCode, problem.Code);
    }

    [Fact]
    public void A_title_longer_than_the_column_is_refused()
    {
        Assert.NotNull(DocumentTypeRules.ValidateDefinition(
            new string('a', DocumentTypeRules.MaximumTitleLength + 1),
            "کارت ملی",
            null,
            null,
            1));
        Assert.NotNull(DocumentTypeRules.ValidateDefinition(
            "National Identity Card",
            new string('ب', DocumentTypeRules.MaximumTitleLength + 1),
            null,
            null,
            1));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-365)]
    public void A_non_positive_validity_period_is_refused_but_an_unset_one_is_allowed(int validityDays)
    {
        Assert.NotNull(DocumentTypeRules.ValidateDefinition("Passport", "گذرنامه", validityDays, null, 1));

        // Unset means the document never expires, which is a real case: a birth certificate, for instance.
        Assert.Null(DocumentTypeRules.ValidateDefinition("Birth Certificate", "شناسنامه", null, null, 1));
    }

    [Fact]
    public void A_type_that_allows_no_page_is_refused()
    {
        Assert.NotNull(DocumentTypeRules.ValidateDefinition("Passport", "گذرنامه", null, null, 0));
        Assert.NotNull(DocumentTypeRules.ValidateDefinition("Passport", "گذرنامه", null, null, -1));
    }

    [Fact]
    public void A_provider_template_hint_longer_than_the_column_is_refused()
    {
        Assert.NotNull(DocumentTypeRules.ValidateDefinition(
            "Passport",
            "گذرنامه",
            null,
            new string('t', DocumentTypeRules.MaximumProviderTemplateLength + 1),
            1));
        Assert.Null(DocumentTypeRules.ValidateDefinition(
            "Passport",
            "گذرنامه",
            null,
            new string('t', DocumentTypeRules.MaximumProviderTemplateLength),
            1));
    }

    [Fact]
    public void A_well_formed_configuration_declaration_reports_no_problem()
    {
        var problems = DocumentTypeRules.ValidateDeclaration(new DocumentTypeDefinition
        {
            Code = "national_id",
            Title = "National Identity Card",
            TitlePersian = "کارت ملی",
            Category = "Identity",
            RequiresBackSide = true,
            DefaultValidityDays = 3650,
            IsIdentityDocument = true,
            MaxPages = 2
        });

        Assert.Empty(problems);
    }

    [Fact]
    public void A_declaration_reports_every_problem_at_once_rather_than_only_the_first()
    {
        // A deployment reading its log after a failed restart wants the whole list. Reporting one problem per
        // restart turns a single typo into a guessing game.
        var problems = DocumentTypeRules.ValidateDeclaration(new DocumentTypeDefinition
        {
            Code = "کارت ملی",
            Title = "",
            TitlePersian = "   ",
            Category = "Finanical",
            DefaultValidityDays = -3,
            MaxPages = 0
        });

        Assert.Equal(3, problems.Count);
        Assert.Contains(problems, problem => problem.Code == IdentityErrors.DocumentTypeCodeInvalidCode);
        Assert.Equal(2, problems.Count(problem => problem.Code == IdentityErrors.DocumentTypeDefinitionInvalidCode));

        // The category problem names the value that was refused and the values that would have been accepted,
        // so whoever reads the startup log does not have to guess which of the three settings is wrong.
        Assert.Contains(problems, problem => problem.Description.Contains("Finanical", StringComparison.Ordinal));
        Assert.Contains(problems, problem => problem.Description.Contains("Accepted categories", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData("Identity", DocumentCategory.Identity)]
    [InlineData("identity", DocumentCategory.Identity)]
    [InlineData("  IDENTITY  ", DocumentCategory.Identity)]
    [InlineData("Financial", DocumentCategory.Financial)]
    [InlineData("Employment", DocumentCategory.Employment)]
    public void A_category_is_parsed_whatever_casing_and_padding_it_was_written_in(string value, DocumentCategory expected)
    {
        var parsed = DocumentCategoryParser.Parse(value);

        Assert.True(parsed.IsSuccess);
        Assert.Equal(expected, parsed.Value);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("Finanical")]
    [InlineData("0")]
    [InlineData("Identity,Financial")]
    public void A_category_that_is_not_a_category_is_refused_and_the_accepted_ones_are_named(string? value)
    {
        var parsed = DocumentCategoryParser.Parse(value);

        // Binding a configuration string straight into an enum yields zero for an unrecognized name, which is
        // a real category. Parsing explicitly turns that silent misfiling into a rejected definition.
        Assert.True(parsed.IsFailure);
        Assert.Equal(IdentityErrors.DocumentTypeDefinitionInvalidCode, parsed.FirstError.Code);
        Assert.Contains("Identity", parsed.FirstError.Description, StringComparison.Ordinal);
    }

    [Fact]
    public void The_best_effort_category_reader_answers_null_instead_of_failing()
    {
        Assert.Equal(DocumentCategory.Identity, DocumentCategoryParser.ParseOrNull("identity"));
        Assert.Null(DocumentCategoryParser.ParseOrNull("not-a-category"));
        Assert.Null(DocumentCategoryParser.ParseOrNull(null));
    }
}