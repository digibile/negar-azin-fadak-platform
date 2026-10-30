using Microsoft.EntityFrameworkCore;
using NegarAzinFadak.Application.Documents;
using NegarAzinFadak.Core.Paging;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Identity.Domain.Documents;
using NegarAzinFadak.Identity.Domain.Folders;
using NegarAzinFadak.Identity.Domain.Users;
using NegarAzinFadak.Infrastructure.Persistence;

namespace NegarAzinFadak.Infrastructure.Tests;

/// <summary>
/// The document, document-type and folder stores, exercised over a real SQLite database and two unrelated
/// organizations.
/// </summary>
/// <remarks>
/// <para>
/// These tests exist for the one thing the API tests cannot reach: storage-key resolution. A key is the only
/// handle through which the platform ever accepts a request for document bytes, and it arrives from a URL,
/// so a mistake in how it is resolved is a breach rather than a wrong answer. The property under test is
/// that resolving a key answers only for the organization owning the document, and that a key belonging to
/// someone else is indistinguishable from one that never existed.
/// </para>
/// <para>
/// Two organizations on purpose. Every test here would pass against a store that ignored its scope entirely,
/// and a store that ignores its scope is the failure this module is most able to have.
/// </para>
/// </remarks>
public sealed class DocumentStoreIsolationTests
{
    private static readonly TenantScope AlphaScope = new(Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001"));
    private static readonly TenantScope BetaScope = new(Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002"));
    private static readonly Guid Reviewer = Guid.Parse("dddddddd-0000-0000-0000-000000000001");
    private static readonly DateOnly Today = new(2026, 3, 1);

    private static ICurrentUser Operator(TenantScope scope)
        => new CurrentUser(Reviewer, scope, ["identity.operator"]);

    [Fact]
    public async Task A_document_of_another_organization_is_absent_from_the_listing()
    {
        using var factory = new SqliteContextFactory(AlphaScope, Operator(AlphaScope));
        var alphaDocument = await SeedDocumentAsync(factory, AlphaScope, "1111111111", "alpha.doc");

        using var betaContext = factory.CreateContextFor(BetaScope, Operator(BetaScope));
        var betaPage = await new EfCoreDocumentDirectory(betaContext)
            .ListAsync(BetaScope, DocumentQuery.All, new PageRequest(), Today);

        Assert.Equal(0, betaPage.TotalCount);
        Assert.DoesNotContain(betaPage.Items, document => document.Id == alphaDocument.Id);
    }

    [Fact]
    public async Task A_document_reads_for_its_own_organization_and_is_missing_for_another()
    {
        using var factory = new SqliteContextFactory(AlphaScope, Operator(AlphaScope));
        var alphaDocument = await SeedDocumentAsync(factory, AlphaScope, "1111111111", "alpha.doc");

        using var betaContext = factory.CreateContextFor(BetaScope, Operator(BetaScope));

        var foundForAlpha = await new EfCoreDocumentDirectory(factory.Context)
            .FindByIdAsync(AlphaScope, alphaDocument.Id);
        var foundForBeta = await new EfCoreDocumentDirectory(betaContext)
            .FindByIdAsync(BetaScope, alphaDocument.Id);

        Assert.NotNull(foundForAlpha);
        Assert.Null(foundForBeta);
    }

    [Fact]
    public async Task A_storage_key_resolves_only_for_the_organization_owning_the_document()
    {
        using var factory = new SqliteContextFactory(AlphaScope, Operator(AlphaScope));
        var seeded = await SeedDocumentAsync(factory, AlphaScope, "1111111111", "alpha.doc", withPage: true);
        var storageKey = StorageKeyOf(seeded);

        using var betaContext = factory.CreateContextFor(BetaScope, Operator(BetaScope));

        var resolvedForAlpha = await new EfCoreDocumentDirectory(factory.Context)
            .FindPageByStorageKeyAsync(AlphaScope, storageKey);
        var resolvedForBeta = await new EfCoreDocumentDirectory(betaContext)
            .FindPageByStorageKeyAsync(BetaScope, storageKey);

        Assert.NotNull(resolvedForAlpha);
        Assert.Equal(seeded.Id, resolvedForAlpha.Document.Id);

        // The refusal must be indistinguishable from a key that never existed. Saying "that key belongs to
        // another organization" would confirm the key is real, which is exactly what a caller probing for
        // storage keys wants to learn.
        Assert.Null(resolvedForBeta);
    }

    [Fact]
    public async Task A_storage_key_resolves_to_its_own_document_and_not_another()
    {
        using var factory = new SqliteContextFactory(AlphaScope, Operator(AlphaScope));
        var first = await SeedDocumentAsync(factory, AlphaScope, "1111111111", "first.doc", withPage: true);
        await SeedDocumentAsync(factory, AlphaScope, "2222222222", "second.doc");

        var resolved = await new EfCoreDocumentDirectory(factory.Context)
            .FindPageByStorageKeyAsync(AlphaScope, StorageKeyOf(first));

        Assert.NotNull(resolved);
        Assert.Equal(first.Id, resolved.Document.Id);
        Assert.Equal(StorageKeyOf(first), resolved.Page.StorageKey);
    }

    [Fact]
    public async Task A_storage_key_of_an_unknown_or_empty_value_resolves_to_nothing()
    {
        using var factory = new SqliteContextFactory(AlphaScope, Operator(AlphaScope));
        var directory = new EfCoreDocumentDirectory(factory.Context);

        Assert.Null(await directory.FindPageByStorageKeyAsync(AlphaScope, "no/such/key.jpg"));
        Assert.Null(await directory.FindPageByStorageKeyAsync(AlphaScope, "   "));
        Assert.Null(await directory.FindPageByStorageKeyAsync(AlphaScope, string.Empty));
        Assert.Null(await directory.FindPageByStorageKeyAsync(TenantScope.None, "any/key.jpg"));
    }

    [Fact]
    public async Task An_empty_scope_yields_an_empty_listing_rather_than_every_document()
    {
        using var factory = new SqliteContextFactory(AlphaScope, Operator(AlphaScope));
        await SeedDocumentAsync(factory, AlphaScope, "1111111111", "alpha.doc");

        var page = await new EfCoreDocumentDirectory(factory.Context)
            .ListAsync(TenantScope.None, DocumentQuery.All, new PageRequest(), Today);

        // A principal whose scope failed to resolve must degrade to seeing nothing. Falling back to an
        // unfiltered query here would turn a broken scope into a platform-wide read.
        Assert.Equal(0, page.TotalCount);
    }

    [Fact]
    public async Task The_listing_narrows_by_verification_state_and_by_type()
    {
        using var factory = new SqliteContextFactory(AlphaScope, Operator(AlphaScope));
        await SeedDocumentAsync(factory, AlphaScope, "1111111111", "national_id");
        var second = await SeedDocumentAsync(factory, AlphaScope, "2222222222", "national_id", withPage: true);
        await VerifyAsync(factory, second, DateOnly.MaxValue);

        var directory = new EfCoreDocumentDirectory(factory.Context);

        var verifiedOnly = await directory.ListAsync(
            AlphaScope,
            new DocumentQuery(Status: DocumentStatus.Verified),
            new PageRequest(),
            Today);
        var wrongType = await directory.ListAsync(
            AlphaScope,
            new DocumentQuery(DocumentTypeCode: "passport"),
            new PageRequest(),
            Today);
        var byCode = await directory.ListAsync(
            AlphaScope,
            new DocumentQuery(DocumentTypeCode: "national_id"),
            new PageRequest(),
            Today);
        var byPerson = await directory.ListAsync(
            AlphaScope,
            new DocumentQuery(UserId: Guid.NewGuid()),
            new PageRequest(),
            Today);

        Assert.Equal([second.Id], verifiedOnly.Items.Select(document => document.Id));
        Assert.Equal(0, wrongType.TotalCount);
        Assert.Equal(2, byCode.TotalCount);
        Assert.Equal(0, byPerson.TotalCount);
    }

    [Fact]
    public async Task The_listing_is_newest_first_and_never_repeats_a_document_across_pages()
    {
        using var factory = new SqliteContextFactory(AlphaScope, Operator(AlphaScope));
        await SeedDocumentAsync(factory, AlphaScope, "1111111111", "one.doc");
        await SeedDocumentAsync(factory, AlphaScope, "2222222222", "two.doc");
        await SeedDocumentAsync(factory, AlphaScope, "3333333333", "three.doc");

        var directory = new EfCoreDocumentDirectory(factory.Context);

        var first = await directory.ListAsync(AlphaScope, DocumentQuery.All, new PageRequest(1, 2), Today);
        var second = await directory.ListAsync(AlphaScope, DocumentQuery.All, new PageRequest(2, 2), Today);

        Assert.Equal(3, first.TotalCount);
        Assert.True(first.HasNextPage);
        Assert.Equal(2, first.Items.Count);
        Assert.Single(second.Items);

        // A document appearing on both pages is the failure that makes paging unusable for a review queue,
        // so the page split is asserted rather than assumed.
        Assert.Empty(first.Items.Select(item => item.Id).Intersect(second.Items.Select(item => item.Id)));
    }

    [Fact]
    public async Task The_currently_valid_filter_reads_the_caller_date_and_still_accepts_the_expiry_day()
    {
        using var factory = new SqliteContextFactory(AlphaScope, Operator(AlphaScope));
        var expiring = await SeedDocumentAsync(factory, AlphaScope, "1111111111", "expiring.doc", withPage: true);
        await VerifyAsync(factory, expiring, Today);

        var directory = new EfCoreDocumentDirectory(factory.Context);

        var onTheDay = await directory.ListAsync(
            AlphaScope,
            new DocumentQuery(OnlyCurrentlyValid: true),
            new PageRequest(),
            Today);
        var theNextDay = await directory.ListAsync(
            AlphaScope,
            new DocumentQuery(OnlyCurrentlyValid: true),
            new PageRequest(),
            Today.AddDays(1));
        var theDayBefore = await directory.ListAsync(
            AlphaScope,
            new DocumentQuery(OnlyCurrentlyValid: false),
            new PageRequest(),
            Today);

        // A document is valid through its expiry date; the domain would not let it expire before it was
        // verified, so the filter has to agree with that same boundary rather than inventing another.
        Assert.Equal([expiring.Id], onTheDay.Items.Select(document => document.Id));
        Assert.Empty(theNextDay.Items);
        Assert.DoesNotContain(theDayBefore.Items, document => document.Id == expiring.Id);
    }

    [Fact]
    public async Task The_document_type_catalogue_is_platform_wide_and_shared_by_every_organization()
    {
        using var factory = new SqliteContextFactory(AlphaScope, Operator(AlphaScope));
        await SeedTypeAsync(factory, "NATIONAL_ID", "National Identity Card", "کارت ملی");

        using var betaContext = factory.CreateContextFor(BetaScope, Operator(BetaScope));

        var forAlpha = await new EfCoreDocumentTypeCatalog(factory.Context).FindActiveByCodeAsync("national_id");
        var forBeta = await new EfCoreDocumentTypeCatalog(betaContext).FindActiveByCodeAsync("national_id");

        // One catalogue rather than one per organization: a national ID card is the same physical document
        // for both, and a per-tenant copy would drift the first time either side renamed it.
        Assert.NotNull(forAlpha);
        Assert.NotNull(forBeta);
        Assert.Equal(forAlpha.Id, forBeta.Id);
    }

    [Fact]
    public async Task A_withdrawn_document_type_leaves_the_active_lookup_but_stays_resolvable()
    {
        using var factory = new SqliteContextFactory(AlphaScope, Operator(AlphaScope));
        var type = await SeedTypeAsync(factory, "passport", "Passport", "گذرنامه");
        type.Deactivate();
        await factory.Context.SaveChangesAsync();
        factory.Context.ChangeTracker.Clear();

        var catalog = new EfCoreDocumentTypeCatalog(factory.Context);

        // Documents already filed under a withdrawn type must stay readable, so the type stays resolvable.
        // What is withdrawn is the ability to attach a new document to it, and that is decided by asking for
        // the active entry.
        Assert.Null(await catalog.FindActiveByCodeAsync("passport"));
        Assert.NotNull(await catalog.FindByCodeAsync("passport"));
        Assert.NotNull(await catalog.FindByIdAsync(type.Id));
        Assert.True(await catalog.CodeExistsAsync("passport"));
    }

    [Fact]
    public async Task The_catalogue_listing_hides_withdrawn_types_unless_asked_for()
    {
        using var factory = new SqliteContextFactory(AlphaScope, Operator(AlphaScope));
        var active = await SeedTypeAsync(factory, "national_id", "National Identity Card", "کارت ملی");
        var withdrawn = await SeedTypeAsync(factory, "passport", "Passport", "گذرنامه");
        withdrawn.Deactivate();
        await factory.Context.SaveChangesAsync();

        var catalog = new EfCoreDocumentTypeCatalog(factory.Context);

        var activeOnly = await catalog.ListAsync(includeInactive: false, search: null, new PageRequest());
        var everything = await catalog.ListAsync(includeInactive: true, search: null, new PageRequest());

        Assert.Equal([active.Id], activeOnly.Items.Select(type => type.Id));
        Assert.Equal(2, everything.TotalCount);
    }

    [Fact]
    public async Task The_catalogue_search_matches_the_code_and_either_title()
    {
        using var factory = new SqliteContextFactory(AlphaScope, Operator(AlphaScope));
        await SeedTypeAsync(factory, "national_id", "National Identity Card", "کارت ملی");
        await SeedTypeAsync(factory, "passport", "Passport", "گذرنامه");

        var catalog = new EfCoreDocumentTypeCatalog(factory.Context);

        Assert.Single((await catalog.ListAsync(true, "passport", new PageRequest())).Items);
        Assert.Single((await catalog.ListAsync(true, "کارت", new PageRequest())).Items);
        Assert.Single((await catalog.ListAsync(true, "identity", new PageRequest())).Items);
        Assert.Empty((await catalog.ListAsync(true, "nothing-matches", new PageRequest())).Items);
    }

    [Fact]
    public async Task A_bulk_catalogue_load_skips_types_that_do_not_exist()
    {
        using var factory = new SqliteContextFactory(AlphaScope, Operator(AlphaScope));
        var known = await SeedTypeAsync(factory, "national_id", "National Identity Card", "کارت ملی");

        var catalog = new EfCoreDocumentTypeCatalog(factory.Context);

        Assert.Equal([known.Id], (await catalog.LoadByIdsAsync([known.Id, Guid.NewGuid()])).Keys);
        Assert.Empty(await catalog.LoadByIdsAsync([]));
    }

    [Fact]
    public async Task A_folder_is_found_only_for_the_organization_owning_it()
    {
        using var factory = new SqliteContextFactory(AlphaScope, Operator(AlphaScope));
        var user = NewUser("+989121112241");
        var folder = DigitalFolder.CreateFor(user.Id, AlphaScope, SqliteContextFactory.FixedTime);
        factory.Context.AddRange(user, folder);
        await factory.Context.SaveChangesAsync();

        using var betaContext = factory.CreateContextFor(BetaScope, Operator(BetaScope));

        Assert.NotNull(await new EfCoreDigitalFolderDirectory(factory.Context).FindByUserAsync(AlphaScope, user.Id));
        Assert.Null(await new EfCoreDigitalFolderDirectory(betaContext).FindByUserAsync(BetaScope, user.Id));

        // Existence is deliberately unscoped: it answers only whether the identity's one folder is already
        // taken, which is a fact about the person rather than about one organization's dossier. It therefore
        // has to see through the ambient filter.
        Assert.True(await new EfCoreDigitalFolderDirectory(betaContext).ExistsForUserAsync(user.Id));
        Assert.False(await new EfCoreDigitalFolderDirectory(betaContext).ExistsForUserAsync(Guid.NewGuid()));
    }

    private static User NewUser(string mobile)
        => User.Register(Guid.NewGuid(), AlphaScope, MobileNumber.Create(mobile), UserSource.MobileRegistration);

    private static async Task<DocumentType> SeedTypeAsync(SqliteContextFactory factory, string code, string title, string titleFa)
    {
        var type = new DocumentType(
            Guid.NewGuid(),
            code,
            title,
            titleFa,
            DocumentCategory.Identity,
            requiresBackSide: false,
            defaultValidityDays: null,
            isIdentityDocument: true);

        factory.Context.DocumentTypes.Add(type);
        await factory.Context.SaveChangesAsync();
        return type;
    }

    private static async Task<IdentityDocument> SeedDocumentAsync(
        SqliteContextFactory factory,
        TenantScope scope,
        string referenceNumber,
        string code,
        bool withPage = false)
    {
        var type = factory.Context.DocumentTypes.Local
            .Concat(factory.Context.DocumentTypes)
            .FirstOrDefault(candidate => string.Equals(candidate.Code, code, StringComparison.OrdinalIgnoreCase));

        if (type is null)
        {
            type = new DocumentType(
                Guid.NewGuid(),
                code,
                code,
                code,
                DocumentCategory.Identity,
                requiresBackSide: false,
                defaultValidityDays: null,
                isIdentityDocument: true);
            factory.Context.DocumentTypes.Add(type);
        }

        var document = IdentityDocument.Create(Guid.NewGuid(), Guid.NewGuid(), type.Id, scope, referenceNumber);
        factory.Context.IdentityDocuments.Add(document);

        string? storageKey = null;
        if (withPage)
        {
            storageKey = $"{code}/page-1.jpg";
            var added = document.AddPage(
                Guid.NewGuid(),
                1,
                DocumentSide.Front,
                storageKey,
                "image/jpeg",
                2048,
                new string('a', 64),
                new DocumentCaptureQuality(0.8d, 0.5d, 0.6d, true, true, false),
                SqliteContextFactory.FixedTime);

            if (added.IsFailure)
            {
                Assert.Fail($"The seeded page was refused: {added.Errors[0].Description}");
            }
        }

        await factory.Context.SaveChangesAsync();
        return document;
    }

    private static string StorageKeyOf(IdentityDocument document) => Assert.Single(document.Pages).StorageKey;

    private static async Task VerifyAsync(SqliteContextFactory factory, IdentityDocument document, DateOnly expiresOn)
    {
        // Validity is set before verifying and narrowed afterwards: the aggregate refuses to verify a document
        // that has already expired, so reaching a real expiry edge takes two steps.
        Assert.True(document.SetValidity(new DateOnly(2025, 1, 1), DateOnly.MaxValue).IsSuccess);
        Assert.True(document
            .Verify(requiresBackSide: false, SqliteContextFactory.FixedTime, Reviewer, VerificationMethod.DocumentReview, null, new FixedClock(SqliteContextFactory.FixedTime))
            .IsSuccess);
        Assert.True(document.SetValidity(new DateOnly(2025, 1, 1), expiresOn).IsSuccess);

        await factory.Context.SaveChangesAsync();
    }
}