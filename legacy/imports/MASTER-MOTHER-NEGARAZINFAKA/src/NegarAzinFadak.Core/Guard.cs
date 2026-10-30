using System.Diagnostics.CodeAnalysis;
using System.Runtime.CompilerServices;

namespace NegarAzinFadak.Core;

/// <summary>
/// Precondition checks used to protect invariants at API boundaries of the domain.
/// </summary>
/// <remarks>
/// Guards throw. They enforce programmer error and structural invariants at construction time,
/// where a broken invariant can never be persisted. Expected business outcomes are expressed as
/// <see cref="Results.Result{T}"/> values instead, so that a caller can react to them.
/// </remarks>
public static class Guard
{
    public static T AgainstNull<T>(T? value, [CallerArgumentExpression(nameof(value))] string? parameterName = null)
        where T : class
        => value ?? throw new ArgumentNullException(parameterName);

    public static string AgainstNullOrWhiteSpace(
        [NotNull] string? value,
        [CallerArgumentExpression(nameof(value))] string? parameterName = null)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException("Value must not be null, empty or whitespace.", parameterName);
        }

        return value;
    }

    public static Guid AgainstEmpty(Guid value, [CallerArgumentExpression(nameof(value))] string? parameterName = null)
        => value != Guid.Empty
            ? value
            : throw new ArgumentException("Identifier must not be empty.", parameterName);

    public static T AgainstDefault<T>(T value, [CallerArgumentExpression(nameof(value))] string? parameterName = null)
        where T : struct
        => EqualityComparer<T>.Default.Equals(value, default)
            ? throw new ArgumentException("Value must not be the default for its type.", parameterName)
            : value;

    public static int AgainstNegativeOrZero(
        int value,
        [CallerArgumentExpression(nameof(value))] string? parameterName = null)
        => value > 0
            ? value
            : throw new ArgumentOutOfRangeException(parameterName, value, "Value must be greater than zero.");

    public static int AgainstNegative(int value, [CallerArgumentExpression(nameof(value))] string? parameterName = null)
        => value >= 0
            ? value
            : throw new ArgumentOutOfRangeException(parameterName, value, "Value must not be negative.");

    public static decimal AgainstNegative(
        decimal value,
        [CallerArgumentExpression(nameof(value))] string? parameterName = null)
        => value >= 0m
            ? value
            : throw new ArgumentOutOfRangeException(parameterName, value, "Value must not be negative.");

    public static TimeSpan AgainstNegative(
        TimeSpan value,
        [CallerArgumentExpression(nameof(value))] string? parameterName = null)
        => value >= TimeSpan.Zero
            ? value
            : throw new ArgumentOutOfRangeException(parameterName, value, "Value must not be negative.");

    public static TEnum AgainstOutOfRange<TEnum>(TEnum value, [CallerArgumentExpression(nameof(value))] string? parameterName = null)
        where TEnum : struct, Enum
        => Enum.IsDefined(value)
            ? value
            : throw new ArgumentOutOfRangeException(parameterName, value, "Value is not a defined enum member.");

    public static void Against(bool condition, string message)
    {
        if (condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    /// <summary>
    /// Asserts an invariant and returns the value, so that constructor arguments can be validated
    /// inline while still being rejected before any state is assigned.
    /// </summary>
    public static T Ensure<T>(bool condition, T value, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }

        return value;
    }
}
