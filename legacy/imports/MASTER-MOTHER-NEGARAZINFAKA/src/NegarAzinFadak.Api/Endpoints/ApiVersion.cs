namespace NegarAzinFadak.Api.Endpoints;

/// <summary>Route prefixes and the OpenAPI document name for the current API version.</summary>
/// <remarks>
/// Versioning is carried in the route prefix rather than a header or a media type. The prefix keeps the
/// version visible in logs, lets a future <c>v2</c> be mounted beside <c>v1</c> without touching <c>v1</c>
/// routing, and needs no additional package or runtime filter.
/// </remarks>
public static class ApiVersion
{
    /// <summary>Current major version, used in route prefixes.</summary>
    public const int Major = 1;

    /// <summary>OpenAPI document name served at <c>/openapi/{documentName}.json</c>.</summary>
    public const string DocumentName = "v1";

    /// <summary>Route group prefix for the current version, e.g. <c>/api/v1</c>.</summary>
    public const string RoutePrefix = "/api/v1";
}
