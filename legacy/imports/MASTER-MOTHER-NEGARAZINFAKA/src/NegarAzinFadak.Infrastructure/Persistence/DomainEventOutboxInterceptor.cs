using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Domain;
using NegarAzinFadak.Core.Messaging;

namespace NegarAzinFadak.Infrastructure.Persistence;

/// <summary>
/// Drains the domain events raised by the aggregates being saved and routes each one to the right place.
/// </summary>
/// <remarks>
/// <para>
/// An <see cref="IIntegrationEvent"/> is written to the outbox table <em>before</em> the insert is
/// executed, which puts the event and the state change in the same transaction. That is the only ordering
/// that is safe in both directions: publishing first can announce a change that then rolls back, and saving
/// first can commit a change whose event is lost in a crash, leaving a downstream module permanently
/// unaware that it should have reacted.
/// </para>
/// <para>
/// A pure <see cref="IDomainEvent"/> has no other module waiting on it, so it is dispatched after the
/// commit instead. Dispatching it inside the transaction would let a handler's side effect survive a
/// rollback of the very change it reacted to.
/// </para>
/// <para>
/// The interceptor is created per context — see <see cref="PersistenceServiceCollectionExtensions"/> — so
/// holding the pending events in a field is safe: a <see cref="DbContext"/> is single-threaded and never
/// serves two units of work at once.
/// </para>
/// </remarks>
public sealed class DomainEventOutboxInterceptor(IDomainEventDispatcher dispatcher) : SaveChangesInterceptor
{
    private readonly IDomainEventDispatcher _dispatcher = Guard.AgainstNull(dispatcher);
    private List<IDomainEvent>? _pendingDispatch;

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        Collect(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        Collect(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData,
        int result,
        CancellationToken cancellationToken = default)
    {
        var pending = _pendingDispatch;
        _pendingDispatch = null;

        if (pending is { Count: > 0 })
        {
            await _dispatcher.DispatchAsync(pending, cancellationToken).ConfigureAwait(false);
        }

        return await base.SavedChangesAsync(eventData, result, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Pulls pending events off every tracked entity and files the integration events into the outbox of
    /// the same context, so they are written by the very <c>SaveChanges</c> that writes the aggregates.
    /// </summary>
    /// <remarks>
    /// Every tracked entity is considered, not only the ones in a changed state. An entity that raised an
    /// event and mutated nothing is still Unchanged, and restricting the scan to Added/Modified/Deleted would
    /// drop that event on the floor: nothing would be written, so nothing would be published, and the use case
    /// that raised it would have no way to tell. The outbox row is itself a change, so the save that carries
    /// it is not empty and the event is not published on its own.
    /// </remarks>
    private void Collect(DbContext? context)
    {
        if (context is not NegarAzinFadakDbContext platformContext)
        {
            return;
        }

        var tracked = platformContext.ChangeTracker
            .Entries<Entity>()
            .Select(entry => entry.Entity)
            .Where(entity => entity.DomainEvents.Count > 0)
            .ToList();

        if (tracked.Count == 0)
        {
            return;
        }

        foreach (var entity in tracked)
        {
            foreach (var domainEvent in entity.ClearDomainEvents())
            {
                if (domainEvent is IIntegrationEvent integrationEvent)
                {
                    platformContext.OutboxMessages.Add(OutboxMessageEntity.From(integrationEvent));
                }
                else
                {
                    (_pendingDispatch ??= []).Add(domainEvent);
                }
            }
        }
    }
}
