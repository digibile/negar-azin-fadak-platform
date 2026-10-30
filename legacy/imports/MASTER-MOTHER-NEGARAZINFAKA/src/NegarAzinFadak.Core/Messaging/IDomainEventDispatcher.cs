using NegarAzinFadak.Core.Domain;

namespace NegarAzinFadak.Core.Messaging;

/// <summary>
/// Publishes domain events to in-process handlers after the owning transaction commits.
/// Implementations must not run handlers before the commit, otherwise a rollback would leave
/// side effects that the domain never accepted.
/// </summary>
public interface IDomainEventDispatcher
{
    Task DispatchAsync(IReadOnlyCollection<IDomainEvent> events, CancellationToken cancellationToken = default);
}

/// <summary>Handles one kind of domain event.</summary>
public interface IDomainEventHandler<in TEvent>
    where TEvent : IDomainEvent
{
    Task HandleAsync(TEvent @event, CancellationToken cancellationToken = default);
}

/// <summary>
/// An event that has crossed a module boundary (identity → CRM, identity → accounting, ...). Published
/// through the transactional outbox and consumed idempotently by the receiving module.
/// </summary>
/// <remarks>
/// It is also an <see cref="IDomainEvent"/>: an aggregate that raises an integration event has, in fact,
/// recorded something that happened in the domain. Making that relationship explicit lets a use case
/// raise both kinds through the same aggregate root, instead of maintaining a second, parallel event
/// collection that could drift from the first.
/// </remarks>
public interface IIntegrationEvent : IDomainEvent
{
    /// <summary>Organizational coordinates the event belongs to, so consumers can scope their writes.</summary>
    Tenancy.TenantScope Scope { get; }
}

/// <summary>Base implementation of an integration event.</summary>
public abstract record IntegrationEvent : IIntegrationEvent
{
    protected IntegrationEvent(Guid eventId, DateTimeOffset occurredAt, Tenancy.TenantScope scope)
    {
        EventId = Guard.AgainstEmpty(eventId);
        OccurredAt = occurredAt;
        Scope = Guard.AgainstNull(scope);
    }

    public Guid EventId { get; }

    public DateTimeOffset OccurredAt { get; }

    public Tenancy.TenantScope Scope { get; }
}

/// <summary>Handles one kind of integration event, at least once, with idempotency by event identifier.</summary>
public interface IIntegrationEventHandler<in TEvent>
    where TEvent : IIntegrationEvent
{
    Task HandleAsync(TEvent @event, CancellationToken cancellationToken = default);
}

/// <summary>
/// Stores integration events inside the business transaction so that publication is atomic with the
/// state change that produced it. Implemented over the same database as the aggregate it accompanies.
/// </summary>
public interface IOutbox
{
    /// <summary>Enqueues an event for delivery after the current transaction commits.</summary>
    Task EnqueueAsync(IIntegrationEvent integrationEvent, CancellationToken cancellationToken = default);

    /// <summary>Reads undelivered events, oldest first, for the background dispatcher.</summary>
    Task<IReadOnlyList<OutboxMessage>> ReadPendingAsync(int batchSize, CancellationToken cancellationToken = default);

    /// <summary>Marks an event as delivered.</summary>
    Task MarkDispatchedAsync(Guid messageId, CancellationToken cancellationToken = default);

    /// <summary>Records a failed delivery attempt and schedules the next retry.</summary>
    Task MarkFailedAsync(Guid messageId, string reason, CancellationToken cancellationToken = default);
}

/// <summary>An outbox entry as read by the dispatcher.</summary>
/// <param name="Id">Outbox row identifier, also the deduplication key for delivery.</param>
/// <param name="EventId">Identifier of the integration event being delivered.</param>
/// <param name="EventType">Assembly-qualified event type name, used to resolve the handler.</param>
/// <param name="Payload">Serialised event body.</param>
/// <param name="OccurredAt">When the event occurred.</param>
/// <param name="Attempts">Number of delivery attempts made so far.</param>
public sealed record OutboxMessage(
    Guid Id,
    Guid EventId,
    string EventType,
    string Payload,
    DateTimeOffset OccurredAt,
    int Attempts);
