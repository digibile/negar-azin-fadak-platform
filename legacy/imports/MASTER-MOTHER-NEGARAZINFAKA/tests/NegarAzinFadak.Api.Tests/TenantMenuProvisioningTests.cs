using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using NegarAzinFadak.Api.Authentication;
using NegarAzinFadak.Api.Authorization;
using NegarAzinFadak.Application.Options;
using NegarAzinFadak.Application.Tenancy;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Organization.Domain.Menus;

namespace NegarAzinFadak.Api.Tests;

/// <summary>
/// What a new tenant is given before anyone logs into it: the configured base navigation, installed as part
/// of provisioning rather than by whoever happens to be first.
/// </summary>
/// <remarks>
/// The property worth protecting is that the base structure arrives with the tenant and is not a
/// deployment step somebody can forget. A tenant that provisioned successfully but has no menu until an
/// operator publishes one is a tenant whose users log in to a blank screen and report it as a defect.
/// </remarks>
public sealed class TenantMenuProvisioningTests : IClassFixture<ApiHostFactory>, IDisposable
{
    private const string PlatformSession = "platform";

    private readonly ApiHostFactory _factory;
    private readonly HttpClient _client;

    public TenantMenuProvisioningTests(ApiHostFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public void Dispose() => _client.Dispose();

    [Fact]
    public async Task A_new_tenant_is_provisioned_with_the_configured_base_navigation()
    {
        var organization = await ProvisionTenantAsync();

        // Read as an administrator holding every capability the catalog declares, because that is the session
        // the base structure is built for. A narrower session would see a filtered menu, and asserting the
        // configured structure through it would only prove that the filter works.
        using var request = Authorized(HttpMethod.Get, "/api/v1/menu/tree", organization.Scope, await EveryCatalogCodeAsync());
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var sections = MenuTreeReading.Flatten(body);

        Assert.NotEmpty(sections);
        Assert.Equal(
            ["authorization", "customers", "dashboard", "identity", "landtech", "marketplace", "navigation", "operations", "organization", "portals", "sellers", "tenancy"],
            MenuTreeReading.Sections(body).Select(section => section.GetProperty("code").GetString()).Order(StringComparer.Ordinal));

        Assert.All(sections, section => Assert.True(section.GetProperty("isPlatformDefined").GetBoolean()));
    }

    [Fact]
    public async Task The_installed_base_navigation_is_the_configured_hierarchy_completely()
    {
        var organization = await ProvisionTenantAsync();

        using var request = Authorized(HttpMethod.Get, "/api/v1/menu/tree", organization.Scope, await EveryCatalogCodeAsync());
        var body = await (await _client.SendAsync(request)).Content.ReadFromJsonAsync<JsonElement>();

        // Every declared section, at every level, and in the declared order. A nested section the installer
        // silently skipped, or a section it promoted to the top level, both show up here as a path mismatch.
        var configured = MenuTreeReading.ConfiguredPaths(BaseMenu().Sections);
        Assert.Equal(51, configured.Count);
        Assert.Equal(configured, MenuTreeReading.Paths(body));
    }

    [Fact]
    public async Task The_configured_base_menu_declares_every_section_under_a_real_permission()
    {
        var baseMenu = BaseMenu();

        // The base menu is the one part of navigation an operator is given without having arranged it, so every
        // section in it has to name the capability that opens it. A section nobody may open is a section no
        // operator ever receives, and one that names a permission the catalog does not declare is refused at
        // startup instead — which would leave the whole tenant without a menu.
        Assert.NotEmpty(baseMenu.Sections);

        var declared = await EveryCatalogCodeAsync();

        var sections = new List<MenuSectionDefinition>();
        var pending = new Queue<MenuSectionDefinition>(baseMenu.Sections);
        while (pending.TryDequeue(out var section))
        {
            sections.Add(section);
            foreach (var child in section.Children)
            {
                pending.Enqueue(child);
            }
        }

        Assert.Equal(51, sections.Count);
        Assert.All(sections, section =>
        {
            Assert.False(string.IsNullOrWhiteSpace(section.RequiredPermissionCode));
            Assert.Contains(section.RequiredPermissionCode, declared);
        });

        // A grouping section opens nothing of its own, so it carries no route; a section with a route has to
        // name a client path the platform will not have to be told about twice.
        Assert.Contains(baseMenu.Sections, section => section.Route is null);
        Assert.All(sections.Where(section => section.Route is not null), section =>
            Assert.True(MenuItem.IsValidRoute(section.Route)));
    }

    [Fact]
    public async Task The_base_navigation_carries_the_title_route_and_order_it_was_configured_with()
    {
        var organization = await ProvisionTenantAsync();

        using var request = Authorized(HttpMethod.Get, "/api/v1/menu/tree", organization.Scope, await EveryCatalogCodeAsync());
        var body = await (await _client.SendAsync(request)).Content.ReadFromJsonAsync<JsonElement>();
        var sections = MenuTreeReading.Flatten(body);

        // A client renders these, so a section that lost its title, its route or its position is a broken
        // link or an empty button. A grouping section is the one legitimate exception: it opens nothing, and
        // the platform marks it by sending no route at all.
        Assert.All(sections, section =>
        {
            Assert.False(string.IsNullOrWhiteSpace(section.GetProperty("title").GetString()));
            Assert.False(string.IsNullOrWhiteSpace(section.GetProperty("englishTitle").GetString()));
            Assert.False(string.IsNullOrWhiteSpace(section.GetProperty("module").GetString()));
            Assert.False(string.IsNullOrWhiteSpace(section.GetProperty("permission").GetString()));
        });

        var routed = sections.Where(section => section.GetProperty("route").ValueKind is not JsonValueKind.Null).ToArray();
        Assert.NotEmpty(routed);
        Assert.All(routed, section =>
        {
            var route = section.GetProperty("route").GetString();
            Assert.True(MenuItem.IsValidRoute(route));
            Assert.StartsWith("/management", route, StringComparison.Ordinal);
        });

        // Siblings arrive in the order they were declared, at every level: a menu that reshuffles itself
        // between two reads is a menu nobody trusts.
        foreach (var siblings in SiblingGroups(sections))
        {
            var orders = siblings.Select(section => section.GetProperty("sortOrder").GetInt32()).ToArray();
            Assert.Equal(orders.Order(), orders);
        }
    }

    [Fact]
    public async Task The_base_navigation_of_one_tenant_is_invisible_to_another()
    {
        var mine = await ProvisionTenantAsync();
        var theirs = await ProvisionTenantAsync();

        // Both tenants are provisioned from the same configuration, so the only thing keeping their menus
        // apart is the isolation of the row they were written to.
        using var request = Authorized(HttpMethod.Get, "/api/v1/menus/", theirs.Scope, [Permissions.MenuRead]);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var menus = (await response.Content.ReadFromJsonAsync<JsonElement>()).EnumerateArray().ToArray();

        Assert.Single(menus);
        Assert.Equal("Tenant", menus[0].GetProperty("level").GetString());
        Assert.NotEqual(Guid.Empty, mine.OrganizationId);
    }

    [Fact]
    public async Task A_section_the_base_configuration_nests_deeply_is_still_installed()
    {
        var organization = await ProvisionTenantAsync();

        // The base menu declares a hierarchy, and it has to survive installation intact: the depth of every
        // section has to be reported, because a client that renders a flat list for a nested structure loses
        // the hierarchy the platform declared.
        using var request = Authorized(HttpMethod.Get, "/api/v1/menu/tree", organization.Scope, await EveryCatalogCodeAsync());
        var body = await (await _client.SendAsync(request)).Content.ReadFromJsonAsync<JsonElement>();
        var sections = MenuTreeReading.Flatten(body);

        Assert.Contains(sections, section => section.GetProperty("depth").GetInt32() is 1);
        Assert.All(sections, section =>
        {
            var depth = section.GetProperty("depth").GetInt32();
            Assert.InRange(depth, 0, Menu.MaximumDepth);
        });

        // A section nested under another has to point at that parent, or the client has to guess the
        // hierarchy from the order alone — which is the thing the tree exists to stop it doing.
        foreach (var section in sections.Where(section => section.GetProperty("depth").GetInt32() > 0))
        {
            var parentId = section.GetProperty("parentId").GetGuid();
            Assert.Contains(sections, candidate => candidate.GetProperty("id").GetGuid() == parentId);
        }
    }

    /// <summary>Groups a flattened tree back into sibling sets, so ordering can be asserted per level.</summary>
    private static IEnumerable<IReadOnlyList<JsonElement>> SiblingGroups(IEnumerable<JsonElement> sections)
    {
        var groups = new Dictionary<Guid, List<JsonElement>>();

        foreach (var section in sections)
        {
            var parent = section.GetProperty("parentId");
            var key = parent.ValueKind is JsonValueKind.Null ? Guid.Empty : parent.GetGuid();
            if (!groups.TryGetValue(key, out var siblings))
            {
                siblings = [];
                groups[key] = siblings;
            }

            siblings.Add(section);
        }

        return groups.Values.Cast<IReadOnlyList<JsonElement>>();
    }

    /// <summary>
    /// The base menu as the running host resolved it, which is the structure this tenant is entitled to.
    /// </summary>
    /// <remarks>
    /// Read from the host rather than from the file so a deployment that declares a different base menu is
    /// judged against its own declaration. Copying the expected structure into the test would have made it
    /// assert the shape of a configuration file instead of the behaviour of the installer.
    /// </remarks>
    private MenuOptions BaseMenu() => _factory.Services.GetRequiredService<IOptions<MenuOptions>>().Value;

    /// <summary>Every active code in the catalog, so a read is filtered by nothing and shows the whole menu.</summary>
    private async Task<IReadOnlyCollection<string>> EveryCatalogCodeAsync()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        return await scope.ServiceProvider
            .GetRequiredService<IPermissionCatalog>()
            .ListActiveCodesAsync();
    }

    private async Task<ProvisionTenantResponse> ProvisionTenantAsync()
    {
        var code = $"tenant_{Guid.NewGuid():N}"[..20];

        // Provisioning runs as a platform administrator. A token cannot be minted without an organization, so
        // the session is that administrator's own tenant; what matters is that the rows written for the new
        // tenant belong to the new tenant and not to the session that asked for it.
        using var request = Authorized(
            HttpMethod.Post,
            "/api/v1/tenants/",
            new TenantScope(Guid.NewGuid()),
            [Permissions.PlatformAdminister],
            new
            {
                code,
                name = code,
                legalName = (string?)null,
                currencyCode = "IRR",
                economicCode = (string?)null,
                nationalRegistrationNumber = (string?)null
            });

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return new ProvisionTenantResponse(
            new TenantScope(body.GetProperty("organizationId").GetGuid()),
            body.GetProperty("roleIds").EnumerateArray().Select(role => role.GetGuid()).ToArray());
    }

    private sealed record ProvisionTenantResponse(TenantScope Scope, IReadOnlyList<Guid> RoleIds)
    {
        public Guid OrganizationId => Scope.OrganizationId;
    }

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
                new AccessTokenRequest(Guid.NewGuid(), scope, [PlatformSession], permissions)).Value);

        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        return request;
    }
}
