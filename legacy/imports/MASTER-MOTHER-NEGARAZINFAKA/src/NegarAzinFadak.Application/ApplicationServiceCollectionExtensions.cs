using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using NegarAzinFadak.Application.Abstractions.Documents;
using NegarAzinFadak.Application.Auditing;
using NegarAzinFadak.Application.Documents;
using NegarAzinFadak.Application.Identity;
using NegarAzinFadak.Application.Navigation;
using NegarAzinFadak.Application.Options;
using NegarAzinFadak.Application.Tenancy;

namespace NegarAzinFadak.Application;

/// <summary>
/// Registers the platform's use cases.
/// </summary>
/// <remarks>
/// The container is the only place that knows which concrete port an abstract dependency resolves to, so
/// a use case can be exercised against a different persistence or provider implementation without being
/// edited. The composition root in the API host adds exactly one call to this, and the test harness adds
/// the same one, which is what keeps a test from wiring a different graph than production.
/// </remarks>
public static class ApplicationServiceCollectionExtensions
{
    /// <summary>Registers use cases and binds their options from configuration.</summary>
    public static IServiceCollection AddPlatformApplication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        services.AddOptions<PlatformAuthorizationOptions>()
            .Bind(configuration.GetSection(PlatformAuthorizationOptions.SectionName))
            .Validate(
                options => options.Validate().Count == 0,
                $"'{PlatformAuthorizationOptions.SectionName}' is inconsistent: a role template references an unknown permission, or a code is declared twice.")
            .ValidateOnStart();

        services.AddOptions<TenantProvisioningOptions>()
            .Bind(configuration.GetSection(TenantProvisioningOptions.SectionName))
            .ValidateOnStart();

        services.AddOptions<SignInOptions>()
            .Bind(configuration.GetSection(SignInOptions.SectionName))
            .Validate(options => options.MaxFailedAttempts > 0, "A sign-in lockout threshold must be positive.")
            .Validate(options => options.MinimumPasswordLength >= 12, "A stored password must be at least 12 characters.")
            .ValidateOnStart();

        services.AddOptions<MenuOptions>()
            .Bind(configuration.GetSection(MenuOptions.SectionName))
            .Validate(
                options => options.Validate().Count == 0,
                $"'{MenuOptions.SectionName}' is inconsistent: a base section has no code, title or module, nests too deep, or is declared twice among its siblings.")
            .ValidateOnStart();

        services.AddOptions<DocumentOptions>()
            .Bind(configuration.GetSection(DocumentOptions.SectionName))
            .ValidateOnStart();

        services.AddOptions<DocumentImageQualityOptions>()
            .Bind(configuration.GetSection(DocumentImageQualityOptions.SectionName))
            .Validate(
                options => options.MinimumOverallScore is >= 0d and <= 1d
                    && options.MinimumSharpness is >= 0d and <= 1d,
                $"'{DocumentImageQualityOptions.SectionName}' thresholds must be between 0 and 1.")
            .Validate(
                options => options.MaximumSizeInBytes > 0,
                $"'{DocumentImageQualityOptions.SectionName}:MaximumSizeInBytes' must be positive.")
            .ValidateOnStart();

        // Cross-checked against the declared permissions as a separate validator, because the options builder
        // cannot express "this options object depends on that one" without resolving the dependency from the
        // container, and configuration-bound options are not container services.
        services.AddSingleton<Microsoft.Extensions.Options.IValidateOptions<MenuOptions>, MenuOptionsValidator>();

        // The document type catalogue is validated for the same reason the menu is: both are deployment
        // configuration whose mistakes are invisible until a request depends on them.
        services.AddSingleton<Microsoft.Extensions.Options.IValidateOptions<DocumentOptions>, DocumentTypeCatalogueValidator>();

        services.AddScoped<AuditTrailWriter>();
        services.AddScoped<PermissionCatalogService>();
        services.AddScoped<TenantProvisioningService>();
        services.AddScoped<TenantLifecycleService>();
        services.AddScoped<TenantConfigurationService>();
        services.AddScoped<RoleAdministrationService>();
        services.AddScoped<SignInService>();
        services.AddScoped<IdentityService>();
        services.AddScoped<DocumentTypeService>();
        services.AddScoped<DocumentService>();
        services.AddScoped<DigitalFolderService>();

        // The capture analyzer is the single implementation of the platform's quality policy, shared by the
        // mobile client and the API so the two cannot disagree about whether a photo is acceptable. It takes
        // the options object rather than IOptions because the analyzer is a stateless singleton over a
        // validated snapshot, not a service that reads configuration per call.
        services.AddSingleton<IDocumentImageAnalyzer>(provider =>
            new DefaultDocumentImageAnalyzer(
                provider.GetRequiredService<IOptions<DocumentImageQualityOptions>>().Value));
        services.AddScoped<MenuNavigationService>();
        services.AddScoped<MenuAdministrationService>();
        services.AddScoped<MenuStructureService>();

        return services;
    }
}
