namespace NegarAzinFadak.Api.Middleware;

/// <summary>
/// Correlates every request, response, log line and audit record through one identifier.
/// </summary>
/// <remarks>
/// The identifier is honoured when a caller supplies one, so a trace reported by a client can be joined
/// to platform-side records, and generated when absent. Incoming values are constrained to a safe
/// character set and length before being echoed, because the value is written into log output and an
/// unvalidated header would let a caller inject newlines or forge another caller's correlation id.
/// </remarks>
public sealed class CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
{
    /// <summary>Header carrying the correlation identifier in both directions.</summary>
    public const string HeaderName = "X-Correlation-Id";

    private const int MaxLength = 128;

    private readonly RequestDelegate _next = next ?? throw new ArgumentNullException(nameof(next));
    private readonly ILogger<CorrelationIdMiddleware> _logger = logger ?? throw new ArgumentNullException(nameof(logger));

    /// <summary>Assigns the correlation identifier and publishes it to the request services.</summary>
    public async Task InvokeAsync(HttpContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        var correlationId = Resolve(context);
        context.Items[HeaderName] = correlationId;
        context.Response.Headers[HeaderName] = correlationId;

        using (_logger.BeginScope(new Dictionary<string, object> { [HeaderName] = correlationId }))
        {
            await _next(context);
        }
    }

    private static string Resolve(HttpContext context)
    {
        if (context.Request.Headers.TryGetValue(HeaderName, out var supplied))
        {
            var candidate = supplied.ToString();
            if (!string.IsNullOrWhiteSpace(candidate) && IsSafe(candidate))
            {
                return candidate;
            }
        }

        return Guid.NewGuid().ToString("N");
    }

    private static bool IsSafe(string value)
    {
        if (value.Length > MaxLength)
        {
            return false;
        }

        foreach (var character in value)
        {
            var acceptable = char.IsAsciiLetterOrDigit(character) || character is '-' or '_' or '.';
            if (!acceptable)
            {
                return false;
            }
        }

        return true;
    }
}
