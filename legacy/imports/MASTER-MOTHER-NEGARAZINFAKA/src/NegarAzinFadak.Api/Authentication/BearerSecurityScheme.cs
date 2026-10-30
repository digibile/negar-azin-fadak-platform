using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace NegarAzinFadak.Api.Authentication;

/// <summary>
/// Declares the platform's bearer security scheme in the generated OpenAPI document.
/// </summary>
/// <remarks>
/// The document is generated, so the scheme is contributed by a document transformer rather than by editing
/// emitted output. It describes the same <c>JwtBearer</c> handler the request pipeline actually runs, so a
/// change to the host's authentication cannot leave the published contract describing a scheme the platform
/// no longer accepts.
/// </remarks>
internal sealed class BearerSecuritySchemeTransformer : IOpenApiDocumentTransformer
{
    /// <summary>Name of the security scheme, and of the requirement that references it.</summary>
    internal const string SchemeName = "bearerAuth";

    /// <inheritdoc />
    public Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(document);

        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>(StringComparer.Ordinal);

        document.Components.SecuritySchemes[SchemeName] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "The access token returned by POST /api/v1/auth/token. It is short-lived; "
                          + "sign in again when it expires."
        };

        return Task.CompletedTask;
    }
}

/// <summary>
/// Marks every operation the host actually protects with the bearer requirement.
/// </summary>
/// <remarks>
/// <para>
/// The requirement is derived from the endpoint's own authorization metadata — the same
/// <see cref="IAuthorizeData"/> the authorization middleware evaluates — instead of from a list maintained
/// beside the endpoints. That is what makes drift impossible: an endpoint that gains
/// <c>RequireAuthorization</c> is described as protected on the next document generation, and one that
/// loses it is described as open, with no second declaration to forget.
/// </para>
/// <para>
/// A global requirement would be wrong in the other direction. It would advertise a bearer token on
/// <c>/api/v1/ping</c> and on the token endpoint itself, instructing a generated client to attach a header
/// to the two requests that must not carry one.
/// </para>
/// </remarks>
internal sealed class BearerRequirementOperationTransformer : IOpenApiOperationTransformer
{
    /// <inheritdoc />
    public Task TransformAsync(
        OpenApiOperation operation,
        OpenApiOperationTransformerContext context,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(operation);
        ArgumentNullException.ThrowIfNull(context);

        var metadata = context.Description.ActionDescriptor.EndpointMetadata;
        var isProtected = metadata is not null && metadata.OfType<IAuthorizeData>().Any();

        if (!isProtected)
        {
            return Task.CompletedTask;
        }

        operation.Security ??= [];
        operation.Security.Add(new OpenApiSecurityRequirement
        {
            [new OpenApiSecuritySchemeReference(BearerSecuritySchemeTransformer.SchemeName, context.Document, externalResource: null!)] = []
        });

        return Task.CompletedTask;
    }
}
