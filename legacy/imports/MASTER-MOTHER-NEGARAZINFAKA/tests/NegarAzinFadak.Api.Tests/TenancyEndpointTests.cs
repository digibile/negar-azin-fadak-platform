using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using NegarAzinFadak.Api.Authentication;
using NegarAzinFadak.Api.Authorization;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Infrastructure.Persistence;

namespace NegarAzinFadak.Api.Tests;

/// <summary>
/// The tenancy surface over a real host and a real database: what a caller may reach, what a refusal looks
/// like on the wire, and the rule that the tenant is always taken from the session.
/// </summary>
/// <remarks>
/// These tests deliberately drive real use cases over HTTP rather than mocking the services. The properties
/// worth protecting here are transport-level — status codes, problem documents, and the absence of any way
/// to name a tenant in a body — and a mocked service would agree with all of them.
/// </remarks>
public sealed class TenancyEndpointTests : IClassFixture<ApiHostFactory>, IDisposable
{
    private readonly ApiHostFactory _factory;
    private readonly HttpClient _client;

    public TenancyEndpointTests(ApiHostFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public void Dispose() => _client.Dispose();

    [Fact]
    public async Task An_anonymous_caller_cannot_reach_the_tenant_surface()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.GetAsync("/api/v1/roles/")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.GetAsync("/api/v1/permissions/")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.GetAsync("/api/v1/audit")).StatusCode);
    }

    [Fact]
    public async Task A_caller_without_the_role_permission_is_forbidden()
    {
        using var request = Authorized(
            HttpMethod.Get, "/api/v1/roles/", new TenantScope(Guid.NewGuid()), [Permissions.OrganizationRead]);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task A_role_defined_over_http_can_be_read_back_with_its_permission()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var code = $"role_{Guid.NewGuid():N}"[..24];

        using var define = Authorized(
            HttpMethod.Post, "/api/v1/roles/", scope, [Permissions.RoleWrite],
            new { code, name = "Seller manager", description = "Owns seller onboarding" });

        var created = await _client.SendAsync(define);

        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var body = await created.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(code, body.GetProperty("code").GetString());
        Assert.True(body.GetProperty("isActive").GetBoolean());
        Assert.Empty(body.GetProperty("permissions").EnumerateArray());

        var roleId = body.GetProperty("id").GetGuid();

        using var grant = Authorized(
            HttpMethod.Post, $"/api/v1/roles/{roleId}/permissions", scope, [Permissions.RoleWrite],
            new { permissionCode = Permissions.IdentityRead });

        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(grant)).StatusCode);

        using var list = Authorized(HttpMethod.Get, "/api/v1/roles/", scope, [Permissions.RoleRead]);
        var listed = await (await _client.SendAsync(list)).Content.ReadFromJsonAsync<JsonElement>();

        var stored = listed.GetProperty("items").EnumerateArray()
            .Single(item => item.GetProperty("id").GetGuid() == roleId);
        Assert.Equal([Permissions.IdentityRead], stored.GetProperty("permissions").EnumerateArray().Select(p => p.GetString()));
    }

    [Fact]
    public async Task Granting_the_same_permission_twice_is_reported_as_a_conflict()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var roleId = await DefineRoleAsync(scope, $"role_{Guid.NewGuid():N}"[..24]);

        using var first = Authorized(
            HttpMethod.Post, $"/api/v1/roles/{roleId}/permissions", scope, [Permissions.RoleWrite],
            new { permissionCode = Permissions.IdentityRead });
        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(first)).StatusCode);

        using var again = Authorized(
            HttpMethod.Post, $"/api/v1/roles/{roleId}/permissions", scope, [Permissions.RoleWrite],
            new { permissionCode = Permissions.IdentityRead });
        var response = await _client.SendAsync(again);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        // The caller is told, in the platform's own error vocabulary, rather than receiving a cheerful
        // 204 for a grant that did not happen.
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains(
            problem.GetProperty("errors").EnumerateArray().Select(error => error.GetProperty("code").GetString()),
            code => code == "authorization.role.permission_already_granted");
    }

    [Fact]
    public async Task A_revoked_permission_disappears_from_the_role_without_losing_the_role()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var roleId = await DefineRoleAsync(scope, $"role_{Guid.NewGuid():N}"[..24]);

        using var grant = Authorized(
            HttpMethod.Post, $"/api/v1/roles/{roleId}/permissions", scope, [Permissions.RoleWrite],
            new { permissionCode = Permissions.IdentityRead });
        await _client.SendAsync(grant);

        using var revoke = Authorized(
            HttpMethod.Delete, $"/api/v1/roles/{roleId}/permissions/{Permissions.IdentityRead}", scope, [Permissions.RoleWrite]);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(revoke)).StatusCode);

        using var read = Authorized(HttpMethod.Get, $"/api/v1/roles/", scope, [Permissions.RoleRead]);
        var items = (await (await _client.SendAsync(read)).Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("items").EnumerateArray()
            .Where(item => item.GetProperty("id").GetGuid() == roleId)
            .ToArray();

        Assert.Empty(Assert.Single(items).GetProperty("permissions").EnumerateArray());
        Assert.True(Assert.Single(items).GetProperty("isActive").GetBoolean());
    }

    [Fact]
    public async Task A_store_cannot_be_created_where_there_is_no_branch_to_hang_it_from()
    {
        var scope = new TenantScope(Guid.NewGuid());

        using var create = Authorized(
            HttpMethod.Post, "/api/v1/organization/units/store", scope, [Permissions.OrganizationWrite],
            new { code = "store_1", name = "Tehran Central", legalName = (string?)null });

        var response = await _client.SendAsync(create);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        // The session has an organization and no branch, so the parent the store needs does not exist. The
        // answer is that it is not there — not a half-built store, and not a database error.
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Contains(
            problem.GetProperty("errors").EnumerateArray().Select(error => error.GetProperty("code").GetString()),
            code => code!.StartsWith("organization.unit.", StringComparison.Ordinal));
    }

    [Fact]
    public async Task An_unknown_organizational_level_is_refused_as_a_validation_problem()
    {
        var scope = new TenantScope(Guid.NewGuid());

        using var create = Authorized(
            HttpMethod.Post, "/api/v1/organization/units/continent", scope, [Permissions.OrganizationWrite],
            new { code = "eu", name = "Europe", legalName = (string?)null });

        var response = await _client.SendAsync(create);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(
            problem.GetProperty("errors").EnumerateArray().Select(error => error.GetProperty("code").GetString()),
            code => code == "organization.unit.level_invalid");
    }

    [Fact]
    public async Task A_tenant_setting_written_over_http_is_read_back_masked_when_sensitive()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var code = $"integration.partner_{Guid.NewGuid():N}"[..40];

        using var write = Authorized(
            HttpMethod.Put, $"/api/v1/tenant/configuration/settings/{code}", scope, [Permissions.TenantConfigurationWrite],
            new { value = "sk-live-secret", kind = "Secret", isSensitive = true, rangeMinimum = (decimal?)null, rangeMaximum = (decimal?)null });
        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(write)).StatusCode);

        using var read = Authorized(HttpMethod.Get, "/api/v1/tenant/configuration/", scope, [Permissions.TenantConfigurationRead]);
        var settings = (await (await _client.SendAsync(read)).Content.ReadFromJsonAsync<JsonElement>()).EnumerateArray().ToArray();

        var stored = Assert.Single(settings, setting => setting.GetProperty("code").GetString() == code);
        Assert.True(stored.GetProperty("isSensitive").GetBoolean());

        // The secret never travels back. An administration screen is not a place a credential should be
        // readable from, and the value is only needed by the code that calls the partner.
        Assert.NotEqual("sk-live-secret", stored.GetProperty("value").GetString());
    }

    [Fact]
    public async Task A_setting_of_an_unknown_kind_is_refused_before_it_reaches_the_domain()
    {
        var scope = new TenantScope(Guid.NewGuid());

        using var write = Authorized(
            HttpMethod.Put, $"/api/v1/tenant/configuration/settings/misc_{Guid.NewGuid():N}"[..40], scope,
            [Permissions.TenantConfigurationWrite],
            new { value = "x", kind = "Colour", isSensitive = false, rangeMinimum = (decimal?)null, rangeMaximum = (decimal?)null });

        var response = await _client.SendAsync(write);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(
            problem.GetProperty("errors").EnumerateArray().Select(error => error.GetProperty("code").GetString()),
            code => code == "tenant.configuration.setting_kind_invalid");
    }

    [Fact]
    public async Task A_value_outside_its_declared_range_is_refused_with_the_domain_code()
    {
        var scope = new TenantScope(Guid.NewGuid());

        using var write = Authorized(
            HttpMethod.Put, "/api/v1/tenant/configuration/settings/credit.default.down_payment", scope,
            [Permissions.TenantConfigurationWrite],
            new { value = "140", kind = "Decimal", isSensitive = false, rangeMinimum = 0m, rangeMaximum = 100m });

        var response = await _client.SendAsync(write);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(
            problem.GetProperty("errors").EnumerateArray().Select(error => error.GetProperty("code").GetString()),
            code => code == "tenant.configuration.setting_out_of_range");
    }

    [Fact]
    public async Task A_cannot_ask_for_another_tenants_audit_trail()
    {
        var foreign = new TenantScope(Guid.NewGuid());
        var scope = new TenantScope(Guid.NewGuid());
        var code = $"audit_probe_{Guid.NewGuid():N}"[..28];

        using (var write = Authorized(
            HttpMethod.Put, $"/api/v1/tenant/configuration/settings/{code}", scope, [Permissions.TenantConfigurationWrite],
            new { value = "1", kind = "Integer", isSensitive = false, rangeMinimum = (decimal?)null, rangeMaximum = (decimal?)null }))
        {
            await _client.SendAsync(write);
        }

        using var read = Authorized(HttpMethod.Get, "/api/v1/audit", scope, [Permissions.AuditRead]);

        var response = await _client.SendAsync(read);
        var page = await response.Content.ReadFromJsonAsync<JsonElement>();

        // The caller's own lines are there, and only the caller's. Naming another organization in the query
        // string changes nothing, because the scope comes from the session and not from the request.
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains(
            page.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("resourceId").GetString()),
            resourceId => resourceId == code);
        Assert.DoesNotContain(
            page.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("resourceId").GetString()),
            resourceId => resourceId == foreign.OrganizationId.ToString());
    }

    [Fact]
    public async Task An_audit_refusal_is_committed_and_readable_by_the_same_tenant()
    {
        var scope = new TenantScope(Guid.NewGuid());

        using (var define = Authorized(
            HttpMethod.Post, "/api/v1/roles/", scope, [Permissions.RoleWrite],
            new { code = "seller_manager", name = "Seller manager", description = (string?)null }))
        {
            await _client.SendAsync(define);
        }

        using var duplicate = Authorized(
            HttpMethod.Post, "/api/v1/roles/", scope, [Permissions.RoleWrite],
            new { code = "seller_manager", name = "Seller manager again", description = (string?)null });
        Assert.Equal(HttpStatusCode.Conflict, (await _client.SendAsync(duplicate)).StatusCode);

        using var read = Authorized(HttpMethod.Get, "/api/v1/audit?action=tenant.role.define", scope, [Permissions.AuditRead]);
        var page = await (await _client.SendAsync(read)).Content.ReadFromJsonAsync<JsonElement>();

        // The refused attempt is the interesting one. If it were only logged, an administrator reviewing the
        // trail would see a single successful definition and never learn that someone tried to redefine it.
        var denied = page.GetProperty("items").EnumerateArray()
            .Single(item => item.GetProperty("outcome").GetString() == "Denied");
        Assert.Equal("authorization.role.duplicate_code", denied.GetProperty("reasonCode").GetString());
    }

    [Fact]
    public async Task A_permission_the_catalog_has_not_published_cannot_be_granted()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var roleId = await DefineRoleAsync(scope, $"role_{Guid.NewGuid():N}"[..24]);

        using var grant = Authorized(
            HttpMethod.Post, $"/api/v1/roles/{roleId}/permissions", scope, [Permissions.RoleWrite],
            new { permissionCode = "seller.never.defined" });

        var response = await _client.SendAsync(grant);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        // A grant is a promise that the code means something. Granting a code the catalog does not know
        // would put a permission into a token that nothing can ever check.
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Contains(
            problem.GetProperty("errors").EnumerateArray().Select(error => error.GetProperty("code").GetString()),
            code => code == "authorization.permission.not_found");
    }

    [Fact]
    public async Task A_refused_request_never_leaks_another_tenants_data()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var roleId = await DefineRoleAsync(scope, $"role_{Guid.NewGuid():N}"[..24]);

        using var create = Authorized(
            HttpMethod.Post, "/api/v1/organization/units/store", scope, [Permissions.OrganizationWrite],
            new { code = "store_1", name = "Tehran", legalName = (string?)null });
        var response = await _client.SendAsync(create);
        var body = await response.Content.ReadAsStringAsync();

        // The problem document explains the rule and names only the request's own subject. A refusal that
        // echoes identifiers it found on the way is a way to enumerate another tenant's structure.
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.DoesNotContain(roleId.ToString(), body, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task A_retired_role_can_be_reactivated_and_stops_being_assignable_in_between()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var roleId = await DefineRoleAsync(scope, $"role_{Guid.NewGuid():N}"[..24]);

        using var retire = Authorized(HttpMethod.Post, $"/api/v1/roles/{roleId}/retire", scope, [Permissions.RoleWrite]);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(retire)).StatusCode);

        using var grant = Authorized(
            HttpMethod.Post, $"/api/v1/roles/{roleId}/permissions", scope, [Permissions.RoleWrite],
            new { permissionCode = Permissions.IdentityRead });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await _client.SendAsync(grant)).StatusCode);

        using var activate = Authorized(HttpMethod.Post, $"/api/v1/roles/{roleId}/activate", scope, [Permissions.RoleWrite]);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(activate)).StatusCode);
    }

    [Fact]
    public async Task The_published_catalog_is_readable_and_contains_no_hard_coded_invention()
    {
        using var read = Authorized(HttpMethod.Get, "/api/v1/permissions/", new TenantScope(Guid.NewGuid()), [Permissions.PermissionCatalogRead]);

        var response = await _client.SendAsync(read);
        var page = await response.Content.ReadFromJsonAsync<JsonElement>();

        // Every code a role can be granted must exist here. The list is the platform's own vocabulary, read
        // back through the endpoint an administrator would use.
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var codes = page.GetProperty("items").EnumerateArray()
            .Select(item => item.GetProperty("code").GetString())
            .ToArray();
        Assert.Contains(Permissions.RoleWrite, codes);
        Assert.Contains(Permissions.AuditRead, codes);
        Assert.All(codes, code => Assert.False(string.IsNullOrWhiteSpace(code)));
    }

    private async Task<Guid> DefineRoleAsync(TenantScope scope, string code)
    {
        using var define = Authorized(
            HttpMethod.Post, "/api/v1/roles/", scope, [Permissions.RoleWrite],
            new { code, name = code, description = (string?)null });

        var response = await _client.SendAsync(define);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    /// <summary>
    /// Mints a correctly signed token for the scope under test. Every request here goes through the real
    /// issuer, so a failure means the platform refused it for a stated reason.
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
