using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;

namespace NegarAzinFadak.Api.Authentication;

/// <summary>
/// Rebuilds the domain's ambient state, <see cref="ICurrentUser"/> and <see cref="ITenantContext"/>, from
/// the validated access token, and registers the per-request services that need it.
/// </summary>
/// <remarks>
/// Application and domain code depend on <see cref="ICurrentUser"/> and <see cref="ITenantContext"/>, never
/// on <c>HttpContext</c>. This is the one place that knows how an HTTP request turns into that domain
/// state, which is what keeps tenant isolation out of business logic: a handler cannot forget to set a
/// tenant, because the container only ever builds the principal from a validated token.
/// <para>
/// A token with no organization claim is rejected outright. Every authenticated request in this platform
/// acts within an organization, and a principal without one could not be tenant-scoped, so accepting it
/// would mean serving an unscoped request from an authenticated caller.
/// </para>
/// </remarks>
internal static class PrincipalRegistration
{
    /// <summary>Registers the token-membership services and the per-request principal factories.</summary>
    internal static IServiceCollection AddPlatformAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .Validate(options => !string.IsNullOrWhiteSpace(options.Issuer), "A token issuer must be configured.")
            .Validate(options => !string.IsNullOrWhiteSpace(options.Audience), "A token audience must be configured.")
            .Validate(options => IsUsableSigningKey(options.SigningKey), "A base64 signing key of at least 32 bytes must be configured.")
            .Validate(options => options.AccessTokenLifetime > TimeSpan.Zero, "The access token lifetime must be positive.")
            .ValidateOnStart();

        services.AddSingleton<SigningKeyProvider>();
        services.AddSingleton<IAccessTokenIssuer, JwtAccessTokenIssuer>();

        return services;
    }

    /// <summary>
    /// Registers the scoped principal services. Both read the same token, so a mismatch between the
    /// caller's identity and the tenant it acts in cannot be represented.
    /// </summary>
    internal static IServiceCollection AddPlatformPrincipal(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddScoped<PrincipalContext>();
        services.AddScoped<ICurrentUser>(provider => provider.GetRequiredService<PrincipalContext>().CurrentUser);
        services.AddScoped<ITenantContext>(provider => provider.GetRequiredService<PrincipalContext>().TenantContext);

        return services;
    }

    private static bool IsUsableSigningKey(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        return Convert.TryFromBase64String(value, new byte[64], out var written) && written >= 32;
    }
}
