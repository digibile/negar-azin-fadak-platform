using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;

namespace NegarAzinFadak.Api.Authentication;

/// <summary>Token signing and lifetime settings, read from the <c>Authentication:Jwt</c> section.</summary>
public sealed class JwtOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "Authentication:Jwt";

    /// <summary>Expected <c>iss</c>. A token from any other issuer is rejected.</summary>
    [Required]
    public string Issuer { get; set; } = "negar-azin-fadak";

    /// <summary>Expected <c>aud</c>. A token minted for another service is rejected.</summary>
    [Required]
    public string Audience { get; set; } = "negar-azin-fadak.api";

    /// <summary>
    /// Base64-encoded HMAC signing key of at least 32 bytes. Supplied by the environment; never committed.
    /// </summary>
    [Required]
    public string? SigningKey { get; set; }

    /// <summary>How long an issued access token remains valid.</summary>
    public TimeSpan AccessTokenLifetime { get; set; } = TimeSpan.FromMinutes(15);

    /// <summary>
    /// Tolerance for clock drift between the issuer and the validator. Non-zero because a token minted
    /// a second before expiry must not be rejected outright by a host whose clock is fractionally behind.
    /// </summary>
    public TimeSpan ClockSkew { get; set; } = TimeSpan.FromSeconds(30);
}

/// <summary>Everything needed to mint an access token for one principal.</summary>
/// <param name="UserId">Central identity identifier of the caller.</param>
/// <param name="Scope">Organizational coordinates the token is scoped to.</param>
/// <param name="Roles">Role codes to embed.</param>
/// <param name="Permissions">Permission codes to embed.</param>
public sealed record AccessTokenRequest(
    Guid UserId,
    TenantScope Scope,
    IReadOnlyCollection<string> Roles,
    IReadOnlyCollection<string> Permissions);

/// <summary>A minted access token and the instant it stops being valid.</summary>
/// <param name="Value">The encoded JWT.</param>
/// <param name="ExpiresAt">Expiry, as the caller should be told.</param>
public sealed record AccessToken(string Value, DateTimeOffset ExpiresAt);

/// <summary>
/// Port for minting access tokens, so the platform can be its own token authority today and delegate to
/// an external identity provider later without the endpoints changing.
/// </summary>
public interface IAccessTokenIssuer
{
    /// <summary>Mints a token for the supplied principal.</summary>
    AccessToken Issue(AccessTokenRequest request);
}

/// <summary>
/// Issues self-signed HMAC-SHA256 access tokens carrying the caller's identity, tenant scope, roles and
/// permissions.
/// </summary>
/// <remarks>
/// The platform owns a central identity, so it is the natural authority for its own tokens. Issuance sits
/// behind <see cref="IAccessTokenIssuer"/> precisely so that decision is reversible: swapping in an
/// external provider means implementing this port, not rewriting the endpoints.
/// <para>
/// A token is only ever as fresh as its expiry, which is why the lifetime is short. Revocation and
/// refresh are deliberately not modelled here; they belong to the sign-in use case that issues the token,
/// not to the HTTP host.
/// </para>
/// </remarks>
internal sealed class JwtAccessTokenIssuer : IAccessTokenIssuer
{
    private readonly JwtOptions _options;
    private readonly SigningCredentials _credentials;
    private readonly IClock _clock;

    public JwtAccessTokenIssuer(IOptions<JwtOptions> options, SigningKeyProvider signingKey, IClock clock)
    {
        _options = Guard.AgainstNull(options).Value;
        _clock = Guard.AgainstNull(clock);
        _credentials = new SigningCredentials(Guard.AgainstNull(signingKey).Key, SecurityAlgorithms.HmacSha256);
    }

    /// <inheritdoc />
    public AccessToken Issue(AccessTokenRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);
        Guard.AgainstEmpty(request.UserId, nameof(request.UserId));

        var scope = Guard.AgainstNull(request.Scope);
        if (scope.IsEmpty)
        {
            throw new InvalidOperationException(
                "An access token must carry an organizational scope; a token without one would be unable "
                + "to reach any tenant-scoped row.");
        }

        var issuedAt = _clock.UtcNow;
        var expiresAt = issuedAt.Add(_options.AccessTokenLifetime);

        var claims = new List<Claim>
        {
            new(PlatformClaims.UserId, request.UserId.ToString("D")),
            new(PlatformClaims.TokenId, Guid.NewGuid().ToString("N")),
            new(PlatformClaims.OrganizationId, scope.OrganizationId.ToString("D"))
        };

        AddIfPresent(claims, PlatformClaims.CompanyId, scope.CompanyId);
        AddIfPresent(claims, PlatformClaims.BrandId, scope.BrandId);
        AddIfPresent(claims, PlatformClaims.BranchId, scope.BranchId);
        AddIfPresent(claims, PlatformClaims.StoreId, scope.StoreId);

        claims.AddRange(Distinct(request.Roles).Select(role => new Claim(PlatformClaims.Role, role)));
        claims.AddRange(Distinct(request.Permissions).Select(permission => new Claim(PlatformClaims.Permission, permission)));

        var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: issuedAt.UtcDateTime,
            expires: expiresAt.UtcDateTime,
            signingCredentials: _credentials);

        return new AccessToken(new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }

    private static void AddIfPresent(List<Claim> claims, string type, Guid? value)
    {
        if (value.HasValue && value.Value != Guid.Empty)
        {
            claims.Add(new Claim(type, value.Value.ToString("D")));
        }
    }

    private static IEnumerable<string> Distinct(IEnumerable<string> values)
    {
        ArgumentNullException.ThrowIfNull(values);

        return values
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.Ordinal);
    }
}
