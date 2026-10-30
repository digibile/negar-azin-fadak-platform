using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using NegarAzinFadak.Api.Authentication;
using NegarAzinFadak.Api.Authorization;
using NegarAzinFadak.Application.Options;
using NegarAzinFadak.Application.Tenancy;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Infrastructure;
using NegarAzinFadak.Identity.Domain;
using NegarAzinFadak.Identity.Domain.Users;

namespace NegarAzinFadak.Api.Tests;

/// <summary>
/// Drives the real sign-in path end to end: credentials in, a signed access token out, and that token
/// accepted by the endpoints it was minted for.
/// </summary>
/// <remarks>
/// These tests provision through the same <see cref="TenantProvisioningService"/> and role templates a
/// deployment uses, and hash the password with the real <see cref="IPasswordHasher"/>. Nothing about the
/// identity or its grants is stubbed, so a token that works here is one the platform issued on its own.
/// </remarks>
public sealed class AccessTokenEndpointTests : IClassFixture<ApiHostFactory>, IDisposable
{
    private const string TokenPath = "/api/v1/auth/token";
    private const string Mobile = "+989121110000";
    private const string Password = "a-sufficiently-long-development-password";

    private readonly ApiHostFactory _factory;
    private readonly HttpClient _client;

    public AccessTokenEndpointTests(ApiHostFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public void Dispose() => _client.Dispose();

    [Fact]
    public async Task Valid_credentials_return_a_token_that_the_platform_accepts()
    {
        await GivenAnAdministratorAsync();

        var token = await SignInAsync(Mobile, Password);

        Assert.Equal("Bearer", token.GetProperty("tokenType").GetString());
        Assert.False(string.IsNullOrWhiteSpace(token.GetProperty("accessToken").GetString()));
        Assert.True(token.GetProperty("expiresIn").GetInt32() > 0);
        Assert.Equal("tenant_admin", Assert.Single(token.GetProperty("roles").EnumerateArray()).GetString());

        // The permissions must come from the RBAC graph, not from the request, so the token has to agree with
        // what the catalog and the role template actually grant.
        var permissions = token.GetProperty("permissions").EnumerateArray().Select(p => p.GetString()).ToArray();
        Assert.Contains(Permissions.PlatformAdminister, permissions);

        using var authorized = AuthorizedFor(token.GetProperty("accessToken").GetString()!, "/api/v1/me");
        using var me = await _client.SendAsync(authorized);
        var meBody = await me.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        Assert.Equal(token.GetProperty("scope").GetProperty("organizationId").GetGuid(),
            meBody.GetProperty("scope").GetProperty("organizationId").GetGuid());

        // And the permission-gated endpoint the administrator exists to reach.
        using var gated = AuthorizedFor(token.GetProperty("accessToken").GetString()!, "/api/v1/me/permissions");
        using var gatedResponse = await _client.SendAsync(gated);

        Assert.Equal(HttpStatusCode.OK, gatedResponse.StatusCode);
    }

    [Fact]
    public async Task A_wrong_password_is_refused_with_the_same_code_as_an_unknown_mobile()
    {
        // If these two answers differed in code, message or status, the endpoint would report which mobile
        // numbers are registered. The test asserts they are indistinguishable to a caller.
        await GivenAnAdministratorAsync();

        using var wrong = await PostTokenAsync(Mobile, "not-the-password");
        using var unknown = await PostTokenAsync("+989129999999", Password);

        Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, unknown.StatusCode);

        var wrongCode = await ErrorCodeAsync(wrong);
        var unknownCode = await ErrorCodeAsync(unknown);

        Assert.Equal(IdentityErrors.SignInInvalidCredentialsCode, wrongCode);
        Assert.Equal(wrongCode, unknownCode);
    }

    [Fact]
    public async Task A_malformed_mobile_number_is_refused_as_a_wrong_credential_rather_than_a_validation_error()
    {
        await GivenAnAdministratorAsync();

        using var response = await PostTokenAsync("not-a-mobile", Password);

        // "That is not a mobile number" and "no such mobile number" would be two ways of learning what is
        // registered, so malformed input is reported as a failed credential.
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(IdentityErrors.SignInInvalidCredentialsCode, await ErrorCodeAsync(response));
    }

    [Fact]
    public async Task Missing_credentials_are_a_validation_failure()
    {
        await GivenAnAdministratorAsync();

        using var request = new HttpRequestMessage(HttpMethod.Post, TokenPath)
        {
            Content = JsonContent.Create(new { mobile = Mobile, password = "" })
        };
        using var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(IdentityErrors.SignInCredentialsRequiredCode, await ErrorCodeAsync(response));
    }

    [Fact]
    public async Task The_token_endpoint_is_reachable_without_a_bearer_token()
    {
        // A wrong credential and a missing token both produce 401, so the status alone cannot show that the
        // request reached the handler. Two things do: the body is this endpoint's own problem details, and no
        // authentication challenge was issued.
        using var response = await PostTokenAsync("+989129999999", Password);

        Assert.Equal(IdentityErrors.SignInInvalidCredentialsCode, await ErrorCodeAsync(response));
        Assert.False(response.Headers.Contains("WWW-Authenticate"));
    }

    [Fact]
    public async Task A_request_carrying_an_unusable_token_can_still_sign_in()
    {
        // Signing in again must not be blocked by the stale token a browser may still be holding; otherwise a
        // user with an expired session has to sign the other way out first.
        await GivenAnIdentityAsync("+989121110010", UserStatus.Active, grantRole: false);

        using var request = new HttpRequestMessage(HttpMethod.Post, TokenPath)
        {
            Content = JsonContent.Create(new { mobile = "+989121110010", password = Password })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", "an-expired-or-forged-token");

        using var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task A_suspended_identity_cannot_obtain_a_token()
    {
        var (userId, _) = await GivenAnIdentityAsync("+989121110007", UserStatus.Suspended, grantRole: false);

        using var response = await PostTokenAsync("+989121110007", Password);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(IdentityErrors.SignInInvalidCredentialsCode, await ErrorCodeAsync(response));

        // The attempt is still recorded, which is what makes the lockout threshold meaningful.
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<Infrastructure.Persistence.NegarAzinFadakDbContext>();
        var suspended = context.Users.Single(user => user.Id == userId);
        Assert.Equal(1, suspended.FailedLoginAttempts);
    }

    [Fact]
    public async Task An_identity_with_no_role_gets_a_token_with_no_permissions()
    {
        await GivenAnIdentityAsync("+989121110008", UserStatus.Active, grantRole: false);

        var token = await SignInAsync("+989121110008", Password);

        // Authenticating and being permitted are separate questions. A valid session with no permissions is
        // honest; minting permissions the identity was never granted would not be.
        Assert.Empty(token.GetProperty("permissions").EnumerateArray());
        Assert.Empty(token.GetProperty("roles").EnumerateArray());
    }

    [Fact]
    public async Task Repeated_failures_eventually_suspend_the_identity()
    {
        var (userId, _) = await GivenAnIdentityAsync("+989121121212", UserStatus.Active, grantRole: false);

        using var scope = _factory.Services.CreateScope();
        var threshold = scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<SignInOptions>>()
            .Value.MaxFailedAttempts;

        for (var attempt = 0; attempt < threshold; attempt++)
        {
            using var attempt1 = await PostTokenAsync("+989121121212", "wrong-every-time");
            Assert.Equal(HttpStatusCode.Unauthorized, attempt1.StatusCode);
        }

        using var verificationScope = _factory.Services.CreateScope();
        var context = verificationScope.ServiceProvider.GetRequiredService<Infrastructure.Persistence.NegarAzinFadakDbContext>();
        var locked = context.Users.Single(user => user.Id == userId);

        Assert.Equal(UserStatus.Suspended, locked.Status);
        Assert.True(locked.FailedLoginAttempts >= threshold);
    }

    [Fact]
    public async Task A_successful_sign_in_clears_the_recorded_failures()
    {
        await GivenAnIdentityAsync("+989121110009", UserStatus.Active, grantRole: false);

        using (var failed = await PostTokenAsync("+989121110009", "wrong"))
        {
            Assert.Equal(HttpStatusCode.Unauthorized, failed.StatusCode);
        }

        await SignInAsync("+989121110009", Password);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<Infrastructure.Persistence.NegarAzinFadakDbContext>();
        var user = context.Users.Single(candidate => candidate.Mobile == MobileNumber.Create("+989121110009"));

        Assert.Equal(0, user.FailedLoginAttempts);
        Assert.NotNull(user.LastLoginAt);
    }

    [Fact]
    public async Task The_token_response_never_carries_the_signing_key_or_any_secret()
    {
        await GivenAnAdministratorAsync();

        using var response = await PostTokenAsync(Mobile, Password);
        var raw = await response.Content.ReadAsStringAsync();

        Assert.DoesNotContain(_factory.SigningKeyBase64, raw, StringComparison.Ordinal);
        Assert.DoesNotContain("SigningKey", raw, StringComparison.OrdinalIgnoreCase);
    }

    private static HttpRequestMessage AuthorizedFor(string token, string path)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return request;
    }

    private async Task<JsonElement> SignInAsync(string mobile, string password)
    {
        using var response = await PostTokenAsync(mobile, password);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private async Task<HttpResponseMessage> PostTokenAsync(string mobile, string password)
        => await _client.PostAsync(TokenPath, JsonContent.Create(new { mobile, password }));

    private static async Task<string> ErrorCodeAsync(HttpResponseMessage response)
    {
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        return problem.GetProperty("errors")[0].GetProperty("code").GetString()!;
    }

    private async Task GivenAnAdministratorAsync()
    {
        await GivenAnIdentityAsync(Mobile, UserStatus.Active, grantRole: true);
    }

    /// <summary>
    /// Creates a real identity: a provisioned tenant, a real password hash, a real role grant through the
    /// aggregate. The mobile number is the natural key, so a rerun reuses the identity instead of failing on
    /// the unique index.
    /// </summary>
    private async Task<(Guid UserId, TenantScope Scope)> GivenAnIdentityAsync(
        string mobile,
        UserStatus status,
        bool grantRole)
    {
        using var scope = _factory.Services.CreateAsyncScope();
        var provider = scope.ServiceProvider;

        var provisioning = provider.GetRequiredService<TenantProvisioningService>();
        var organizations = provider.GetRequiredService<IOrganizationDirectory>();
        var signInDirectory = provider.GetRequiredService<Application.Identity.IIdentitySignInDirectory>();
        var hasher = provider.GetRequiredService<IPasswordHasher>();
        var users = provider.GetRequiredService<Core.Persistence.IRepository<User>>();
        var unitOfWork = provider.GetRequiredService<Core.Persistence.IUnitOfWork>();
        var roles = provider.GetRequiredService<IRoleDirectory>();
        var clock = provider.GetRequiredService<IClock>();

        var existing = await signInDirectory.FindByMobileAsync(mobile);
        if (existing is not null)
        {
            return (existing.Id, existing.Scope);
        }

        var tenantCode = $"test-{mobile.TrimStart('+')}";
        var organization = await organizations.FindOrganizationByCodeAsync(tenantCode)
            ?? await ProvisionAsync(provisioning, organizations, tenantCode);

        var tenantScope = new TenantScope(organization.Id);
        var user = User.Register(Guid.NewGuid(), tenantScope, MobileNumber.Create(mobile), UserSource.OperatorAssisted);
        user.SetDisplayName("Test Administrator");
        user.SetPassword(hasher.Hash(Password));
        user.ActivateByOperator(clock.UtcNow, organization.Id);

        if (grantRole)
        {
            var role = await roles.FindByCodeAsync(tenantScope, "tenant_admin");
            Assert.NotNull(role);
            user.GrantRole(role!.Code, tenantScope);
        }

        if (status is UserStatus.Suspended)
        {
            user.Suspend("suspended by the test");
        }
        else if (status is UserStatus.Closed)
        {
            user.Close("closed by the test");
        }

        users.Add(user);
        await unitOfWork.SaveChangesAsync();

        return (user.Id, tenantScope);
    }

    private static async Task<Organization.Domain.Organization> ProvisionAsync(
        TenantProvisioningService provisioning,
        IOrganizationDirectory organizations,
        string tenantCode)
    {
        var provisioned = await provisioning.ProvisionAsync(
            new ProvisionTenantCommand(tenantCode, "Test Tenant", null, "IRR", null, null));

        Assert.True(provisioned.IsSuccess, provisioned.IsFailure ? provisioned.FirstError.Code : string.Empty);

        var organization = await organizations.FindOrganizationByCodeAsync(tenantCode);
        Assert.NotNull(organization);
        return organization!;
    }
}
