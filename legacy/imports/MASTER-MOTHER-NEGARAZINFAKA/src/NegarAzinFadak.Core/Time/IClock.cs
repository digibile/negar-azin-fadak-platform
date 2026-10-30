namespace NegarAzinFadak.Core.Time;

/// <summary>
/// Abstraction over the system clock so that time-dependent rules (OTP expiry, document expiry,
/// overdue installments, fiscal periods) are deterministic and testable.
/// </summary>
public interface IClock
{
    /// <summary>Current instant in UTC.</summary>
    DateTimeOffset UtcNow { get; }

    /// <summary>Current calendar date in UTC.</summary>
    DateOnly Today { get; }
}

/// <summary>Default implementation backed by the operating system clock.</summary>
public sealed class SystemClock : IClock
{
    /// <inheritdoc />
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;

    /// <inheritdoc />
    public DateOnly Today => DateOnly.FromDateTime(DateTime.UtcNow);
}

/// <summary>Test double: a clock the caller moves forward explicitly.</summary>
public sealed class FixedClock(DateTimeOffset now) : IClock
{
    private DateTimeOffset _now = Guard.AgainstDefault(now);

    /// <inheritdoc />
    public DateTimeOffset UtcNow => _now;

    /// <inheritdoc />
    public DateOnly Today => DateOnly.FromDateTime(_now.UtcDateTime);

    /// <summary>Moves the clock forward. Backwards movement is not allowed.</summary>
    public void Advance(TimeSpan delta)
    {
        Guard.AgainstNegative(delta, nameof(delta));
        _now = _now.Add(delta);
    }

    /// <summary>Sets the clock to an absolute instant.</summary>
    public void Set(DateTimeOffset now) => _now = now;
}
