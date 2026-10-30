using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using NegarAzinFadak.Core;

namespace NegarAzinFadak.Api.Authentication;

/// <summary>Wires bearer-token authentication against the platform's own signing key.</summary>
internal static class JwtAuthenticationExtensions
{
    /// <summary>Adds JWT bearer authentication and the permission-based authorization scheme.</summary>
    internal static IServiceCollection AddPlatformJwtAuthentication(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer();

        services.AddSingleton<IConfigureOptions<JwtBearerOptions>, ConfigureJwtBearerOptions>();

        return services;
    }
}

/// <summary>
/// Applies the platform's token validation rules to the bearer scheme.
/// </summary>
/// <remarks>
/// Implemented as an options configurator rather than a lambda so the signing key and settings arrive by
/// constructor injection. Building a second service provider inside the configuration callback, which is a
/// common shortcut here, would construct duplicate singletons and silently bypass the lifetime the rest of
/// the host relies on.
/// <para>
/// Issuer, audience, lifetime, signature and algorithm are all validated. Algorithm validation in
/// particular is what stops a caller presenting an unsigned or asymmetrically signed token and having it
/// accepted because only the signature was inspected.
/// </para>
/// </remarks>
internal sealed class ConfigureJwtBearerOptions(
    IOptions<JwtOptions> jwtOptions,
    SigningKeyProvider signingKey) : IConfigureNamedOptions<JwtBearerOptions>
{
    private readonly JwtOptions _jwt = Guard.AgainstNull(jwtOptions).Value;
    private readonly SigningKeyProvider _signingKey = Guard.AgainstNull(signingKey);

    /// <inheritdoc />
    public void Configure(JwtBearerOptions options) => Configure(JwtBearerDefaults.AuthenticationScheme, options);

    /// <inheritdoc />
    public void Configure(string? name, JwtBearerOptions options)
    {
        Guard.AgainstNull(options);

        if (!string.Equals(name, JwtBearerDefaults.AuthenticationScheme, StringComparison.Ordinal))
        {
            return;
        }

        // Standard claim names are kept as issued, so 'sub' and the role claim are read by their real
        // names instead of being rewritten to long URI-shaped ones.
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = _jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = _jwt.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = _signingKey.Key,
            ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
            ClockSkew = _jwt.ClockSkew,
            NameClaimType = PlatformClaims.UserId,
            RoleClaimType = PlatformClaims.Role
        };
    }
}
