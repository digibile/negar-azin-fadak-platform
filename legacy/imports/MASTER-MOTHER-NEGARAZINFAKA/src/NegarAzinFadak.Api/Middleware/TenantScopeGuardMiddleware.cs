using System.Security.Claims;
using NegarAzinFadak.Api.Authentication;
using NegarAzinFadak.Api.Errors;
using NegarAzinFadak.Core.Results;

namespace NegarAzinFadak.Api.Middleware;

/// <summary>
/// Rejects an authenticated request whose token carries no organization.
/// </summary>
/// <remarks>
/// The platform's own issuer always stamps an organization, so this only fires for a token minted
/// elsewhere or a misconfigured external authority. It matters because an authenticated but unscoped
/// principal would otherwise reach a handler with no tenant to filter on, which is exactly the shape of
/// bug that returns another organization's rows. Answering 401 keeps the failure at the edge, where it is
/// diagnosable, instead of deep inside a query.
/// </remarks>
internal sealed class TenantScopeGuardMiddleware(RequestDelegate next)
{
    private readonly RequestDelegate _next = next ?? throw new ArgumentNullException(nameof(next));

    /// <summary>Rejects a scoped-less principal before it reaches an endpoint.</summary>
    public async Task InvokeAsync(HttpContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        var user = context.User;

        if (user.Identity?.IsAuthenticated == true
            && string.IsNullOrWhiteSpace(user.FindFirstValue(PlatformClaims.OrganizationId)))
        {
            await ErrorMapping.ToProblem(Result.Failure(
                Error.Unauthorized(
                    "auth.token.scope_missing",
                    "The access token carries no organizational scope."))).ExecuteAsync(context);

            return;
        }

        await _next(context);
    }
}
