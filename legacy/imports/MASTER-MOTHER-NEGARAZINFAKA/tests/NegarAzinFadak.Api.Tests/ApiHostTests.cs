using System.Net;
using System.Security.Cryptography;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using NegarAzinFadak.Api.Authentication;
using NegarAzinFadak.Api.Middleware;
using NegarAzinFadak.Api.Configuration;

namespace NegarAzinFadak.Api.Tests;

/// <summary>
/// Boots the real host in memory, over a throwaway SQLite database, and exercises the endpoints the
/// platform actually serves. Testing the composition root matters because a mis-registered interceptor
/// or a missing service only shows up when the whole container has to resolve.
/// </summary>
public sealed class ApiHostTests : IClassFixture<ApiHostFactory>, IDisposable
{
    private readonly ApiHostFactory _factory;
    private readonly HttpClient _client;

    public ApiHostTests(ApiHostFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public void Dispose() => _client.Dispose();

    [Fact]
    public async Task Liveness_answers_healthy()
    {
        var response = await _client.GetAsync("/health/live");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Readiness_answers_healthy_once_the_schema_is_applied()
    {
        // A healthy readiness probe is the evidence that the startup initializer applied the real
        // migration and that the tenant-isolation interceptors are wired without failing to resolve.
        var response = await _client.GetAsync("/health/ready");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task The_ping_endpoint_is_served_under_the_versioned_prefix()
    {
        var response = await _client.GetAsync("/api/v1/ping");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("ok", body.GetProperty("status").GetString());
        Assert.Equal(Endpoints.ApiVersion.Major, body.GetProperty("version").GetInt32());
    }

    [Fact]
    public async Task An_openapi_document_is_published_for_the_current_version()
    {
        var response = await _client.GetAsync($"/openapi/{Endpoints.ApiVersion.DocumentName}.json");
        var document = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(document.GetProperty("paths").TryGetProperty("/api/v1/ping", out _));
    }

    [Fact]
    public async Task Every_response_carries_a_correlation_id()
    {
        var response = await _client.GetAsync("/api/v1/ping");

        Assert.True(response.Headers.TryGetValues(CorrelationIdMiddleware.HeaderName, out var values));
        Assert.False(string.IsNullOrWhiteSpace(values.Single()));
    }

    [Fact]
    public async Task A_caller_supplied_correlation_id_is_honoured()
    {
        // A trace id reported by a client has to survive into the platform's records, otherwise support
        // cannot join the two sides.
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/ping");
        request.Headers.Add(CorrelationIdMiddleware.HeaderName, "trace-from-client-42");

        var response = await _client.SendAsync(request);

        Assert.Equal("trace-from-client-42", response.Headers.GetValues(CorrelationIdMiddleware.HeaderName).Single());
    }

    [Theory]
    [InlineData("has spaces")]
    [InlineData("has\ttab")]
    [InlineData("<script>alert(1)</script>")]
    public async Task A_correlation_id_that_could_poison_logs_is_replaced(string hostile)
    {
        // The value is written straight into log output, so an unvalidated header would let a caller
        // forge another caller's trace id or inject line breaks into the log.
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/ping");
        request.Headers.TryAddWithoutValidation(CorrelationIdMiddleware.HeaderName, hostile);

        var response = await _client.SendAsync(request);
        var echoed = response.Headers.GetValues(CorrelationIdMiddleware.HeaderName).Single();

        Assert.NotEqual(hostile, echoed);
        Assert.Matches("^[A-Za-z0-9_.-]+$", echoed);
    }

    [Fact]
    public async Task An_unknown_route_answers_not_found_as_a_problem_document()
    {
        var response = await _client.GetAsync("/api/v1/does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }
}

/// <summary>
/// Builds the host with a disposable SQLite file and per-run secret keys, so the suite never touches a
/// developer's database and never depends on a committed key.
/// </summary>
public sealed class ApiHostFactory : WebApplicationFactory<Program>
{
    private readonly string _databasePath =
        Path.Combine(Path.GetTempPath(), $"negar-api-tests-{Guid.NewGuid():N}.db");

    /// <summary>Signing key the host validates against, so tests can mint and mis-mint tokens.</summary>
    internal string SigningKeyBase64 { get; } = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

    /// <summary>The platform's real token issuer, used to mint valid access tokens.</summary>
    internal IAccessTokenIssuer Issuer { get; private set; } = default!;

    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.UseSetting("Database:Provider", nameof(DatabaseProvider.Sqlite));
        builder.UseSetting("Database:ConnectionString", $"Data Source={_databasePath}");
        builder.UseSetting("Database:MigrateOnStartup", "true");

        // Generated per run: the suite exercises real encryption, and a fixed key in the repository
        // would be a committed secret even when it is only used by tests.
        builder.UseSetting("Security:Secrets:MasterKey", Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)));
        builder.UseSetting("Security:Secrets:DigestKey", Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)));
        builder.UseSetting("Authentication:Jwt:SigningKey", SigningKeyBase64);

        // Declared here rather than inherited from appsettings.Development.json, so the suite cannot
        // silently change behaviour when that file does. The inbox is redirected to a temp directory so a
        // test run never writes a message into the project tree.
        builder.UseSetting("Sms:Provider", "Development");
        builder.UseSetting("Sms:Development:InboxPath", Path.Combine(Path.GetTempPath(), $"negar-sms-{Guid.NewGuid():N}", "inbox.txt"));
    }



    /// <summary>Resolves the host's real issuer, building the host on first use.</summary>
    internal IAccessTokenIssuer ResolveIssuer() => Issuer ??= Services.GetRequiredService<IAccessTokenIssuer>();

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (!disposing)
        {
            return;
        }

        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();

        foreach (var path in new[] { _databasePath, _databasePath + "-wal", _databasePath + "-shm" })
        {
            try
            {
                File.Delete(path);
            }
            catch (IOException)
            {
                // A locked file would leave a temp artefact behind; it is not worth failing the run.
            }
        }
    }
}
