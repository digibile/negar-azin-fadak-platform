using Microsoft.AspNetCore.Authorization;

namespace NegarAzinFadak.Api.Authorization;

/// <summary>Registers permission-based authorization.</summary>
internal static class AuthorizationRegistration
{
    /// <summary>
    /// Adds the permission policy provider and handler.
    /// </summary>
    /// <remarks>
    /// Every permission policy also requires an authenticated principal, so an anonymous caller is
    /// answered 401 rather than 403. The distinction matters to a client: 403 means "sign in differently",
    /// 401 means "sign in at all".
    /// </remarks>
    internal static IServiceCollection AddPlatformAuthorization(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddAuthorization();
        services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
        services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();

        return services;
    }
}
