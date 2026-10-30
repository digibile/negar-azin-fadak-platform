using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NegarAzinFadak.Core.Results;

namespace NegarAzinFadak.Api.Errors;

/// <summary>
/// The single place where a domain <see cref="ErrorType"/> becomes an HTTP status code, and where a
/// <see cref="Result"/> becomes a response body.
/// </summary>
/// <remarks>
/// Centralised deliberately. Scattered <c>if</c> chains that pick status codes per endpoint drift apart,
/// which is how a permission failure starts returning 500 to some clients and 403 to others. Expected
/// business outcomes arrive here as values and never as exceptions.
/// </remarks>
public static class ErrorMapping
{
    /// <summary>Maps a failure classification to its transport status code.</summary>
    public static int ToStatusCode(ErrorType type) => type switch
    {
        ErrorType.Validation => StatusCodes.Status400BadRequest,
        ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
        ErrorType.Forbidden => StatusCodes.Status403Forbidden,
        ErrorType.NotFound => StatusCodes.Status404NotFound,
        ErrorType.Conflict => StatusCodes.Status409Conflict,
        ErrorType.RateLimited => StatusCodes.Status429TooManyRequests,
        ErrorType.DomainRule => StatusCodes.Status422UnprocessableEntity,
        ErrorType.None => StatusCodes.Status500InternalServerError,
        _ => StatusCodes.Status500InternalServerError
    };

    /// <summary>
    /// True when the failure description is safe to return. A 500 means the platform hit a defect, and
    /// the reason is for the log, not the caller.
    /// </summary>
    private static bool IsClientVisible(ErrorType type) => type != ErrorType.Unexpected;

    /// <summary>Writes a failed <see cref="Result"/> as an RFC 7807 problem response.</summary>
    public static IResult ToProblem(Result result)
    {
        if (result.IsSuccess)
        {
            throw new InvalidOperationException("A successful result cannot be rendered as a problem response.");
        }

        return BuildProblem(result.Errors);
    }

    /// <summary>
    /// Renders a <see cref="Result{T}"/>, projecting the success value through
    /// <paramref name="onSuccess"/> and mapping failures through <see cref="ToProblem(Result)"/>.
    /// </summary>
    public static IResult ToResult<T>(Result<T> result, Func<T, IResult> onSuccess)
    {
        ArgumentNullException.ThrowIfNull(onSuccess);

        return result.IsSuccess
            ? onSuccess(result.Value)
            : ToProblem(Result.Failure(result.Errors));
    }

    /// <summary>
    /// Renders a <see cref="Result{T}"/> as a problem response, discarding the value because the caller is
    /// on a failure path.
    /// </summary>
    public static IResult ToProblem<T>(Result<T> result) => ToProblem(Result.Failure(result.Errors));

    /// <summary>
    /// Answers a use case that returns no value: 204 when it succeeded, the mapped problem when it did not.
    /// </summary>
    /// <remarks>
    /// This is the shape most command endpoints have, and giving it one name keeps every handler from
    /// repeating the same success/failure branch — the kind of repetition where one endpoint quietly starts
    /// returning 200 with a body and the API's contract depends on which file you opened.
    /// </remarks>
    public static IResult ToNoContent(Result result)
        => result.IsSuccess ? Results.NoContent() : ToProblem(result);

    private static IResult BuildProblem(ErrorList errors)
    {
        var status = ToStatusCode(errors[0].Type);

        // A multi-error list should not be answered with a single error's status. Validation is the only
        // classification that legitimately batches, so anything else collapses to the server's fault.
        if (errors.Count > 1)
        {
            status = ToStatusCode(ErrorType.Validation);
        }

        var problem = new ProblemDetails
        {
            Status = status,
            Title = ReasonFor(status),
            Type = $"https://tools.ietf.org/html/rfc9110#section-{status}"
        };

        var details = new List<ProblemDetail>(errors.Count);
        foreach (var error in errors)
        {
            details.Add(new ProblemDetail(
                error.Code,
                IsClientVisible(error.Type) ? error.Description : "The request could not be completed."));
        }

        problem.Extensions["errors"] = details;

        return Results.Problem(problem);
    }

    private static string ReasonFor(int status) => status switch
    {
        StatusCodes.Status400BadRequest => "The request is not valid.",
        StatusCodes.Status401Unauthorized => "Authentication is required.",
        StatusCodes.Status403Forbidden => "The caller is not permitted to perform this operation.",
        StatusCodes.Status404NotFound => "The requested resource does not exist.",
        StatusCodes.Status409Conflict => "The request conflicts with the current state.",
        StatusCodes.Status422UnprocessableEntity => "The request was understood but rejected by a domain rule.",
        StatusCodes.Status429TooManyRequests => "The caller exceeded a rate or quota limit.",
        _ => "The request could not be completed."
    };
}

/// <summary>One machine-readable failure inside a problem response.</summary>
/// <param name="Code">Stable error identifier, safe to branch on in clients and tests.</param>
/// <param name="Description">Human-oriented detail, omitted in substance for server-side failures.</param>
public sealed record ProblemDetail(string Code, string Description);
