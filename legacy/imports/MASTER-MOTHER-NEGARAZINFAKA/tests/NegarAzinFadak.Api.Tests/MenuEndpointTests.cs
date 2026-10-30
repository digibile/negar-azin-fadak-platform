using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using NegarAzinFadak.Api.Authentication;
using NegarAzinFadak.Api.Authorization;
using NegarAzinFadak.Core.Tenancy;

namespace NegarAzinFadak.Api.Tests;

/// <summary>
/// The navigation surface over a real host and a real database: what an operator is shown, what they are
/// not, and that a menu of another tenant is unreachable rather than refused.
/// </summary>
/// <remarks>
/// The properties worth protecting here are transport-level. The effective tree is the only navigation read
/// with no permission of its own, and it is the endpoint where a leak would show: a section an operator's
/// roles do not open is not a cosmetic problem, it is a capability they were not granted. So these tests
/// mint real tokens with real permission sets and read the wire.
/// </remarks>
public sealed class MenuEndpointTests : IClassFixture<ApiHostFactory>, IDisposable
{
    private readonly ApiHostFactory _factory;
    private readonly HttpClient _client;

    public MenuEndpointTests(ApiHostFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public void Dispose() => _client.Dispose();

    [Fact]
    public async Task An_anonymous_caller_cannot_read_the_navigation()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.GetAsync("/api/v1/menu/tree")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.GetAsync("/api/v1/menus/")).StatusCode);
    }

    [Fact]
    public async Task A_caller_holding_no_menu_permission_sees_an_empty_navigation_rather_than_everything()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var menuId = await DefineMenuAsync(scope, "master", "Master", [Permissions.MenuWrite]);

        await AddItemAsync(scope, menuId, null, "audit", "Audit", Permissions.AuditRead);
        await AddItemAsync(scope, menuId, null, "home", "Home", null);

        // The seeded tenant has no menu of its own here, so the tree this caller receives is exactly the
        // menu created above minus the section their roles do not open.
        using var withoutAudit = Authorized(HttpMethod.Get, "/api/v1/menu/tree", scope, []);
        var denied = await ReadTreeAsync(withoutAudit);
        Assert.Equal(new[] { "home" }, denied);

        using var withAudit = Authorized(HttpMethod.Get, "/api/v1/menu/tree", scope, [Permissions.AuditRead]);
        var granted = await ReadTreeAsync(withAudit);
        Assert.Equal(new[] { "audit", "home" }, granted);
    }

    [Fact]
    public async Task A_withdrawn_section_takes_its_children_with_it()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var menuId = await DefineMenuAsync(scope, "master", "Master", [Permissions.MenuWrite]);

        var parent = await AddItemAsync(scope, menuId, null, "reports", "Reports", null);
        await AddItemAsync(scope, menuId, parent, "daily", "Daily", null);

        using var before = Authorized(HttpMethod.Get, "/api/v1/menu/tree", scope, []);
        var structure = await ReadSectionsAsync(before);

        // One top-level section, with the other nested under it rather than promoted beside it.
        var only = Assert.IsType<JsonElement>(Assert.Single(structure));
        Assert.Equal("reports", only.GetProperty("code").GetString());
        Assert.Equal(
            new[] { "daily" },
            only.GetProperty("children").EnumerateArray().Select(child => child.GetProperty("code").GetString()));

        using var withdraw = Authorized(
            HttpMethod.Post, $"/api/v1/menus/{menuId}/items/{parent}/deactivate", scope, [Permissions.MenuWrite]);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(withdraw)).StatusCode);

        // The child is unreachable behind a withdrawn parent, so sending it would produce a link with no path
        // to it. The child keeps its place in the structure and reappears when the parent comes back.
        using var after = Authorized(HttpMethod.Get, "/api/v1/menu/tree", scope, []);
        Assert.Empty(await ReadTreeAsync(after));

        using var reactivate = Authorized(
            HttpMethod.Post, $"/api/v1/menus/{menuId}/items/{parent}/activate", scope, [Permissions.MenuWrite]);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(reactivate)).StatusCode);

        using var restored = Authorized(HttpMethod.Get, "/api/v1/menu/tree", scope, []);
        var sections = await ReadTreeAsync(restored);
        Assert.Equal(new[] { "reports" }, sections);
    }

    [Fact]
    public async Task A_menu_of_another_tenant_is_reported_as_not_found()
    {
        var mine = new TenantScope(Guid.NewGuid());
        var theirs = new TenantScope(Guid.NewGuid());
        var foreignMenuId = await DefineMenuAsync(theirs, "master", "Foreign master", [Permissions.MenuWrite]);

        // Same answer as a menu that does not exist at all: anything else confirms the identifier belongs to
        // somebody, which is a way to probe for menus outside the caller's own tenant.
        using var request = Authorized(HttpMethod.Delete, $"/api/v1/menus/{foreignMenuId}", mine, [Permissions.MenuWrite]);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task A_caller_without_the_read_permission_sees_no_structure_at_all()
    {
        var scope = new TenantScope(Guid.NewGuid());
        await DefineMenuAsync(scope, "master", "Master", [Permissions.MenuWrite]);

        // Reading the effective tree needs no permission of its own — it is already filtered — but reading
        // the whole structure does, because it answers questions about sections the caller cannot open.
        using var request = Authorized(HttpMethod.Get, "/api/v1/menus/", scope, []);

        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(request)).StatusCode);
    }

    [Fact]
    public async Task A_menu_level_is_taken_from_the_session_and_never_from_the_body()
    {
        var scope = new TenantScope(Guid.NewGuid());

        using var request = Authorized(
            HttpMethod.Post, "/api/v1/menus/", scope, [Permissions.MenuWrite],
            new { code = "master", title = "Master", englishTitle = (string?)null, level = "brand" });

        var response = await _client.SendAsync(request);

        // The body carries a level the request shape does not declare, and the created menu is still the
        // tenant's own. A level in the body would let a tenant administrator define a menu every company
        // would then see.
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Tenant", body.GetProperty("level").GetString());
    }

    [Fact]
    public async Task A_parameter_that_cannot_be_read_is_a_bad_request_and_not_a_server_fault()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var menuId = await DefineMenuAsync(scope, "master", "Master", [Permissions.MenuWrite]);

        // An empty value where a parent is expected is a malformed request, not a broken platform. Answering
        // 500 for it sends the client looking for an outage that does not exist.
        using var request = Authorized(
            HttpMethod.Post, $"/api/v1/menus/{menuId}/items?parentId=", scope, [Permissions.MenuWrite],
            new
            {
                code = "users",
                title = "Users",
                englishTitle = (string?)null,
                icon = (string?)null,
                route = (string?)null,
                sortOrder = 0,
                permission = (string?)null,
                module = "identity"
            });

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task A_required_permission_nobody_can_grant_is_refused()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var menuId = await DefineMenuAsync(scope, "master", "Master", [Permissions.MenuWrite]);

        using var request = Authorized(
            HttpMethod.Post, $"/api/v1/menus/{menuId}/items", scope, [Permissions.MenuWrite],
            new
            {
                code = "ghost",
                title = "Ghost",
                englishTitle = (string?)null,
                icon = (string?)null,
                route = "/ghost",
                sortOrder = 0,
                permission = "navigation.item.that.no.role.grants",
                module = "platform"
            });

        // A section naming a code nothing can grant is invisible to every operator while looking perfectly
        // correct in an administration screen.
        Assert.Equal(HttpStatusCode.NotFound, (await _client.SendAsync(request)).StatusCode);
    }

    [Fact]
    public async Task A_duplicate_sibling_code_is_a_conflict_and_not_a_crash()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var menuId = await DefineMenuAsync(scope, "master", "Master", [Permissions.MenuWrite]);
        await AddItemAsync(scope, menuId, null, "users", "Users", null);

        using var request = Authorized(
            HttpMethod.Post, $"/api/v1/menus/{menuId}/items", scope, [Permissions.MenuWrite],
            new
            {
                code = "USERS",
                title = "Users again",
                englishTitle = (string?)null,
                icon = (string?)null,
                route = (string?)null,
                sortOrder = 0,
                permission = (string?)null,
                module = "identity"
            });

        // Reported in the platform's vocabulary, and told apart from a sibling that legitimately reuses the
        // code under a different parent.
        Assert.Equal(HttpStatusCode.Conflict, (await _client.SendAsync(request)).StatusCode);
    }

    [Fact]
    public async Task The_administration_read_keeps_what_was_withdrawn_and_marks_it()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var menuId = await DefineMenuAsync(scope, "master", "Master", [Permissions.MenuWrite]);
        var kept = await AddItemAsync(scope, menuId, null, "users", "Users", null);
        var withdrawn = await AddItemAsync(scope, menuId, null, "reports", "Reports", null);

        using var hide = Authorized(
            HttpMethod.Post, $"/api/v1/menus/{menuId}/items/{withdrawn}/deactivate", scope, [Permissions.MenuWrite]);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(hide)).StatusCode);

        using var request = Authorized(HttpMethod.Get, "/api/v1/menus/", scope, [Permissions.MenuRead]);
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var sections = (await response.Content.ReadFromJsonAsync<JsonElement>())
            .EnumerateArray()
            .SelectMany(menu => menu.GetProperty("sections").EnumerateArray())
            .ToArray();

        // The screen an administrator works with is asked why a section is not appearing. Answering that
        // question by omitting the section is the one answer that guarantees it stays unanswered.
        Assert.Equal(2, sections.Length);
        Assert.False(sections.Single(section => section.GetProperty("id").GetGuid() == withdrawn).GetProperty("isActive").GetBoolean());
        Assert.True(sections.Single(section => section.GetProperty("id").GetGuid() == kept).GetProperty("isActive").GetBoolean());
    }

    [Fact]
    public async Task Publishing_the_base_structure_writes_it_and_is_safe_to_repeat()
    {
        var scope = new TenantScope(Guid.NewGuid());

        // Publishing is the one menu operation whose answer is only true if it committed. An endpoint that
        // staged the structure and reported success would leave the tenant with the sections it was promised
        // and none of them present.
        using var first = Authorized(HttpMethod.Post, "/api/v1/menu/publish", scope, [Permissions.MenuPublish]);
        var firstResponse = await _client.SendAsync(first);

        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        var firstBody = await firstResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(firstBody.GetProperty("sectionsAdded").GetInt32() > 0);
        Assert.True(firstBody.GetProperty("sectionsKept").GetInt32() is 0);

        using var read = Authorized(HttpMethod.Get, "/api/v1/menus/", scope, [Permissions.MenuRead]);
        var readBody = await (await _client.SendAsync(read)).Content.ReadFromJsonAsync<JsonElement>();
        var installed = MenuTreeReading.Flatten(readBody).Count;
        Assert.Equal(firstBody.GetProperty("sectionsAdded").GetInt32(), installed);

        // Repeated on every deployment, so a second run must find its own work and add nothing.
        using var second = Authorized(HttpMethod.Post, "/api/v1/menu/publish", scope, [Permissions.MenuPublish]);
        var secondBody = await (await _client.SendAsync(second)).Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(0, secondBody.GetProperty("sectionsAdded").GetInt32());
        Assert.Equal(installed, secondBody.GetProperty("sectionsKept").GetInt32());
    }

    [Fact]
    public async Task Publishing_does_not_revert_what_an_operator_changed()
    {
        var scope = new TenantScope(Guid.NewGuid());
        await PublishAsync(scope);

        using var structure = Authorized(HttpMethod.Get, "/api/v1/menus/", scope, [Permissions.MenuRead]);
        var menus = (await (await _client.SendAsync(structure)).Content.ReadFromJsonAsync<JsonElement>()).EnumerateArray().ToArray();
        var menuId = menus[0].GetProperty("id").GetGuid();
        var section = menus[0].GetProperty("sections").EnumerateArray().First();

        // An operator retitled a base section and withdrew another. A deploy must not undo that.
        using var rename = Authorized(
            HttpMethod.Put, $"/api/v1/menus/{menuId}/items/{section.GetProperty("id").GetGuid()}", scope,
            [Permissions.MenuWrite],
            new
            {
                title = "Renamed by the operator",
                englishTitle = (string?)null,
                icon = (string?)null,
                route = (string?)null,
                sortOrder = 0,
                permission = (string?)null,
                module = "platform"
            });
        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(rename)).StatusCode);

        await PublishAsync(scope);

        using var after = Authorized(HttpMethod.Get, "/api/v1/menus/", scope, [Permissions.MenuRead]);
        var afterMenus = (await (await _client.SendAsync(after)).Content.ReadFromJsonAsync<JsonElement>()).EnumerateArray().ToArray();
        var titles = afterMenus[0].GetProperty("sections").EnumerateArray()
            .Select(item => item.GetProperty("title").GetString())
            .ToArray();

        Assert.Contains("Renamed by the operator", titles);
    }

    [Fact]
    public async Task Publishing_is_refused_to_a_caller_who_may_only_edit_their_own_structure()
    {
        var scope = new TenantScope(Guid.NewGuid());

        // Publication reaches every tenant that runs this version, so it is not something a menu editor of one
        // tenant can trigger.
        using var request = Authorized(HttpMethod.Post, "/api/v1/menu/publish", scope, [Permissions.MenuWrite]);

        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(request)).StatusCode);
    }

    [Fact]
    public async Task A_route_that_is_not_an_absolute_path_is_refused_rather_than_stored()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var menuId = await DefineMenuAsync(scope, "main", "Main", [Permissions.MenuWrite]);

        // A relative route is not a broken link, it is a link the client will resolve against whatever page
        // the operator happens to be on, so the section lands somewhere the operator never asked for.
        using var request = Authorized(
            HttpMethod.Post, $"/api/v1/menus/{menuId}/items", scope, [Permissions.MenuWrite],
            new
            {
                code = "reports",
                title = "Reports",
                englishTitle = (string?)null,
                icon = (string?)null,
                route = "management/reports",
                sortOrder = 0,
                permission = (string?)null,
                module = "platform"
            });

        Assert.Equal(HttpStatusCode.BadRequest, (await _client.SendAsync(request)).StatusCode);
    }

    [Fact]
    public async Task A_change_to_a_section_that_does_not_exist_reports_it_as_absent()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var menuId = await DefineMenuAsync(scope, "main", "Main", [Permissions.MenuWrite]);

        // The change is also missing its title. The section's absence has to win: a caller told its title was
        // wrong would go looking for a section that was never there.
        using var request = Authorized(
            HttpMethod.Put, $"/api/v1/menus/{menuId}/items/{Guid.NewGuid()}", scope, [Permissions.MenuWrite],
            new
            {
                title = string.Empty,
                englishTitle = (string?)null,
                icon = (string?)null,
                route = (string?)null,
                sortOrder = 0,
                permission = (string?)null,
                module = "platform"
            });

        Assert.Equal(HttpStatusCode.NotFound, (await _client.SendAsync(request)).StatusCode);
    }

    [Fact]
    public async Task An_english_title_the_platform_will_not_store_is_refused_on_both_writes()
    {
        var scope = new TenantScope(Guid.NewGuid());
        // The columns are bounded at 256, and the platform refuses the write rather than letting one provider
        // fail and another truncate.
        var tooLong = new string('a', 257);

        using var menu = Authorized(
            HttpMethod.Post, "/api/v1/menus/", scope, [Permissions.MenuWrite],
            new { code = "main", title = "Main", englishTitle = tooLong });

        Assert.Equal(HttpStatusCode.BadRequest, (await _client.SendAsync(menu)).StatusCode);

        var menuId = await DefineMenuAsync(scope, "main", "Main", [Permissions.MenuWrite]);
        var sectionId = await AddItemAsync(scope, menuId, null, "reports", "Reports", null);

        using var edit = Authorized(
            HttpMethod.Put, $"/api/v1/menus/{menuId}/items/{sectionId}", scope, [Permissions.MenuWrite],
            new
            {
                title = "Reports",
                englishTitle = tooLong,
                icon = (string?)null,
                route = (string?)null,
                sortOrder = 0,
                permission = (string?)null,
                module = "platform"
            });

        Assert.Equal(HttpStatusCode.BadRequest, (await _client.SendAsync(edit)).StatusCode);
    }

    private async Task PublishAsync(TenantScope scope)
    {
        using var request = Authorized(HttpMethod.Post, "/api/v1/menu/publish", scope, [Permissions.MenuPublish]);
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private async Task<Guid> DefineMenuAsync(TenantScope scope, string code, string title, IReadOnlyCollection<string> permissions)
    {
        using var request = Authorized(
            HttpMethod.Post, "/api/v1/menus/", scope, permissions,
            new { code, title, englishTitle = (string?)null });

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private async Task<Guid> AddItemAsync(
        TenantScope scope,
        Guid menuId,
        Guid? parentId,
        string code,
        string title,
        string? permission)
    {
        var path = parentId is null
            ? $"/api/v1/menus/{menuId}/items"
            : $"/api/v1/menus/{menuId}/items?parentId={parentId}";

        using var request = Authorized(
            HttpMethod.Post, path, scope, [Permissions.MenuWrite],
            new
            {
                code,
                title,
                englishTitle = (string?)null,
                icon = (string?)null,
                route = $"/{code}",
                sortOrder = 0,
                permission,
                module = "platform"
            });

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    /// <summary>Reads the top-level sections of the effective tree, across every menu that applies.</summary>
    private async Task<string[]> ReadTreeAsync(HttpRequestMessage request)
    {
        var sections = await ReadSectionsAsync(request);
        return sections
            .Select(section => section.GetProperty("code").GetString() ?? string.Empty)
            .Order(StringComparer.Ordinal)
            .ToArray();
    }

    private async Task<JsonElement[]> ReadSectionsAsync(HttpRequestMessage request)
    {
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("menus").EnumerateArray()
            .SelectMany(menu => menu.GetProperty("sections").EnumerateArray())
            .ToArray();
    }

    /// <summary>
    /// Mints a correctly signed token for the scope under test, so a failure means the platform refused it
    /// for a stated reason rather than that the test could not authenticate.
    /// </summary>
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
