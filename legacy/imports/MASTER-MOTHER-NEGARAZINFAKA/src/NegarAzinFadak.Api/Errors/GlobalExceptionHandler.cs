using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace NegarAzinFadak.Api.Errors;

/// <summary>
/// Converts an unhandled exception into a clean 500 without leaking internals to the caller.
/// </summary>
/// <remarks>
/// Expected business outcomes never reach here: they are returned as <c>Result</c> values and
/// mapped by <see cref="ErrorMapping"/>. An exception reaching this handler is by definition a defect, so
/// the response carries only a generic title plus the correlation id that ties the caller's report to the
/// full detail in the server log. Stack traces, SQL text and identity data stay server-side.
/// </remarks>
internal sealed class GlobalExceptionHandler(
    ILogger<GlobalExceptionHandler> logger,
    IHostEnvironment environment) : IExceptionHandler
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    /// <inheritdoc />
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(httpContext);
        ArgumentNullException.ThrowIfNull(exception);

        // The caller hung up, or the server is shutting down. There is nobody left to answer, and the
        // cancellation is not a defect worth an error-level log.
        if (exception is OperationCanceledException && cancellationToken.IsCancellationRequested)
        {
            return true;
        }

        var correlationId = httpContext.Items[Middleware.CorrelationIdMiddleware.HeaderName] as string;

        // A body or a parameter the platform could not read is the caller's mistake, not a fault. Reporting it
        // as a 500 would tell the client the platform is broken and invite a retry that fails identically, and
        // logging it at error level would bury the defects this handler is actually here to surface.
        if (exception is BadHttpRequestException badRequest)
        {
            logger.LogWarning(
                "Unreadable request. CorrelationId: {CorrelationId}. Path: {Path}. Reason: {Reason}",
                correlationId,
                httpContext.Request.Path,
                badRequest.Message);

            var unreadable = new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "The request could not be read.",
                Type = "https://tools.ietf.org/html/rfc9110#section-15.5.1",
                Detail = badRequest.Message
            };

            if (!string.IsNullOrWhiteSpace(correlationId))
            {
                unreadable.Extensions["correlationId"] = correlationId;
            }

            httpContext.Response.StatusCode = unreadable.Status.Value;
            httpContext.Response.ContentType = "application/problem+json";
            await httpContext.Response.WriteAsJsonAsync(unreadable, SerializerOptions, cancellationToken);

            return true;
        }

        logger.LogError(
            exception,
            "Unhandled exception. CorrelationId: {CorrelationId}. Path: {Path}",
            correlationId,
            httpContext.Request.Path);

        // A unique-constraint violation means the row the caller was creating already exists, which is a
        // conflict rather than a fault. The use cases check for this before writing, so reaching it here
        // means two requests raced; answering 409 tells the client to re-read, where 500 would tell it the
        // platform is broken and invite a retry that collides again.
        if (exception is DbUpdateException { InnerException: { } inner } && IsUniqueViolation(inner))
        {
            logger.LogWarning(
                "A concurrent request wrote the same row. CorrelationId: {CorrelationId}. Path: {Path}",
                correlationId,
                httpContext.Request.Path);

            var conflict = new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "That record already exists.",
                Type = "https://tools.ietf.org/html/rfc9110#section-15.5.10",
                Detail = "Another request created this record at the same time. Re-read it and try again."
            };

            if (!string.IsNullOrWhiteSpace(correlationId))
            {
                conflict.Extensions["correlationId"] = correlationId;
            }

            httpContext.Response.StatusCode = conflict.Status.Value;
            httpContext.Response.ContentType = "application/problem+json";
            await httpContext.Response.WriteAsJsonAsync(conflict, SerializerOptions, cancellationToken);

            return true;
        }

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "The request could not be completed.",
            Type = "https://tools.ietf.org/html/rfc9110#section-15.6.1",
            Detail = environment.IsDevelopment()
                ? exception.Message
                : "An unexpected error occurred. Quote the correlation id when reporting this."
        };

        if (!string.IsNullOrWhiteSpace(correlationId))
        {
            problem.Extensions["correlationId"] = correlationId;
        }

        httpContext.Response.StatusCode = problem.Status.Value;
        httpContext.Response.ContentType = "application/problem+json";

        await httpContext.Response.WriteAsJsonAsync(problem, SerializerOptions, cancellationToken);

        return true;
    }

    /// <summary>
    /// Recognises a unique-constraint violation across the providers the platform supports.
    /// </summary>
    /// <remarks>
    /// Provider error codes differ (SQLite 19, SQL Server 2601/2627, PostgreSQL 23505) and the message text is
    /// not a contract, so each provider's own code is inspected. Anything unrecognised is left to the 500
    /// path rather than guessed at, because calling an unknown database failure a conflict would tell the
    /// client to retry a defect.
    /// </remarks>
    private static bool IsUniqueViolation(Exception exception) => exception switch
    {
        SqliteException sqlite => sqlite.SqliteErrorCode is 19 or 1555 or 2067,
        PostgresException postgres => postgres.SqlState == PostgresErrorCodes.UniqueViolation,
        _ => false
    };
}
