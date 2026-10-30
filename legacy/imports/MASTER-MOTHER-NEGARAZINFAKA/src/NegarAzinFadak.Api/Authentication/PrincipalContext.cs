using System.Security.Claims;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;

namespace NegarAzinFadak.Api.Authentication;

/// <summary>
/// Decodes the configured signing key once and shares it between token issuance and token validation.
/// </summary>
/// <remarks>
/// One decode, one length check, one place that can reject a bad key. If issuance and validation each
/// derived the key separately, a key that one accepted and the other rejected would surface as tokens the
/// platform mints and then refuses, which is close to indistinguishable from a signing bug in production.
/// </remarks>
internal sealed class SigningKeyProvider
{
    private readonly SymmetricSecurityKey _key;

    public SigningKeyProvider(IOptions<JwtOptions> options)
    {
        var settings = Guard.AgainstNull(options).Value;

        if (string.IsNullOrWhiteSpace(settings.SigningKey))
        {
            throw new InvalidOperationException(
                $"'{JwtOptions.SectionName}:{nameof(JwtOptions.SigningKey)}' is not configured.");
        }

        byte[] material;
        try
        {
            material = Convert.FromBase64String(settings.SigningKey);
        }
        catch (FormatException exception)
        {
            throw new InvalidOperationException(
                $"'{JwtOptions.SectionName}:{nameof(JwtOptions.SigningKey)}' must be a base64-encoded key.",
                exception);
        }

        // HMAC-SHA256 produces a 256-bit tag, so a shorter key is weaker than the algorithm implies.
        if (material.Length < 32)
        {
            throw new InvalidOperationException(
                $"'{JwtOptions.SectionName}:{nameof(JwtOptions.SigningKey)}' must decode to at least 32 bytes.");
        }

        _key = new SymmetricSecurityKey(material);
    }

    /// <summary>The key used to sign and to validate tokens.</summary>
    internal SymmetricSecurityKey Key => _key;
}

/// <summary>
/// Builds the domain principal and tenant scope for the current request from its validated access token.
/// </summary>
/// <remarks>
/// Values are read from <see cref="ClaimsPrincipal"/> on every access rather than cached, so the principal
/// cannot go stale if the pipeline is reordered or a handler re-enters through a different path.
/// </remarks>
internal sealed class PrincipalContext(IHttpContextAccessor httpContextAccessor)
{
    private readonly IHttpContextAccessor _httpContextAccessor =
        httpContextAccessor ?? throw new ArgumentNullException(nameof(httpContextAccessor));

    private readonly TenantContextHolder _tenantContext = new();

    /// <summary>The authenticated caller, or an anonymous principal when the request is not authenticated.</summary>
    internal CurrentUser CurrentUser
    {
        get
        {
            var principal = Current;
            if (principal is null)
            {
                return CurrentUser.Anonymous;
            }

            return new CurrentUser(
                ReadUserId(principal),
                ReadScope(principal),
                ReadAll(principal, PlatformClaims.Role),
                ReadAll(principal, PlatformClaims.Permission),
                httpContextAccessor.HttpContext?.Items[Middleware.CorrelationIdMiddleware.HeaderName] as string);
        }
    }

    /// <summary>The tenant scope the request acts in, published to the domain as a mutable holder.</summary>
    internal ITenantContext TenantContext
    {
        get
        {
            var principal = Current;
            if (principal is not null)
            {
                _tenantContext.Set(ReadScope(principal));
            }

            return _tenantContext;
        }
    }

    private ClaimsPrincipal? Current
    {
        get
        {
            var principal = _httpContextAccessor.HttpContext?.User;
            return principal?.Identity?.IsAuthenticated == true ? principal : null;
        }
    }

    private static Guid ReadUserId(ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(PlatformClaims.UserId);

        return Guid.TryParse(value, out var userId) && userId != Guid.Empty
            ? userId
            : throw new InvalidOperationException(
                "The access token carries no usable subject claim, so no central identity can be resolved.");
    }

    private static TenantScope ReadScope(ClaimsPrincipal principal)
    {
        var organizationId = ReadGuid(principal, PlatformClaims.OrganizationId);

        if (organizationId is null)
        {
            throw new InvalidOperationException(
                $"The access token carries no '{PlatformClaims.OrganizationId}' claim, so the request cannot be "
                + "scoped to a tenant.");
        }

        return new TenantScope(
            organizationId.Value,
            ReadGuid(principal, PlatformClaims.CompanyId),
            ReadGuid(principal, PlatformClaims.BrandId),
            ReadGuid(principal, PlatformClaims.BranchId),
            ReadGuid(principal, PlatformClaims.StoreId));
    }

    private static Guid? ReadGuid(ClaimsPrincipal principal, string claimType)
    {
        var value = principal.FindFirstValue(claimType);

        return Guid.TryParse(value, out var parsed) && parsed != Guid.Empty ? parsed : null;
    }

    private static IReadOnlyCollection<string> ReadAll(ClaimsPrincipal principal, string claimType)
        =>
        [
            .. principal.FindAll(claimType)
                .Select(claim => claim.Value)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.Ordinal)
        ];

    /// <summary>Mutable holder so the domain's <c>ITenantContext</c> contract stays unchanged.</summary>
    private sealed class TenantContextHolder : ITenantContext
    {
        public TenantScope Scope { get; private set; } = TenantScope.None;

        public void Set(TenantScope scope) => Scope = scope;
    }
}
