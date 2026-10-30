using System.Diagnostics.CodeAnalysis;

namespace NegarAzinFadak.Core.Domain;

/// <summary>
/// A domain concept with no identity of its own: two value objects with equal components are
/// interchangeable, and a value object is immutable.
/// </summary>
public abstract class ValueObject : IEquatable<ValueObject>
{
    /// <summary>
    /// Components that define equality. Order matters: overriding equality and hashing consistently
    /// is what makes a value object substitutable.
    /// </summary>
    protected abstract IEnumerable<object?> GetEqualityComponents();

    public bool Equals(ValueObject? other)
        => other is not null
            && GetType() == other.GetType()
            && GetEqualityComponents().SequenceEqual(other.GetEqualityComponents());

    public override bool Equals(object? obj) => Equals(obj as ValueObject);

    public override int GetHashCode()
    {
        var hash = new HashCode();
        foreach (var component in GetEqualityComponents())
        {
            hash.Add(component);
        }

        return hash.ToHashCode();
    }

    public static bool operator ==(ValueObject? left, ValueObject? right)
        => left is null ? right is null : left.Equals(right);

    public static bool operator !=(ValueObject? left, ValueObject? right) => !(left == right);
}

/// <summary>Non-generic marker retained for readability at call sites that accept <c>object</c>.</summary>
public interface IValueObject
{
}
