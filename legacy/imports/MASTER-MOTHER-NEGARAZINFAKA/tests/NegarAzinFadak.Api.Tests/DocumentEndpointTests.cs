using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using NegarAzinFadak.Api.Authentication;
using NegarAzinFadak.Api.Authorization;
using NegarAzinFadak.Core.Tenancy;

namespace NegarAzinFadak.Api.Tests;

/// <summary>
/// The identity document surface over a real host, a real database and real private storage: what a document
/// reveals, who may ask for it, and what one organization can never learn about another.
/// </summary>
/// <remarks>
/// <para>
/// A document is the most sensitive thing the platform holds — it is a picture of somebody's identity card and
/// it exists on disk exactly once. So the properties tested here are deliberately about refusals rather than
/// successes: an unauthenticated caller, a caller with the wrong permission, and a caller from another
/// organization must all be turned away, and the refusal must not confirm that the thing they asked about
/// exists.
/// </para>
/// <para>
/// The isolation tests use two unrelated organizations. A single-tenant fixture would pass a surface that
/// ignored its scope entirely, which is the failure this module is most able to have.
/// </para>
/// </remarks>
public sealed class DocumentEndpointTests : IClassFixture<ApiHostFactory>, IDisposable
{
    private const string NationalId = "national_id";

    private readonly ApiHostFactory _factory;
    private readonly HttpClient _client;

    public DocumentEndpointTests(ApiHostFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public void Dispose() => _client.Dispose();

    [Fact]
    public async Task An_anonymous_caller_cannot_reach_any_part_of_the_document_surface()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.GetAsync("/api/v1/identity/documents/")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.GetAsync("/api/v1/identity/document-types/")).StatusCode);
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await _client.PostAsJsonAsync("/api/v1/identity/documents/", new { })).StatusCode);
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await _client.GetAsync($"/api/v1/identity/users/{Guid.NewGuid()}/folder/")).StatusCode);
    }

    [Fact]
    public async Task A_caller_without_the_document_read_permission_is_forbidden()
    {
        var scope = new TenantScope(Guid.NewGuid());
        using var request = Authorized(HttpMethod.Get, "/api/v1/identity/documents/", scope, [Permissions.RoleRead]);

        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(request)).StatusCode);
    }

    [Fact]
    public async Task Reading_a_document_requires_the_read_permission_and_not_only_the_write_one()
    {
        var scope = new TenantScope(Guid.NewGuid());
        using var writeOnly = Authorized(
            HttpMethod.Get,
            "/api/v1/identity/documents/",
            scope,
            [Permissions.DocumentWrite]);

        // Reading a person's identity document is the sensitive act, not filing one. A role that can attach
        // documents but not read them would otherwise be a way to reach the whole dossier.
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(writeOnly)).StatusCode);
    }

    [Fact]
    public async Task The_base_catalogue_is_published_at_startup()
    {
        var scope = new TenantScope(Guid.NewGuid());
        using var list = Authorized(HttpMethod.Get, "/api/v1/identity/document-types/", scope, [Permissions.DocumentRead]);

        var page = await (await _client.SendAsync(list)).Content.ReadFromJsonAsync<JsonElement>();

        // The five types in configuration must be there without anybody having to define them by hand, or a
        // fresh deployment could not accept a national ID at all.
        var codes = page.GetProperty("items").EnumerateArray()
            .Select(item => item.GetProperty("code").GetString())
            .ToArray();

        Assert.Equal(5, codes.Length);
        Assert.Contains("NATIONAL_ID", codes);
        Assert.Contains("PASSPORT", codes);
        Assert.Contains("BIRTH_CERTIFICATE", codes);
    }

    [Fact]
    public async Task A_document_type_can_be_read_by_code_in_any_casing()
    {
        var scope = new TenantScope(Guid.NewGuid());
        using var read = Authorized(
            HttpMethod.Get,
            $"/api/v1/identity/document-types/{NationalId.ToUpperInvariant()}",
            scope,
            [Permissions.DocumentRead]);

        var response = await _client.SendAsync(read);
        var type = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("NATIONAL_ID", type.GetProperty("code").GetString());

        // The Persian title is what the Persian-first client renders, so a type without one would be a blank
        // row in the only interface most operators use.
        Assert.False(string.IsNullOrWhiteSpace(type.GetProperty("titlePersian").GetString()));
    }

    [Fact]
    public async Task An_unknown_document_type_is_not_found()
    {
        var scope = new TenantScope(Guid.NewGuid());
        using var read = Authorized(
            HttpMethod.Get,
            "/api/v1/identity/document-types/no_such_type",
            scope,
            [Permissions.DocumentRead]);

        Assert.Equal(HttpStatusCode.NotFound, (await _client.SendAsync(read)).StatusCode);
    }

    [Fact]
    public async Task A_new_document_type_can_be_defined_and_defining_it_twice_conflicts()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var code = NewCode();

        using var first = Authorized(HttpMethod.Post, "/api/v1/identity/document-types/", scope, [Permissions.DocumentWrite],
            new { code, title = "Trade Licence", titlePersian = "پروانه کسب", category = "Employment", maxPages = 3 });

        var created = await _client.SendAsync(first);

        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        using var second = Authorized(HttpMethod.Post, "/api/v1/identity/document-types/", scope, [Permissions.DocumentWrite],
            new { code, title = "Trade Licence", titlePersian = "پروانه کسب", category = "Employment", maxPages = 3 });

        var conflict = await _client.SendAsync(second);

        // Two rows for one code would make "which type is this?" unanswerable for every document filed
        // against it afterwards.
        Assert.Equal(HttpStatusCode.Conflict, conflict.StatusCode);
    }

    [Fact]
    public async Task A_document_type_with_an_unusable_code_or_category_is_refused()
    {
        var scope = new TenantScope(Guid.NewGuid());

        using var badCode = Authorized(HttpMethod.Post, "/api/v1/identity/document-types/", scope, [Permissions.DocumentWrite],
            new { code = "کارت ملی", title = "Anything", titlePersian = "چیزی", category = "Identity", maxPages = 1 });
        using var badCategory = Authorized(HttpMethod.Post, "/api/v1/identity/document-types/", scope, [Permissions.DocumentWrite],
            new { code = NewCode(), title = "Anything", titlePersian = "چیزی", category = "Finanical", maxPages = 1 });
        using var noPages = Authorized(HttpMethod.Post, "/api/v1/identity/document-types/", scope, [Permissions.DocumentWrite],
            new { code = NewCode(), title = "Anything", titlePersian = "چیزی", category = "Identity", maxPages = 0 });

        Assert.Equal(HttpStatusCode.BadRequest, (await _client.SendAsync(badCode)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.SendAsync(badCategory)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.SendAsync(noPages)).StatusCode);
    }

    [Fact]
    public async Task A_deactivated_document_type_cannot_be_attached_to_anyone()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var code = NewCode();
        await DefineTypeAsync(scope, code, maxPages: 1);

        using var deactivate = Authorized(
            HttpMethod.Post,
            $"/api/v1/identity/document-types/{code}/deactivate",
            scope,
            [Permissions.DocumentWrite]);

        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(deactivate)).StatusCode);

        var person = await RegisterIdentityAsync(scope);
        using var attach = Authorized(HttpMethod.Post, "/api/v1/identity/documents/", scope, [Permissions.DocumentWrite],
            new { userId = person.GetProperty("id").GetGuid(), documentType = code });

        Assert.Equal(HttpStatusCode.NotFound, (await _client.SendAsync(attach)).StatusCode);
    }

    [Fact]
    public async Task A_document_is_attached_to_an_identity_of_the_callers_own_organization()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var person = await RegisterIdentityAsync(scope);

        using var attach = Authorized(HttpMethod.Post, "/api/v1/identity/documents/", scope, [Permissions.DocumentWrite],
            new { userId = person.GetProperty("id").GetGuid(), documentType = NationalId, referenceNumber = "0012345678" });

        var response = await _client.SendAsync(attach);
        var document = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("NATIONAL_ID", document.GetProperty("documentTypeCode").GetString());

        // A freshly attached document is unverified: nothing has been read off it yet, and no amount of
        // permission on the request can make it otherwise.
        Assert.Equal("Unverified", document.GetProperty("status").GetString());
        Assert.Equal(0, document.GetProperty("pageCount").GetInt32());

        // A document starts unverified no matter who filed it, because nothing has been checked yet.
        Assert.False(document.GetProperty("isCurrentlyValid").GetBoolean());
    }

    [Fact]
    public async Task A_document_cannot_be_attached_to_an_identity_of_another_organization()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var other = new TenantScope(Guid.NewGuid());
        var personOfAnotherTenant = await RegisterIdentityAsync(other);

        using var attach = Authorized(HttpMethod.Post, "/api/v1/identity/documents/", scope, [Permissions.DocumentWrite],
            new { userId = personOfAnotherTenant.GetProperty("id").GetGuid(), documentType = NationalId });

        Assert.Equal(HttpStatusCode.NotFound, (await _client.SendAsync(attach)).StatusCode);
    }

    [Fact]
    public async Task A_document_cannot_be_attached_under_an_unknown_type()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var person = await RegisterIdentityAsync(scope);

        using var attach = Authorized(HttpMethod.Post, "/api/v1/identity/documents/", scope, [Permissions.DocumentWrite],
            new { userId = person.GetProperty("id").GetGuid(), documentType = "no_such_type" });

        Assert.Equal(HttpStatusCode.NotFound, (await _client.SendAsync(attach)).StatusCode);
    }

    [Fact]
    public async Task A_captured_page_is_stored_and_answered_only_through_an_expiring_authorized_link()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var person = await RegisterIdentityAsync(scope);
        var documentId = await AttachAsync(scope, person.GetProperty("id").GetGuid(), NationalId);
        var content = CaptureBytes();

        using var upload = Authorized(HttpMethod.Post, $"/api/v1/identity/documents/{documentId}/pages", scope, [Permissions.DocumentWrite]);
        upload.Content = Multipart("content", content, "image/jpeg", "Front");

        var uploaded = await _client.SendAsync(upload);
        var page = await uploaded.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.Created, uploaded.StatusCode);
        Assert.Equal(1, page.GetProperty("pageNumber").GetInt32());

        // Nothing that identifies where the bytes live is allowed back to a client. A storage key in a
        // response body is one link away from being a permanent public URL.
        Assert.False(page.TryGetProperty("storageKey", out _));

        using var detail = Authorized(HttpMethod.Get, $"/api/v1/identity/documents/{documentId}", scope, [Permissions.DocumentRead]);
        var read = await _client.SendAsync(detail);
        var details = await read.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, read.StatusCode);
        Assert.Equal(1, details.GetProperty("document").GetProperty("pageCount").GetInt32());
        Assert.False(details.GetProperty("pages")[0].TryGetProperty("storageKey", out _));

        var pageId = details.GetProperty("pages")[0].GetProperty("id").GetGuid();
        using var link = Authorized(
            HttpMethod.Get,
            $"/api/v1/identity/documents/{documentId}/pages/{pageId}/content",
            scope,
            [Permissions.DocumentRead]);

        var grantResponse = await _client.SendAsync(link);
        var grant = await grantResponse.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, grantResponse.StatusCode);
        Assert.Equal("image/jpeg", grant.GetProperty("contentType").GetString());
        Assert.True(grant.GetProperty("expiresAt").GetDateTimeOffset() > DateTimeOffset.UtcNow);

        var url = grant.GetProperty("url").GetString()!;
        using var stream = await AuthorizedGetAsync(ToPath(url), scope, [Permissions.DocumentRead]);
        var bytes = await stream.Content.ReadAsByteArrayAsync();

        // The link is the only way in, it carries the caller's own authorization, and it returns exactly the
        // bytes that were uploaded.
        Assert.Equal(HttpStatusCode.OK, stream.StatusCode);
        Assert.Equal("image/jpeg", stream.Content.Headers.ContentType?.MediaType);
        Assert.Equal(content, bytes);
    }

    [Fact]
    public async Task Document_bytes_are_refused_to_a_caller_without_the_read_permission()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var person = await RegisterIdentityAsync(scope);
        var documentId = await AttachAsync(scope, person.GetProperty("id").GetGuid(), NationalId);
        var pageId = await UploadFrontPageAsync(scope, documentId);
        var path = await ContentPathAsync(scope, documentId, pageId);

        using var withoutRead = Authorized(HttpMethod.Get, path, scope, [Permissions.DocumentWrite]);
        using var anonymous = new HttpRequestMessage(HttpMethod.Get, path);

        // Holding the link is not the same as being allowed to use it. Both the grant and the bytes are
        // separately gated, so leaking a URL is not enough.
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(withoutRead)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.SendAsync(anonymous)).StatusCode);
    }

    [Fact]
    public async Task Document_bytes_of_another_organization_are_indistinguishable_from_bytes_that_do_not_exist()
    {
        var ownerScope = new TenantScope(Guid.NewGuid());
        var otherScope = new TenantScope(Guid.NewGuid());
        var person = await RegisterIdentityAsync(ownerScope);
        var documentId = await AttachAsync(ownerScope, person.GetProperty("id").GetGuid(), NationalId);
        var pageId = await UploadFrontPageAsync(ownerScope, documentId);
        var path = await ContentPathAsync(ownerScope, documentId, pageId);

        using var byDocumentId = Authorized(
            HttpMethod.Get,
            $"/api/v1/identity/documents/{documentId}/pages/{pageId}/content",
            otherScope,
            [Permissions.DocumentRead]);
        using var byStorageKey = Authorized(HttpMethod.Get, path, otherScope, [Permissions.DocumentRead]);
        using var unknownKey = Authorized(HttpMethod.Get, "/api/v1/identity/documents/content/no-such-key.jpg", otherScope, [Permissions.DocumentRead]);

        var foreignDocument = await _client.SendAsync(byDocumentId);
        var foreignKey = await _client.SendAsync(byStorageKey);
        var absent = await _client.SendAsync(unknownKey);

        // A valid key belonging to another organization and a key that never existed must be indistinguishable.
        // Answering "forbidden" for one and "not found" for the other would confirm the key is real, which is
        // precisely what somebody probing for document storage is looking for.
        Assert.Equal(HttpStatusCode.NotFound, foreignDocument.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, foreignKey.StatusCode);
        Assert.Equal(absent.StatusCode, foreignKey.StatusCode);
    }

    [Fact]
    public async Task A_document_of_another_organization_is_invisible_in_the_listing_and_the_detail_read()
    {
        var ownerScope = new TenantScope(Guid.NewGuid());
        var otherScope = new TenantScope(Guid.NewGuid());
        var person = await RegisterIdentityAsync(ownerScope);
        var documentId = await AttachAsync(ownerScope, person.GetProperty("id").GetGuid(), NationalId);

        using var list = Authorized(HttpMethod.Get, "/api/v1/identity/documents/", otherScope, [Permissions.DocumentRead]);
        using var detail = Authorized(HttpMethod.Get, $"/api/v1/identity/documents/{documentId}", otherScope, [Permissions.DocumentRead]);

        var page = await (await _client.SendAsync(list)).Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(0, page.GetProperty("totalCount").GetInt32());
        Assert.Empty(page.GetProperty("items").EnumerateArray());
        Assert.Equal(HttpStatusCode.NotFound, (await _client.SendAsync(detail)).StatusCode);
    }

    [Fact]
    public async Task The_listing_can_be_narrowed_to_one_identity()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var person = await RegisterIdentityAsync(scope);
        var another = await RegisterIdentityAsync(scope);
        var documentId = await AttachAsync(scope, person.GetProperty("id").GetGuid(), NationalId);
        await AttachAsync(scope, another.GetProperty("id").GetGuid(), "passport");

        using var list = Authorized(
            HttpMethod.Get,
            $"/api/v1/identity/documents/?userId={person.GetProperty("id").GetGuid()}",
            scope,
            [Permissions.DocumentRead]);

        var page = await (await _client.SendAsync(list)).Content.ReadFromJsonAsync<JsonElement>();
        var rows = page.GetProperty("items").EnumerateArray().ToArray();

        Assert.Equal(1, page.GetProperty("totalCount").GetInt32());
        Assert.Equal(documentId, rows[0].GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task A_status_filter_that_is_not_a_status_is_refused()
    {
        var scope = new TenantScope(Guid.NewGuid());
        using var list = Authorized(
            HttpMethod.Get,
            "/api/v1/identity/documents/?status=ProbablyFine",
            scope,
            [Permissions.DocumentRead]);

        Assert.Equal(HttpStatusCode.BadRequest, (await _client.SendAsync(list)).StatusCode);
    }

    [Fact]
    public async Task A_page_cannot_be_uploaded_to_a_document_of_another_organization()
    {
        var ownerScope = new TenantScope(Guid.NewGuid());
        var otherScope = new TenantScope(Guid.NewGuid());
        var person = await RegisterIdentityAsync(ownerScope);
        var documentId = await AttachAsync(ownerScope, person.GetProperty("id").GetGuid(), NationalId);

        using var upload = Authorized(HttpMethod.Post, $"/api/v1/identity/documents/{documentId}/pages", otherScope, [Permissions.DocumentWrite]);
        upload.Content = Multipart("content", CaptureBytes(), "image/jpeg");

        var response = await _client.SendAsync(upload);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task A_capture_the_platform_cannot_read_is_refused_and_nothing_is_stored()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var person = await RegisterIdentityAsync(scope);
        var documentId = await AttachAsync(scope, person.GetProperty("id").GetGuid(), NationalId);

        // A flat grey frame: the objective failure the baseline analyzer exists to catch.
        using var upload = Authorized(HttpMethod.Post, $"/api/v1/identity/documents/{documentId}/pages", scope, [Permissions.DocumentWrite]);
        upload.Content = Multipart("content", new byte[4096], "image/jpeg");

        var refused = await _client.SendAsync(upload);

        Assert.Equal(HttpStatusCode.BadRequest, refused.StatusCode);
        Assert.Equal("identity.document.capture_unacceptable", await FirstErrorCodeAsync(refused));

        using var detail = Authorized(HttpMethod.Get, $"/api/v1/identity/documents/{documentId}", scope, [Permissions.DocumentRead]);
        var details = await (await _client.SendAsync(detail)).Content.ReadFromJsonAsync<JsonElement>();

        // The refusal has to be complete: a page count of one here would mean an unreadable image was kept
        // and every later reviewer would be shown it.
        Assert.Equal(0, details.GetProperty("document").GetProperty("pageCount").GetInt32());
    }

    [Fact]
    public async Task A_page_larger_than_the_configured_ceiling_is_refused()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var person = await RegisterIdentityAsync(scope);
        var documentId = await AttachAsync(scope, person.GetProperty("id").GetGuid(), NationalId);

        var ceiling = await MaximumPageSizeAsync();
        using var upload = Authorized(HttpMethod.Post, $"/api/v1/identity/documents/{documentId}/pages", scope, [Permissions.DocumentWrite]);
        upload.Content = Multipart("content", CaptureBytes(checked((int)ceiling + 1)), "image/jpeg");

        var refused = await _client.SendAsync(upload);

        Assert.Equal(HttpStatusCode.BadRequest, refused.StatusCode);
        Assert.Equal("identity.document.page_too_large", await FirstErrorCodeAsync(refused));
    }

    [Fact]
    public async Task A_capture_sent_with_no_content_is_refused()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var person = await RegisterIdentityAsync(scope);
        var documentId = await AttachAsync(scope, person.GetProperty("id").GetGuid(), NationalId);

        using var upload = Authorized(HttpMethod.Post, $"/api/v1/identity/documents/{documentId}/pages", scope, [Permissions.DocumentWrite]);
        upload.Content = new MultipartFormDataContent();

        var refused = await _client.SendAsync(upload);

        Assert.Equal(HttpStatusCode.BadRequest, refused.StatusCode);
    }

    [Fact]
    public async Task A_document_accepts_only_as_many_pages_as_its_type_allows()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var person = await RegisterIdentityAsync(scope);

        // A birth certificate allows four pages, so the first and second succeed and the fifth is refused.
        var documentId = await AttachAsync(scope, person.GetProperty("id").GetGuid(), "birth_certificate");

        for (var page = 1; page <= 4; page++)
        {
            using var upload = Authorized(HttpMethod.Post, $"/api/v1/identity/documents/{documentId}/pages", scope, [Permissions.DocumentWrite]);
            upload.Content = Multipart("content", CaptureBytes(), "image/jpeg", "Page");

            Assert.Equal(HttpStatusCode.Created, (await _client.SendAsync(upload)).StatusCode);
        }

        using var fifth = Authorized(HttpMethod.Post, $"/api/v1/identity/documents/{documentId}/pages", scope, [Permissions.DocumentWrite]);
        fifth.Content = Multipart("content", CaptureBytes(), "image/jpeg", "Page");

        var refused = await _client.SendAsync(fifth);

        // The limit is the configured one, not a number written into the service, and refusing here is what
        // stops a document from growing without bound behind a request nobody approved.
        Assert.Equal(HttpStatusCode.UnprocessableEntity, refused.StatusCode);
        Assert.Equal("identity.document.max_pages_exceeded", await FirstErrorCodeAsync(refused));
    }

    [Fact]
    public async Task Validity_is_recorded_on_the_document_and_an_impossible_range_is_refused()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var person = await RegisterIdentityAsync(scope);
        var documentId = await AttachAsync(scope, person.GetProperty("id").GetGuid(), NationalId);

        using var set = Authorized(HttpMethod.Put, $"/api/v1/identity/documents/{documentId}/validity", scope, [Permissions.DocumentWrite],
            new { issuedOn = "2025-01-01", expiresOn = "2035-01-01" });

        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(set)).StatusCode);

        using var read = Authorized(HttpMethod.Get, $"/api/v1/identity/documents/{documentId}", scope, [Permissions.DocumentRead]);
        var document = await (await _client.SendAsync(read)).Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal("2035-01-01", document.GetProperty("document").GetProperty("expiresOn").GetString());
        Assert.Equal("2025-01-01", document.GetProperty("document").GetProperty("issuedOn").GetString());

        // A document that expired before it was issued is a contradiction, and storing it would make every
        // later "is this still valid?" answer wrong.
        using var impossible = Authorized(HttpMethod.Put, $"/api/v1/identity/documents/{documentId}/validity", scope, [Permissions.DocumentWrite],
            new { issuedOn = "2035-01-01", expiresOn = "2025-01-01" });

        Assert.Equal(HttpStatusCode.BadRequest, (await _client.SendAsync(impossible)).StatusCode);
    }

    [Fact]
    public async Task An_identity_has_exactly_one_folder_however_many_times_it_is_asked_for()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var person = await RegisterIdentityAsync(scope);
        var userId = person.GetProperty("id").GetGuid();

        using var first = Authorized(HttpMethod.Post, $"/api/v1/identity/users/{userId}/folder", scope, [Permissions.DocumentWrite]);
        using var second = Authorized(HttpMethod.Post, $"/api/v1/identity/users/{userId}/folder", scope, [Permissions.DocumentWrite]);

        var created = await _client.SendAsync(first);
        var again = await _client.SendAsync(second);
        var folder = await created.Content.ReadFromJsonAsync<JsonElement>();
        var sameFolder = await again.Content.ReadFromJsonAsync<JsonElement>();

        // Two folders for one person would be two places for a document to be filed, and only one of them
        // would ever be reviewed. Answering the same folder either way is what makes this safe to call twice
        // from a retry.
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        Assert.Equal(folder.GetProperty("id").GetGuid(), sameFolder.GetProperty("id").GetGuid());
        Assert.Empty(folder.GetProperty("entries").EnumerateArray());
    }

    [Fact]
    public async Task The_folder_of_an_identity_of_another_organization_is_invisible()
    {
        var ownerScope = new TenantScope(Guid.NewGuid());
        var otherScope = new TenantScope(Guid.NewGuid());
        var person = await RegisterIdentityAsync(ownerScope);
        var userId = person.GetProperty("id").GetGuid();
        using var create = Authorized(HttpMethod.Post, $"/api/v1/identity/users/{userId}/folder", ownerScope, [Permissions.DocumentWrite]);
        await _client.SendAsync(create);

        using var read = Authorized(HttpMethod.Get, $"/api/v1/identity/users/{userId}/folder", otherScope, [Permissions.DocumentRead]);

        Assert.Equal(HttpStatusCode.NotFound, (await _client.SendAsync(read)).StatusCode);
    }

    [Fact]
    public async Task A_document_becomes_visible_in_the_folder_only_after_it_has_been_reviewed()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var person = await RegisterIdentityAsync(scope);
        var userId = person.GetProperty("id").GetGuid();
        var documentId = await AttachAsync(scope, userId, NationalId);
        await UploadFrontPageAsync(scope, documentId);

        using var create = Authorized(HttpMethod.Post, $"/api/v1/identity/users/{userId}/folder", scope, [Permissions.DocumentWrite]);
        await _client.SendAsync(create);

        using var add = Authorized(HttpMethod.Post, $"/api/v1/identity/users/{userId}/folder/entries", scope, [Permissions.DocumentWrite],
            new { identityDocumentId = documentId, title = "کارت ملی" });

        var entry = await (await _client.SendAsync(add)).Content.ReadFromJsonAsync<JsonElement>();
        var entryId = entry.GetProperty("id").GetGuid();

        Assert.Equal("Pending", entry.GetProperty("reviewStatus").GetString());

        // An entry appears in the dossier only once a reviewer has accepted it, so an unreviewed or rejected
        // document can never be presented as part of somebody's verified file.
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(ReviewAsync(scope, userId, entryId, approve: true, without: [Permissions.IdentityVerify]))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.SendAsync(ReviewAsync(scope, userId, entryId, approve: true, with: [Permissions.IdentityVerify]))).StatusCode);

        using var read = Authorized(HttpMethod.Get, $"/api/v1/identity/users/{userId}/folder", scope, [Permissions.DocumentRead]);
        var folder = await (await _client.SendAsync(read)).Content.ReadFromJsonAsync<JsonElement>();
        var entries = folder.GetProperty("entries").EnumerateArray().ToArray();

        Assert.Single(entries);
        Assert.Equal("Approved", entries[0].GetProperty("reviewStatus").GetString());
        Assert.Equal(documentId, entries[0].GetProperty("identityDocumentId").GetGuid());
    }

    [Fact]
    public async Task A_rejected_folder_entry_never_reaches_the_dossier()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var person = await RegisterIdentityAsync(scope);
        var userId = person.GetProperty("id").GetGuid();
        var documentId = await AttachAsync(scope, userId, NationalId);
        await UploadFrontPageAsync(scope, documentId);

        using var create = Authorized(HttpMethod.Post, $"/api/v1/identity/users/{userId}/folder", scope, [Permissions.DocumentWrite]);
        await _client.SendAsync(create);

        using var add = Authorized(HttpMethod.Post, $"/api/v1/identity/users/{userId}/folder/entries", scope, [Permissions.DocumentWrite],
            new { identityDocumentId = documentId });
        var entryId = (await (await _client.SendAsync(add)).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        using var refuse = ReviewAsync(scope, userId, entryId, approve: false, with: [Permissions.IdentityVerify], notes: "تصویر ناخوانا است.");

        Assert.Equal(HttpStatusCode.OK, (await _client.SendAsync(refuse)).StatusCode);

        using var read = Authorized(HttpMethod.Get, $"/api/v1/identity/users/{userId}/folder", scope, [Permissions.DocumentRead]);
        var folder = await (await _client.SendAsync(read)).Content.ReadFromJsonAsync<JsonElement>();

        Assert.Empty(folder.GetProperty("entries").EnumerateArray());
    }

    [Fact]
    public async Task A_folder_entry_cannot_point_at_a_document_of_another_organization()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var otherScope = new TenantScope(Guid.NewGuid());
        var person = await RegisterIdentityAsync(scope);
        var userId = person.GetProperty("id").GetGuid();

        var foreignDocument = await AttachAsync(otherScope, (await RegisterIdentityAsync(otherScope)).GetProperty("id").GetGuid(), NationalId);

        using var create = Authorized(HttpMethod.Post, $"/api/v1/identity/users/{userId}/folder", scope, [Permissions.DocumentWrite]);
        await _client.SendAsync(create);

        using var add = Authorized(HttpMethod.Post, $"/api/v1/identity/users/{userId}/folder/entries", scope, [Permissions.DocumentWrite],
            new { identityDocumentId = foreignDocument });

        Assert.Equal(HttpStatusCode.NotFound, (await _client.SendAsync(add)).StatusCode);
    }

    private async Task<JsonElement> RegisterIdentityAsync(TenantScope scope)
    {
        using var register = Authorized(HttpMethod.Post, "/api/v1/identity/users/", scope, [Permissions.IdentityWrite],
            new { mobile = NewMobile(), displayName = "کارشناس اسناد" });

        var response = await _client.SendAsync(register);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private async Task<Guid> AttachAsync(TenantScope scope, Guid userId, string documentType)
    {
        using var attach = Authorized(HttpMethod.Post, "/api/v1/identity/documents/", scope, [Permissions.DocumentWrite],
            new { userId, documentType });

        var response = await _client.SendAsync(attach);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private async Task<Guid> UploadFrontPageAsync(TenantScope scope, Guid documentId)
    {
        using var upload = Authorized(HttpMethod.Post, $"/api/v1/identity/documents/{documentId}/pages", scope, [Permissions.DocumentWrite]);
        upload.Content = Multipart("content", CaptureBytes(), "image/jpeg", "Front");

        var response = await _client.SendAsync(upload);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private async Task<string> ContentPathAsync(TenantScope scope, Guid documentId, Guid pageId)
    {
        using var link = Authorized(
            HttpMethod.Get,
            $"/api/v1/identity/documents/{documentId}/pages/{pageId}/content",
            scope,
            [Permissions.DocumentRead]);

        var response = await _client.SendAsync(link);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        return ToPath((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("url").GetString()!);
    }

    private HttpRequestMessage ReviewAsync(
        TenantScope scope,
        Guid userId,
        Guid entryId,
        bool approve,
        string[]? with = null,
        string[]? without = null,
        string? notes = null)
    {
        var permissions = (with ?? [Permissions.IdentityVerify])
            .Where(permission => without is null ||
                                 !without.Contains(permission, StringComparer.Ordinal))
            .ToArray();

        return Authorized(
            HttpMethod.Post,
            $"/api/v1/identity/users/{userId}/folder/entries/{entryId}/review",
            scope,
            permissions,
            new { approve, notes });
    }

    private async Task DefineTypeAsync(TenantScope scope, string code, int maxPages)
    {
        using var define = Authorized(HttpMethod.Post, "/api/v1/identity/document-types/", scope, [Permissions.DocumentWrite],
            new { code, title = "Residence Permit", titlePersian = "مجوز اقامت", category = "Identity", maxPages });

        var response = await _client.SendAsync(define);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    private async Task<long> MaximumPageSizeAsync()
    {
        ArgumentNullException.ThrowIfNull(_factory);

        using var scope = _factory.Services.CreateAsyncScope();
        var options = scope.ServiceProvider
            .GetRequiredService<Microsoft.Extensions.Options.IOptions<NegarAzinFadak.Application.Options.DocumentOptions>>();

        return options.Value.MaximumSizeInBytes;
    }

    /// <summary>Reads the first error code out of a platform problem document.</summary>
    private static async Task<string> FirstErrorCodeAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        var problem = JsonDocument.Parse(body).RootElement;
        return problem.TryGetProperty("errors", out var errors)
            ? errors[0].GetProperty("code").GetString()!
            : $"DBG {(int)response.StatusCode} no-errors: {body}";
    }

    /// <summary>A unique document type code, so a duplicate conflict is always the test's doing.</summary>
    private static string NewCode() => $"test_type_{Guid.NewGuid():N}"[..24];

    /// <summary>A unique, valid Iranian mobile number.</summary>
    private static string NewMobile() => $"+989{(uint)Random.Shared.Next(100_000_000, 999_999_999)}";

    /// <summary>
    /// Bytes that look like a real photograph to the baseline analyzer: a genuinely non-uniform distribution
    /// with average brightness in the middle of the range, which is what it is built to accept.
    /// </summary>
    private static byte[] CaptureBytes(int length = 2048)
    {
        var content = new byte[length];
        for (var index = 0; index < length; index++)
        {
            content[index] = (byte)((index / 32 % 2) is 0 ? 40 : 200);
        }

        return content;
    }

    private static MultipartFormDataContent Multipart(string field, byte[] content, string contentType, string? side = null)
    {
        var part = new ByteArrayContent(content);
        part.Headers.ContentType = new MediaTypeHeaderValue(contentType);

        var form = new MultipartFormDataContent { { part, field, "page.jpg" } };
        if (side is not null)
        {
            form.Add(new StringContent(side), "side");
        }

        return form;
    }

    /// <summary>Reduces an absolute grant URL to the path the test client can call.</summary>
    private static string ToPath(string url) => new Uri(url).PathAndQuery;

    private async Task<HttpResponseMessage> AuthorizedGetAsync(string path, TenantScope scope, string[] permissions)
    {
        using var request = Authorized(HttpMethod.Get, path, scope, permissions);
        return await _client.SendAsync(request);
    }

    /// <summary>Mints a correctly signed token. Every request goes through the real issuer.</summary>
    private HttpRequestMessage Authorized(
        HttpMethod method,
        string path,
        TenantScope scope,
        IReadOnlyCollection<string> permissions,
        object? body = null)
    {
        var request = new HttpRequestMessage(method, path);
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            _factory.ResolveIssuer().Issue(
                new AccessTokenRequest(Guid.NewGuid(), scope, ["platform-admin"], permissions)).Value);

        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        return request;
    }
}