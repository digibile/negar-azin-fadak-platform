using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NegarAzinFadak.Core.Auditing;
using NegarAzinFadak.Core.Domain;
using NegarAzinFadak.Core.Messaging;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Time;

namespace NegarAzinFadak.Infrastructure.Persistence;

/// <summary>An integration event waiting to be published, stored in the same transaction as the state change.</summary>
public sealed class OutboxMessageEntity
{
    /// <summary>Outbox row identifier, used as the delivery deduplication key.</summary>
    public Guid Id { get; set; }

    /// <summary>Identifier of the integration event.</summary>
    public Guid EventId { get; set; }

    /// <summary>Assembly-qualified event type, used to resolve the handler at delivery time.</summary>
    public string EventType { get; set; } = string.Empty;

    /// <summary>Serialised event payload.</summary>
    public string Payload { get; set; } = string.Empty;

    /// <summary>Tenant coordinates, so a consumer writes into the right tenant.</summary>
    public string Scope { get; set; } = string.Empty;

    public DateTimeOffset OccurredAt { get; set; }

    public DateTimeOffset? DispatchedAt { get; set; }

    public DateTimeOffset NextAttemptAt { get; set; }

    public int Attempts { get; set; }

    public string? LastError { get; set; }

    /// <summary>Projects an integration event onto its outbox row.</summary>
    /// <remarks>
    /// Both the interceptor that files events raised by an aggregate and the explicit
    /// <see cref="IOutbox"/> call build the row here, so the two paths cannot disagree about the
    /// serialised shape of an event. Serialisation is against the runtime type rather than
    /// <see cref="IIntegrationEvent"/>: with the interface as the static type the serializer emits only the
    /// members declared on it, and every event-specific member is dropped before a consumer sees the
    /// payload.
    /// </remarks>
    public static OutboxMessageEntity From(IIntegrationEvent integrationEvent)
    {
        ArgumentNullException.ThrowIfNull(integrationEvent);

        return new OutboxMessageEntity
        {
            Id = Guid.NewGuid(),
            EventId = integrationEvent.EventId,
            EventType = integrationEvent.GetType().AssemblyQualifiedName ?? integrationEvent.GetType().FullName!,
            Payload = JsonSerializer.Serialize(integrationEvent, integrationEvent.GetType()),
            Scope = ValueConverterConfiguration.ToStorage(integrationEvent.Scope),
            OccurredAt = integrationEvent.OccurredAt,
            NextAttemptAt = integrationEvent.OccurredAt,
            Attempts = 0
        };
    }
}

/// <summary>A rate-limit counter row, used where a shared store is required instead of an in-memory cache.</summary>
public sealed class RateLimitCounterEntity
{
    /// <summary>Counter key, e.g. <c>otp:issue:Login:+989****1234</c>.</summary>
    public string Key { get; set; } = string.Empty;

    public int Count { get; set; }

    public DateTimeOffset WindowStartedAt { get; set; }
}

/// <summary>
/// Transactional outbox over the same database as the aggregates. Publication is therefore atomic with
/// the business change, which is what lets downstream modules trust that a committed identity change has a
/// corresponding event.
/// </summary>
public sealed class EfCoreOutbox(NegarAzinFadakDbContext context, IClock clock) : IOutbox
{
    private const int MaximumAttempts = 8;

    /// <inheritdoc />
    public Task EnqueueAsync(IIntegrationEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        context.OutboxMessages.Add(OutboxMessageEntity.From(integrationEvent));
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<OutboxMessage>> ReadPendingAsync(int batchSize, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(batchSize);

        // Compared as a UTC DateTime to match the column conversion applied by the model; see
        // ValueConverterConfiguration.ApplyUtcInstantStorage.
        var now = clock.UtcNow.UtcDateTime;
        var pending = await context.OutboxMessages
            .Where(message => message.DispatchedAt == null && message.NextAttemptAt <= now && message.Attempts < MaximumAttempts)
            .OrderBy(message => message.OccurredAt)
            .Take(batchSize)
            .ToListAsync(cancellationToken);

        return pending
            .Select(message => new OutboxMessage(
                message.Id,
                message.EventId,
                message.EventType,
                message.Payload,
                message.OccurredAt,
                message.Attempts))
            .ToList()
            .AsReadOnly();
    }

    /// <inheritdoc />
    public async Task MarkDispatchedAsync(Guid messageId, CancellationToken cancellationToken = default)
    {
        var message = await context.OutboxMessages.FirstOrDefaultAsync(row => row.Id == messageId, cancellationToken);
        if (message is not null)
        {
            message.DispatchedAt = clock.UtcNow;
            message.LastError = null;
        }
    }

    /// <inheritdoc />
    public async Task MarkFailedAsync(Guid messageId, string reason, CancellationToken cancellationToken = default)
    {
        var message = await context.OutboxMessages.FirstOrDefaultAsync(row => row.Id == messageId, cancellationToken);
        if (message is null)
        {
            return;
        }

        message.Attempts++;
        message.LastError = reason.Length > 1024 ? reason[..1024] : reason;

        // Exponential backoff, capped so a poison message eventually stops consuming capacity.
        var delaySeconds = Math.Min(300, Math.Pow(2, Math.Min(message.Attempts, 8)));
        message.NextAttemptAt = clock.UtcNow.AddSeconds(delaySeconds);
    }
}

/// <summary>
/// Fills audit stamps and regenerates concurrency tokens on every write. Doing this in the persistence
/// layer means no use case can forget it, and it keeps actor identity out of business logic.
/// </summary>
public sealed class AuditSaveChangesInterceptor(
    IClock clock,
    ICurrentUser? currentUser = null)
    : SaveChangesInterceptor
{
    private readonly ICurrentUser _currentUser = currentUser ?? CurrentUser.Anonymous;

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        Apply(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        Apply(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void Apply(DbContext? context)
    {
        if (context is null)
        {
            return;
        }

        var now = clock.UtcNow;
        var actorUserId = _currentUser.UserId;

        foreach (var entry in context.ChangeTracker.Entries())
        {
            if (entry.Entity is IAuditable auditable)
            {
                if (entry.State is EntityState.Added)
                {
                    auditable.CreatedAt = auditable.CreatedAt == default ? now : auditable.CreatedAt;
                    auditable.CreatedBy ??= actorUserId;
                }

                if (entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
                {
                    auditable.ModifiedAt = now;
                    auditable.ModifiedBy = actorUserId;
                }
            }

            if (entry.Entity is IHasConcurrencyStamp stamped && entry.State is EntityState.Modified)
            {
                stamped.ConcurrencyStamp = Guid.NewGuid().ToString("N");
            }
        }
    }
}

/// <summary>
/// Publishes domain events to in-process handlers after the transaction commits. Handlers run only once
/// the state change is durable, so a rollback can never leave a side effect that the domain never accepted.
/// </summary>
public sealed class DomainEventDispatcher(IServiceProvider services, ILogger<DomainEventDispatcher> logger)
    : IDomainEventDispatcher
{
    /// <inheritdoc />
    public async Task DispatchAsync(IReadOnlyCollection<IDomainEvent> events, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(events);

        foreach (var domainEvent in events)
        {
            await DispatchOneAsync(domainEvent, cancellationToken);
        }
    }

    private async Task DispatchOneAsync(IDomainEvent domainEvent, CancellationToken cancellationToken)
    {
        var handlerType = typeof(IDomainEventHandler<>).MakeGenericType(domainEvent.GetType());
        var handleMethod = handlerType.GetMethod(nameof(IDomainEventHandler<IDomainEvent>.HandleAsync));
        if (handleMethod is null)
        {
            return;
        }

        foreach (var handler in services.GetServices(handlerType))
        {
            try
            {
                if (handleMethod.Invoke(handler, [domainEvent, cancellationToken]) is Task handlerTask)
                {
                    await handlerTask;
                }

                logger.LogInformation(
                    "Domain event {EventType} dispatched at {OccurredAt}.",
                    domainEvent.GetType().Name,
                    domainEvent.OccurredAt);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                // The owning transaction has already committed, so failing a handler must not roll the
                // business change back. The failure is logged and surfaced through health checks instead.
                logger.LogError(
                    exception,
                    "Domain event {EventType} handler {HandlerType} failed.",
                    domainEvent.GetType().Name,
                    handlerType.Name);
            }
        }
    }
}
