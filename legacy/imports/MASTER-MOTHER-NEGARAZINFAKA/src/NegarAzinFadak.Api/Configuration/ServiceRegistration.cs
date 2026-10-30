using System.Text;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NegarAzinFadak.Api.Configuration;
using NegarAzinFadak.Application;
using NegarAzinFadak.Application.Abstractions.Documents;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Infrastructure;
using NegarAzinFadak.Infrastructure.Persistence;
using NegarAzinFadak.Infrastructure.Notifications;
using NegarAzinFadak.Infrastructure.Security;
using NegarAzinFadak.Infrastructure.Storage;

namespace NegarAzinFadak.Api.Configuration;

/// <summary>Registers the platform's services, so the host wires them exactly as the tests do.</summary>
internal static class ServiceRegistration
{
    /// <summary>Health-check tag identifying probes that must not touch the database.</summary>
    internal const string LivenessTag = "live";

    /// <summary>Health-check tag identifying probes that verify database reachability.</summary>
    internal const string ReadinessTag = "ready";

    /// <summary>Wires options, persistence, security primitives and health checks.</summary>
    internal static IServiceCollection AddPlatformServices(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);
        ArgumentNullException.ThrowIfNull(environment);

        services.AddNegarAzinFadakOptions(configuration);

        services.AddSingleton<IClock, SystemClock>();

        // ICurrentUser and ITenantContext are deliberately not registered here. They are built per
        // request from the validated access token by AddPlatformPrincipal, and registering an anonymous
        // fallback alongside them would leave two sources of truth for who the caller is.
        services.AddNegarAzinFadakDbContext(options => DatabaseRegistration.Configure(options, ResolveDatabaseOptions(configuration)));

        services.AddNegarAzinFadakSms(configuration, environment);

        services.AddPlatformApplication(configuration);

        services.AddPlatformDocumentStorage(configuration, environment);

        services.AddPlatformHealthChecks();

        // Order is meaningful: the catalog is reconciled after the schema exists, and hosted services start
        // in registration order, so this pair is a dependency and not a preference. The document type
        // catalogue follows the permission catalog because documents are stored behind the permissions
        // granted above. The bootstrap is last because it needs all three.
        services.AddHostedService<DatabaseInitializer>();
        services.AddHostedService<PermissionCatalogInitializer>();
        services.AddHostedService<DocumentTypeCatalogInitializer>();
        AddDevelopmentBootstrap(services, configuration, environment);

        return services;
    }

    /// <summary>
    /// Registers private document storage.
    /// </summary>
    /// <remarks>
    /// The root path is checked at startup rather than trusted at write time, because the failure this guards
    /// against is silent and permanent: objects written inside a directory the web root also serves are
    /// readable by anyone who guesses or is given the URL, and nothing about the request that fetched them
    /// would show that authorization had been skipped. Refusing to start turns a data-breach-shaped problem
    /// into a deployment error a developer can see immediately.
    /// </remarks>
    internal static IServiceCollection AddPlatformDocumentStorage(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);
        ArgumentNullException.ThrowIfNull(environment);

        // A relative RootPath is anchored to the content root here rather than left to resolve against the
        // process working directory at write time. The two are the same directory for a plain `dotnet run`,
        // but they are not for a service started from a different directory or for a test host, and a
        // containment check that compared a content-root-relative path against a CWD-relative one would
        // disagree with the store about where the bytes actually went.
        var contentRoot = Path.GetFullPath(environment.ContentRootPath);

        // The thing private storage must avoid is the *web root*, not the content root. `UseStaticFiles()`
        // serves the web root and nothing else, so a storage directory elsewhere under the content root is not
        // reachable by a request no matter what middleware is added later. Comparing against the content root
        // instead would reject the ordinary and perfectly safe layout of `App_Data/` inside the published
        // application, which is where this root belongs.
        var webRoot = environment is IWebHostEnvironment webEnvironment && webEnvironment.WebRootPath is { Length: > 0 } configuredWebRoot
            ? Path.GetFullPath(configuredWebRoot)
            : null;

        services.AddOptions<DocumentStorageOptions>()
            .Bind(configuration.GetSection(DocumentStorageOptions.SectionName))
            .PostConfigure(options => options.RootPath = AnchorToContentRoot(options.RootPath, contentRoot))
            .Validate(
                options => IsOutside(webRoot, options.RootPath),
                $"'{DocumentStorageOptions.SectionName}:{nameof(DocumentStorageOptions.RootPath)}' must not resolve inside the web root. Private documents are served only through authorized, expiring endpoints.")
            .Validate(
                options => Uri.TryCreate(options.PublicBaseAddress, UriKind.Absolute, out _),
                $"'{DocumentStorageOptions.SectionName}:{nameof(DocumentStorageOptions.PublicBaseAddress)}' must be an absolute base address, so issued links point at the API itself.")
            .ValidateOnStart();

        services.AddSingleton<IDocumentStorage, FileSystemDocumentStorage>();

        return services;
    }

    /// <summary>
    /// Anchors a relative storage root to the content root, leaving an absolute path untouched.
    /// </summary>
    private static string AnchorToContentRoot(string? rootPath, string contentRoot)
    {
        var configured = rootPath?.Trim();
        if (string.IsNullOrEmpty(configured))
        {
            return contentRoot;
        }

        return Path.IsPathRooted(configured) ? configured : Path.Combine(contentRoot, configured);
    }

    /// <summary>
    /// True when a private storage path resolves outside the web root the host serves static content from.
    /// </summary>
    /// <remarks>
    /// A host with no web root has nothing that a request could be served from, so every path is outside it
    /// and the check has nothing to say. Otherwise the comparison is on resolved paths with a trailing
    /// separator on the web root, for the reason <c>FileSystemDocumentStorage</c> documents on its own
    /// containment check: a bare prefix test also matches a sibling directory whose name merely begins with
    /// the same characters. An unparseable path is reported as outside, because the store will refuse it on
    /// the way in with a clearer message than this check could produce.
    /// </remarks>
    private static bool IsOutside(string? webRoot, string? rootPath)
    {
        if (webRoot is null || string.IsNullOrWhiteSpace(rootPath))
        {
            return true;
        }

        try
        {
            var root = Path.GetFullPath(rootPath);
            var served = webRoot.EndsWith(Path.DirectorySeparatorChar)
                ? webRoot
                : webRoot + Path.DirectorySeparatorChar;

            return !root.StartsWith(served, StringComparison.Ordinal);
        }
        catch (Exception exception) when (exception is ArgumentException or NotSupportedException or PathTooLongException)
        {
            return true;
        }
    }
    internal static IServiceCollection AddPlatformOpenApi(this IServiceCollection services)
    {
        // The bearer scheme and the per-operation requirements are contributed by transformers rather than
        // by editing emitted output, so the contract is regenerated from source. The operation transformer
        // reads the endpoints' own authorization metadata, so it cannot describe an endpoint differently
        // from the way the host enforces it.
        services.AddOpenApi(Endpoints.ApiVersion.DocumentName, options => options
            .AddDocumentTransformer<Authentication.BearerSecuritySchemeTransformer>()
            .AddOperationTransformer<Authentication.BearerRequirementOperationTransformer>());

        return services;
    }

    /// <summary>
    /// Registers the development administrator bootstrap, and only in the Development environment.
    /// </summary>
    /// <remarks>
    /// The registration itself is the guard. Nothing outside this method is reachable when the environment is
    /// not Development, so a production deployment has no code path to the bootstrap at all — which is a
    /// stronger property than hiding it behind a configuration flag that someone could set. The service
    /// re-checks the environment before acting, because a defence that depends on one call site is one
    /// refactor away from being wrong.
    /// </remarks>
    private static void AddDevelopmentBootstrap(
        IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        if (!environment.IsDevelopment())
        {
            return;
        }

        services.AddOptions<DevelopmentBootstrapOptions>()
            .Bind(configuration.GetSection(DevelopmentBootstrapOptions.SectionName))
            .ValidateOnStart();

        services.AddHostedService<DevelopmentAdministratorInitializer>();
    }

    private static void AddNegarAzinFadakOptions(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<DatabaseOptions>()
            .Bind(configuration.GetSection(DatabaseOptions.SectionName))
            .Validate(options => !string.IsNullOrWhiteSpace(options.ConnectionString),
                $"'{DatabaseOptions.SectionName}:{nameof(DatabaseOptions.ConnectionString)}' must be configured through user-secrets or the environment.")
            .ValidateOnStart();

        services.AddOptions<PasswordHashingOptions>()
            .Bind(configuration.GetSection(PasswordHashingOptions.SectionName));

        services.AddOptions<SecretProtectionOptions>()
            .Bind(configuration.GetSection(SecretProtectionOptions.SectionName))
            .Validate(options => IsBase64KeyOfSupportedLength(options.MasterKey),
                $"'{SecretProtectionOptions.SectionName}:{nameof(SecretProtectionOptions.MasterKey)}' must be a base64-encoded 16, 24 or 32 byte key.")
            .Validate(options => IsBase64KeyOfSupportedLength(options.DigestKey),
                $"'{SecretProtectionOptions.SectionName}:{nameof(SecretProtectionOptions.DigestKey)}' must be a base64-encoded 16, 24 or 32 byte key.")
            .ValidateOnStart();

        services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
        services.AddSingleton<ISecretProtector, AesSecretProtector>();
    }

    private static void AddPlatformHealthChecks(this IServiceCollection services)
    {
        services.AddHealthChecks()
            .AddCheck("self", () => HealthCheckResult.Healthy(), tags: [LivenessTag])
            .AddDbContextCheck<NegarAzinFadakDbContext>(
                name: "database",
                tags: [ReadinessTag]);
    }

    private static bool IsBase64KeyOfSupportedLength(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        Span<byte> buffer = stackalloc byte[32];
        return Convert.TryFromBase64String(value, buffer, out var written) && written is 16 or 24 or 32;
    }

    private static DatabaseOptions ResolveDatabaseOptions(IConfiguration configuration)
        => configuration.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>() ?? new DatabaseOptions();
}
