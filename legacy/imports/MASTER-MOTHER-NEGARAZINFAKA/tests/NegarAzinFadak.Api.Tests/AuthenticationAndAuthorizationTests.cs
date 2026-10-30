using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using NegarAzinFadak.Api.Authentication;
using NegarAzinFadak.Api.Authorization;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;

namespace NegarAzinFadak.Api.Tests;

/// <summary>
/// Authorization is the platform's security boundary, so each way a caller can be refused is pinned here:
/// no token, a forged token, a token for the wrong audience, a missing tenant, and a missing permission.
/// </summary>
public sealed class AuthenticationAndAuthorizationTests : IClassFixture<ApiHostFactory>, IDisposable
{
    private static readonly Guid OrganizationId = Guid.Parse("11111111-0000-0000-0000-000000000001");
    private static readonly Guid UserId = Guid.Parse("22222222-0000-0000-0000-000000000002");
    private static readonly Guid ForeignOrganizationId = Guid.Parse("99999999-0000-0000-0000-000000000009");

    private const string PrincipalPath = "/api/v1/me";

    /// <summary>Route gated on a permission, used to observe authorization failing closed.</summary>
    private const string PermissionGatedPath = "/api/v1/me/permissions";

    private readonly ApiHostFactory _factory;
    private readonly HttpClient _client;

    public AuthenticationAndAuthorizationTests(ApiHostFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public void Dispose() => _client.Dispose();

    [Fact]
    public async Task An_anonymous_caller_is_refused_the_principal_endpoint()
    {
        var response = await _client.GetAsync("/api/v1/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task An_authenticated_caller_sees_the_identity_and_scope_the_server_resolved()
    {
        // The scope in the response is the one rebuilt from the validated token, not one echoed from
        // the request, so a client can confirm which tenant the platform actually applied.
        using var request = AuthorizedRequestFor(new TenantScope(OrganizationId));

        var response = await _client.SendAsync(request);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(UserId, body.GetProperty("userId").GetGuid());
        Assert.Equal(OrganizationId, body.GetProperty("scope").GetProperty("organizationId").GetGuid());
    }

    [Fact]
    public async Task A_caller_holding_the_permission_reaches_a_permission_gated_endpoint()
    {
        using var request = AuthorizedRequestFor(
            new TenantScope(OrganizationId),
            [Permissions.PlatformAdminister],
            PermissionGatedPath);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task A_caller_without_the_permission_is_forbidden()
    {
        // Fail closed: an authenticated caller lacking the permission is refused, and the refusal is 403
        // rather than 401 because signing in again would not help.
        using var request = AuthorizedRequestFor(new TenantScope(OrganizationId), path: PermissionGatedPath);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task A_token_signed_with_another_key_is_refused()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, PrincipalPath);
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            ForeignIssuer().Issue(new AccessTokenRequest(
                UserId,
                new TenantScope(ForeignOrganizationId),
                [],
                [Permissions.PlatformAdminister])).Value);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task A_token_issued_for_another_audience_is_refused()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, PrincipalPath);
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            ForeignIssuer(audience: "some.other.service").Issue(new AccessTokenRequest(
                UserId,
                new TenantScope(ForeignOrganizationId),
                [],
                [])).Value);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task A_token_with_no_organizational_scope_is_refused_before_reaching_a_handler()
    {
        // Such a token cannot be tenant-scoped. Letting it through would mean serving an authenticated
        // request that no query filter could constrain.
        using var request = new HttpRequestMessage(HttpMethod.Get, PrincipalPath);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", TokenWithoutScope());

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains(
            problem.GetProperty("errors").EnumerateArray().Select(e => e.GetProperty("code").GetString()),
            code => code == "auth.token.scope_missing");
    }

    [Fact]
    public async Task A_token_cannot_grant_itself_a_permission_after_issuance()
    {
        // A permission claim added to the request, rather than signed into the token by the platform, is
        // ignored. Authorization reads the validated principal only.
        using var request = AuthorizedRequestFor(new TenantScope(OrganizationId), path: PermissionGatedPath);
        request.Headers.Add("permission", Permissions.PlatformAdminister);
        request.Headers.Add("X-Permissions", Permissions.PlatformAdminister);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task A_narrower_scope_is_reported_exactly_as_issued()
    {
        var companyId = Guid.Parse("33333333-0000-0000-0000-000000000003");
        var branchId = Guid.Parse("44444444-0000-0000-0000-000000000004");

        using var request = AuthorizedRequestFor(new TenantScope(OrganizationId, companyId, null, branchId));

        var response = await _client.SendAsync(request);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var scope = body.GetProperty("scope");

        Assert.Equal(companyId, scope.GetProperty("companyId").GetGuid());
        Assert.Equal(branchId, scope.GetProperty("branchId").GetGuid());
        Assert.Equal(System.Text.Json.JsonValueKind.Null, scope.GetProperty("brandId").ValueKind);
        Assert.Equal(System.Text.Json.JsonValueKind.Null, scope.GetProperty("storeId").ValueKind);
    }

    private HttpRequestMessage AuthorizedRequestFor(
        TenantScope scope,
        IReadOnlyCollection<string>? permissions = null,
        string path = PrincipalPath)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            _factory.ResolveIssuer().Issue(new AccessTokenRequest(UserId, scope, ["platform-admin"], permissions ?? [])).Value);

        return request;
    }

    /// <summary>
    /// Assembles a correctly signed token that carries no organization claim, which the platform's own
    /// issuer refuses to produce. Only a foreign or misconfigured authority could emit one, and the
    /// guard middleware has to refuse it too.
    /// </summary>
    private string TokenWithoutScope()
    {
        var key = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
            Convert.FromBase64String(_factory.SigningKeyBase64));

        var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
            issuer: "negar-azin-fadak",
            audience: "negar-azin-fadak.api",
            claims:
            [
                new System.Security.Claims.Claim(PlatformClaims.UserId, UserId.ToString("D")),
                new System.Security.Claims.Claim(PlatformClaims.TokenId, Guid.NewGuid().ToString("N"))
            ],
            notBefore: DateTime.UtcNow.AddMinutes(-1),
            expires: DateTime.UtcNow.AddMinutes(10),
            signingCredentials: new Microsoft.IdentityModel.Tokens.SigningCredentials(
                key,
                Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256));

        return new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>Builds an issuer that is deliberately wrong in one respect, to prove the check exists.</summary>
    private IAccessTokenIssuer ForeignIssuer(bool sameKey = false, string? audience = null)
    {
        var signingKey = sameKey
            ? _factory.SigningKeyBase64
            : Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

        var jwt = new JwtOptions
        {
            Issuer = sameKey ? "negar-azin-fadak" : "some.other.issuer",
            Audience = audience ?? "negar-azin-fadak.api",
            SigningKey = signingKey
        };

        // A same-key issuer must still sign with the host's key, so the shared provider is reused; a
        // different key needs its own provider, otherwise the key is not actually being tested.
        var provider = sameKey
            ? _factory.Services.GetRequiredService<SigningKeyProvider>()
            : new SigningKeyProvider(Microsoft.Extensions.Options.Options.Create(jwt));

        return new JwtAccessTokenIssuer(
            Microsoft.Extensions.Options.Options.Create(jwt),
            provider,
            _factory.Services.GetRequiredService<IClock>());
    }
}
