namespace NegarAzinFadak.Core.Domain;

/// <summary>
/// Something that happened in the domain, expressed in the ubiquitous language and carrying no
/// infrastructure concerns. Domain events are in-process notifications used to keep aggregates
/// consistent; integration events cross module boundaries and are delivered through the outbox.
/// </summary>
public interface IDomainEvent
{
    /// <summary>Stable identifier of this event occurrence, also used for idempotent handling.</summary>
    Guid EventId { get; }

    /// <summary>When the event occurred, in UTC.</summary>
    DateTimeOffset OccurredAt { get; }
}

/// <summary>Base implementation supplying identity and timing to concrete domain events.</summary>
public abstract record DomainEvent : IDomainEvent
{
    protected DomainEvent(Guid eventId, DateTimeOffset occurredAt)
    {
        EventId = Guard.AgainstEmpty(eventId);
        OccurredAt = occurredAt;
    }

    public Guid EventId { get; }

    public DateTimeOffset OccurredAt { get; }
}
