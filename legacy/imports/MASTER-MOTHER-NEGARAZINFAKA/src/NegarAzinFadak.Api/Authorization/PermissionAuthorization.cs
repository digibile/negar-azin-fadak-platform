using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using NegarAzinFadak.Core;

namespace NegarAzinFadak.Api.Authorization;

/// <summary>
/// A dynamic policy provider so an endpoint can name the permission it needs instead of every permission
/// needing a hand-written policy registration.
/// </summary>
/// <remarks>
/// Permissions are tenant data, so the set is not knowable at startup and cannot be enumerated into
/// policies ahead of time. Building a policy on demand keeps the endpoint declaration honest: the required
/// permission is visible where it is enforced.
/// </remarks>
internal sealed class PermissionPolicyProvider : IAuthorizationPolicyProvider
{
    /// <summary>Policy name prefix identifying a permission policy.</summary>
    internal const string Prefix = "Permission:";

    private readonly DefaultAuthorizationPolicyProvider _fallback;

    public PermissionPolicyProvider(IOptions<AuthorizationOptions> options)
        => _fallback = new DefaultAuthorizationPolicyProvider(Guard.AgainstNull(options));

    /// <inheritdoc />
    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => _fallback.GetDefaultPolicyAsync();

    /// <inheritdoc />
    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => _fallback.GetFallbackPolicyAsync();

    /// <inheritdoc />
    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        ArgumentNullException.ThrowIfNull(policyName);

        if (!policyName.StartsWith(Prefix, StringComparison.Ordinal))
        {
            return _fallback.GetPolicyAsync(policyName);
        }

        var permission = policyName[Prefix.Length..];

        if (string.IsNullOrWhiteSpace(permission))
        {
            return Task.FromResult<AuthorizationPolicy?>(null);
        }

        // A policy is still required, and a valid principal is still required, so an anonymous caller is
        // answered 401 rather than 403 and never reaches the handler.
        var policy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .AddRequirements(new PermissionRequirement(permission))
            .Build();

        return Task.FromResult<AuthorizationPolicy?>(policy);
    }
}

/// <summary>Requires the caller to hold one specific permission code.</summary>
/// <param name="Permission">Permission code that must be present.</param>
internal sealed record PermissionRequirement(string Permission) : IAuthorizationRequirement;

/// <summary>
/// Grants a requirement when the validated principal carries the permission.
/// </summary>
/// <remarks>
/// The permission is read from the authenticated principal, never from a header, a query string or the
/// request body. Because the token is signature-validated before this runs, a caller cannot add a
/// permission to their own token, and a token minted for another tenant arrives without this tenant's
/// codes.
/// </remarks>
internal sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    /// <inheritdoc />
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(requirement);

        var granted = context.User
            .FindAll(Authentication.PlatformClaims.Permission)
            .Any(claim => string.Equals(claim.Value, requirement.Permission, StringComparison.Ordinal));

        if (granted)
        {
            context.Succeed(requirement);
        }

        // Failing to succeed leaves the requirement unmet, which the policy turns into a 403. Denying
        // explicitly would be equivalent here, but would also override any other handler that could
        // legitimately succeed, so the handler stays additive.
        return Task.CompletedTask;
    }
}

/// <summary>Endpoint helpers for declaring permission requirements.</summary>
public static class PermissionAuthorizationExtensions
{
    /// <summary>Requires the caller to hold <paramref name="permission"/>.</summary>
    public static TBuilder RequirePermission<TBuilder>(this TBuilder builder, string permission)
        where TBuilder : IEndpointConventionBuilder
    {
        ArgumentNullException.ThrowIfNull(builder);
        ArgumentException.ThrowIfNullOrWhiteSpace(permission);

        return builder.RequireAuthorization(PermissionPolicyProvider.Prefix + permission);
    }
}
