using NegarAzinFadak.Api.Authentication;
using NegarAzinFadak.Api.Errors;
using NegarAzinFadak.Application.Identity;
using NegarAzinFadak.Core.Results;
using Microsoft.AspNetCore.Http;

namespace NegarAzinFadak.Api.Endpoints;

/// <summary>Credentials submitted to obtain an access token.</summary>
/// <param name="Mobile">Anchor mobile number of the central identity, in E.164 form.</param>
/// <param name="Password">The identity's password. Verified against the stored hash and never stored here.</param>
public sealed record AccessTokenRequestDto(string Mobile, string Password);

/// <summary>A minted access token and the metadata a client needs to use it.</summary>
/// <param name="AccessToken">The signed JWT to send as a bearer credential.</param>
/// <param name="TokenType">Always <c>Bearer</c>, as the Authorization header requires.</param>
/// <param name="ExpiresIn">Lifetime in seconds, so a client can refresh before the token expires.</param>
/// <param name="ExpiresAt">Absolute expiry, so a client with a skewed clock still knows when it dies.</param>
/// <param name="Scope">Organizational coordinates the session is scoped to.</param>
/// <param name="Roles">Role codes the session carries.</param>
/// <param name="Permissions">Permission codes the session carries, resolved from those roles.</param>
/// <remarks>
/// The signing key, its algorithm and every other secret stay on the server. The response carries the
/// token and nothing that would let a holder of the token mint another one.
/// </remarks>
public sealed record AccessTokenResponse(
    string AccessToken,
    string TokenType,
    int ExpiresIn,
    DateTimeOffset ExpiresAt,
    TenantScopeResponse Scope,
    IReadOnlyCollection<string> Roles,
    IReadOnlyCollection<string> Permissions);

/// <summary>
/// The sign-in endpoint: the one place where a credential becomes an access token.
/// </summary>
/// <remarks>
/// <para>
/// It is a composition of two existing pieces and adds no authentication of its own. The sign-in use case
/// decides who the caller is and which permissions their roles genuinely grant; the platform's existing
/// token issuer signs the result with the configured key and lifetime. There is no second credential check,
/// no second token format and no path that mints a token without going through the use case.
/// </para>
/// <para>
/// The endpoint is anonymous, because refusing to authenticate an unauthenticated caller is the one thing
/// it must not do. It is the only anonymous endpoint in the versioned group that is not a liveness probe,
/// which is why it is mapped on its own group and named explicitly.
/// </para>
/// </remarks>
internal static class AuthenticationEndpoints
{
    /// <summary>Maps the token endpoint onto the versioned route group.</summary>
    internal static RouteGroupBuilder MapAuthenticationEndpoints(this RouteGroupBuilder group)
    {
        ArgumentNullException.ThrowIfNull(group);

        group.MapPost("/auth/token", async (
                AccessTokenRequestDto request,
                SignInService signIn,
                IAccessTokenIssuer issuer,
                CancellationToken cancellationToken) =>
            {
                var authenticated = await signIn
                    .SignInAsync(new SignInCommand(request.Mobile, request.Password), cancellationToken)
                    .ConfigureAwait(false);

                if (authenticated.IsFailure)
                {
                    return ErrorMapping.ToProblem(authenticated);
                }

                var identity = authenticated.Value;
                var token = issuer.Issue(new AccessTokenRequest(
                    identity.UserId,
                    identity.Scope,
                    identity.Roles,
                    identity.Permissions));

                return Results.Ok(new AccessTokenResponse(
                    token.Value,
                    "Bearer",
                    (int)Math.Max(0, (token.ExpiresAt - DateTimeOffset.UtcNow).TotalSeconds),
                    token.ExpiresAt,
                    TenantScopeResponse.From(identity.Scope),
                    identity.Roles,
                    identity.Permissions));
            })
            .AllowAnonymous()
            .WithName("IssueAccessToken")
            .WithTags("Authentication")
            .WithSummary("Signs in with a mobile number and password and returns an access token.")
            .Produces<AccessTokenResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        return group;
    }
}
