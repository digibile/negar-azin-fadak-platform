using System.Diagnostics.CodeAnalysis;

namespace NegarAzinFadak.Core.Results;

/// <summary>
/// An immutable, transport-agnostic description of a single failure.
/// </summary>
/// <remarks>
/// Errors are values, not exceptions. Domain code returns them; the API layer decides the HTTP shape.
/// <see cref="Code"/> is a stable machine-readable identifier intended for clients and tests,
/// while <see cref="Description"/> is human-oriented and may change.
/// </remarks>
public sealed record Error
{
    /// <summary>Absence of failure.</summary>
    /// <remarks>
    /// Built through the sentinel constructor, because the validating constructor exists precisely to
    /// reject an empty code and <see cref="ErrorType.None"/>: a real error always has both.
    /// </remarks>
    public static readonly Error None = new();

    /// <summary>Initialises a new error.</summary>
    public Error(string code, ErrorType type, string? description = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(code);
        ArgumentOutOfRangeException.ThrowIfEqual(ErrorType.None, type);

        Code = code;
        Type = type;
        Description = description ?? code;
    }

    private Error()
    {
        Code = string.Empty;
        Type = ErrorType.None;
        Description = string.Empty;
    }

    /// <summary>Stable machine-readable error identifier (e.g. <c>identity.user.mobile_invalid</c>).</summary>
    public string Code { get; }

    /// <summary>Failure classification used to select a transport status code.</summary>
    public ErrorType Type { get; }

    /// <summary>Human-oriented description. Not a stable contract.</summary>
    public string Description { get; }

    /// <summary>Creates a validation failure.</summary>
    public static Error Validation(string code, string? description = null)
        => new(code, ErrorType.Validation, description);

    /// <summary>Creates a not-found failure.</summary>
    public static Error NotFound(string code, string? description = null)
        => new(code, ErrorType.NotFound, description);

    /// <summary>Creates a conflict failure.</summary>
    public static Error Conflict(string code, string? description = null)
        => new(code, ErrorType.Conflict, description);

    /// <summary>Creates a forbidden failure.</summary>
    public static Error Forbidden(string code, string? description = null)
        => new(code, ErrorType.Forbidden, description);

    /// <summary>Creates an unauthorized failure.</summary>
    public static Error Unauthorized(string code, string? description = null)
        => new(code, ErrorType.Unauthorized, description);

    /// <summary>Creates a domain-rule failure, i.e. a rejected state transition or invariant breach.</summary>
    public static Error DomainRule(string code, string? description = null)
        => new(code, ErrorType.DomainRule, description);

    /// <summary>Creates a rate-limit failure.</summary>
    public static Error RateLimited(string code, string? description = null)
        => new(code, ErrorType.RateLimited, description);

    /// <summary>
    /// Creates an unclassified failure, which the API maps to 500.
    /// </summary>
    /// <remarks>
    /// The description is withheld from callers when it is surfaced, so implementations should not put
    /// user-facing copy here. It exists to be logged.
    /// </remarks>
    public static Error Unexpected(string code, string? description = null)
        => new(code, ErrorType.Unexpected, description);

    public override string ToString() => $"{Type}:{Code}";
}

/// <summary>Strongly-typed collection of failures produced by a single operation.</summary>
public sealed class ErrorList : IReadOnlyList<Error>, IEnumerable<object>
{
    private readonly IReadOnlyList<Error> _errors;

    private ErrorList(IReadOnlyList<Error> errors) => _errors = errors;

    /// <summary>An empty list, meaning the operation produced no failures.</summary>
    public static ErrorList Empty { get; } = new(Array.Empty<Error>());

    /// <summary>Creates a list from the supplied failures. At least one failure is required.</summary>
    public static ErrorList Create(params Error[] errors) => Create((IReadOnlyList<Error>)errors);

    /// <summary>Creates a list from the supplied failures. At least one failure is required.</summary>
    public static ErrorList Create(IReadOnlyList<Error> errors)
    {
        ArgumentNullException.ThrowIfNull(errors);
        if (errors.Count == 0)
        {
            throw new ArgumentException("An error list must contain at least one error.", nameof(errors));
        }

        return new ErrorList(Array.AsReadOnly([.. errors]));
    }

    public int Count => _errors.Count;

    public Error this[int index] => _errors[index];

    public IEnumerator<Error> GetEnumerator() => _errors.GetEnumerator();

    IEnumerator<object> IEnumerable<object>.GetEnumerator() => GetEnumerator();

    System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() => GetEnumerator();
}

/// <summary>Non-generic result: success with no value, or a set of failures.</summary>
public readonly struct Result
{
    private Result(bool isSuccess, ErrorList errors)
    {
        IsSuccess = isSuccess;
        IsFailure = !isSuccess;
        Errors = errors;
    }

    /// <summary>True when the operation completed successfully.</summary>
    public bool IsSuccess { get; }

    /// <summary>True when the operation failed.</summary>
    public bool IsFailure { get; }

    /// <summary>Failures produced by the operation; empty on success.</summary>
    public ErrorList Errors { get; }

    /// <summary>True when the operation failed and produced exactly one failure.</summary>
    public bool IsSingleFailure => Errors.Count == 1;

    /// <summary>The single failure, when <see cref="IsSingleFailure"/> is true.</summary>
    public Error FirstError => IsSingleFailure
        ? Errors[0]
        : throw new InvalidOperationException(
            $"FirstError is only valid when there is exactly one failure, but there were {Errors.Count}.");

    public static Result Success() => new(true, ErrorList.Empty);

    public static Result Failure(Error error) => Failure(ErrorList.Create(error));

    public static Result Failure(ErrorList errors) => new(false, errors);
}

/// <summary>Result carrying a value on success and a set of failures otherwise.</summary>
public readonly struct Result<T>
{
    private Result(bool isSuccess, T? value, ErrorList errors)
    {
        IsSuccess = isSuccess;
        IsFailure = !isSuccess;
        _value = value;
        Errors = errors;
    }

    private readonly T? _value;

    public bool IsSuccess { get; }

    public bool IsFailure { get; }

    public ErrorList Errors { get; }

    /// <summary>True when the operation failed and produced exactly one failure.</summary>
    public bool IsSingleFailure => Errors.Count == 1;

    /// <summary>The single failure, when <see cref="IsSingleFailure"/> is true.</summary>
    public Error FirstError => IsSingleFailure
        ? Errors[0]
        : throw new InvalidOperationException(
            $"FirstError is only valid when there is exactly one failure, but there were {Errors.Count}.");

    /// <summary>The produced value. Throws when the result is a failure.</summary>
    public T Value => IsSuccess
        ? _value!
        : throw new InvalidOperationException("Value is not available on a failed result.");

    /// <summary>Attempts to read the value without throwing.</summary>
    public bool TryGetValue([MaybeNullWhen(false)] out T value)
    {
        value = _value;
        return IsSuccess;
    }

    public static Result<T> Success(T value) => new(true, value, ErrorList.Empty);

    public static Result<T> Failure(Error error) => new(false, default, ErrorList.Create(error));

    public static Result<T> Failure(ErrorList errors) => new(false, default, errors);

    /// <summary>Projects the success value, preserving failures untouched.</summary>
    public Result<TOut> Map<TOut>(Func<T, TOut> map)
    {
        ArgumentNullException.ThrowIfNull(map);
        return IsSuccess ? Result<TOut>.Success(map(_value!)) : Result<TOut>.Failure(Errors);
    }
}
