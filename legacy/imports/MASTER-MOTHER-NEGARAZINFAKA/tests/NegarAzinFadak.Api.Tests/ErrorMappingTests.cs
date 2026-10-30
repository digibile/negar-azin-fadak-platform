using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using NegarAzinFadak.Api.Errors;
using NegarAzinFadak.Core.Results;

namespace NegarAzinFadak.Api.Tests;

/// <summary>
/// A domain failure must reach the wire as a predictable status code and a machine-readable code.
/// These tests pin that contract, because a client branching on <c>Error.Code</c> and an operator
/// reading a 4xx are both relying on it.
/// </summary>
public sealed class ErrorMappingTests
{
    [Theory]
    [InlineData(ErrorType.Validation, 400)]
    [InlineData(ErrorType.Unauthorized, 401)]
    [InlineData(ErrorType.Forbidden, 403)]
    [InlineData(ErrorType.NotFound, 404)]
    [InlineData(ErrorType.Conflict, 409)]
    [InlineData(ErrorType.RateLimited, 429)]
    [InlineData(ErrorType.DomainRule, 422)]
    [InlineData(ErrorType.Unexpected, 500)]
    public void Each_failure_classification_maps_to_its_documented_status(ErrorType type, int expected)
        => Assert.Equal(expected, ErrorMapping.ToStatusCode(type));

    [Fact]
    public void A_failure_renders_as_a_problem_response_carrying_the_stable_code()
    {
        var error = Error.Conflict("identity.user.mobile_taken", "That mobile is already registered.");

        var result = ErrorMapping.ToProblem(Result.Failure(error));

        var problem = ReadProblem(result);
        Assert.Equal(StatusCodes.Status409Conflict, problem.Status);
        Assert.Equal("identity.user.mobile_taken", ReadSingleCode(problem));
        Assert.Equal("That mobile is already registered.", ReadSingleDescription(problem));
    }

    [Fact]
    public void A_server_side_failure_never_returns_its_description_to_the_caller()
    {
        // The reason a 500 happened belongs in the log. Echoing it can disclose connection strings,
        // SQL fragments or identity data, so the response carries a fixed message instead.
        var error = new Error(
            "platform.unexpected",
            ErrorType.Unexpected,
            "Npgsql failed: password authentication failed for user 'negar'");

        var result = ErrorMapping.ToProblem(Result.Failure(error));

        var problem = ReadProblem(result);
        Assert.Equal(StatusCodes.Status500InternalServerError, problem.Status);
        Assert.DoesNotContain("password", ReadSingleDescription(problem), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Several_validation_failures_are_reported_together()
    {
        var errors = ErrorList.Create(
            Error.Validation("identity.user.mobile_invalid", "Mobile is not valid."),
            Error.Validation("identity.user.display_name_required", "Display name is required."));

        var result = ErrorMapping.ToProblem(Result.Failure(errors));

        var problem = ReadProblem(result);
        var codes = ReadCodes(problem);

        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Equal(["identity.user.mobile_invalid", "identity.user.display_name_required"], codes);
    }

    [Fact]
    public void A_batched_failure_never_inherits_the_first_failure_staus_code()
    {
        // Without the collapse, a forbidden plus a not-found would answer 403 and hide the second
        // failure, making a genuine authorization problem look like a missing row.
        var errors = ErrorList.Create(
            Error.Forbidden("identity.user.scope_mismatch"),
            Error.NotFound("identity.user.not_found"));

        var result = ErrorMapping.ToProblem(Result.Failure(errors));

        var problem = ReadProblem(result);

        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Equal(2, ReadCodes(problem).Count);
    }

    [Fact]
    public void A_successful_result_is_never_rendered_as_a_problem()
        => Assert.Throws<InvalidOperationException>(
            () => ErrorMapping.ToProblem(Result.Success()));

    [Fact]
    public void A_successful_value_is_projected_and_a_failure_is_mapped()
    {
        var ok = ErrorMapping.ToResult(Result<int>.Success(7), value => Results.Ok(value));
        var failed = ErrorMapping.ToResult(
            Result<int>.Failure(Error.NotFound("identity.user.not_found")),
            value => Results.Ok(value));

        Assert.Equal(StatusCodes.Status200OK, Assert.IsAssignableFrom<Ok<int>>(ok).StatusCode);
        var problem = ReadProblem(failed);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
    }

    private static ProblemDetails ReadProblem(IResult result)
        => Assert.IsType<ProblemHttpResult>(result).ProblemDetails!;

    private static string ReadSingleCode(ProblemDetails problem)
        => Assert.Single(ReadCodes(problem));

    private static string ReadSingleDescription(ProblemDetails problem)
    {
        var errors = Assert.IsAssignableFrom<IEnumerable<object>>(
            problem.Extensions["errors"]);

        return Assert.Single(errors)
            .GetType()
            .GetProperty("Description")!
            .GetValue(errors.Single()) as string ?? string.Empty;
    }

    private static List<string> ReadCodes(ProblemDetails problem)
    {
        var errors = Assert.IsAssignableFrom<IEnumerable<object>>(
            problem.Extensions["errors"]);

        return
        [
            .. errors.Select(error => error.GetType().GetProperty("Code")!.GetValue(error) as string ?? string.Empty)
        ];
    }
}
