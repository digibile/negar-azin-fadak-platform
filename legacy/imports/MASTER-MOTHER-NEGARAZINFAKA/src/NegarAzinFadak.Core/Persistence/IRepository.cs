using NegarAzinFadak.Core.Domain;

namespace NegarAzinFadak.Core.Persistence;

/// <summary>
/// Aggregate persistence port. Only aggregate roots are reachable through this abstraction, which is
/// what keeps invariants and transactional boundaries intact.
/// </summary>
public interface IRepository<TAggregate>
    where TAggregate : AggregateRoot
{
    /// <summary>Returns the aggregate with the given identifier, or <see langword="null"/>.</summary>
    Task<TAggregate?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Returns the aggregate with the given identifier or throws when it is absent.</summary>
    /// <exception cref="KeyNotFoundException">The aggregate does not exist within the caller's tenant scope.</exception>
    Task<TAggregate> GetRequiredByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Adds a new aggregate to the unit of work.</summary>
    void Add(TAggregate aggregate);

    /// <summary>Marks an existing aggregate as modified.</summary>
    void Update(TAggregate aggregate);

    /// <summary>Marks an aggregate for deletion, honouring the domain's soft- or hard-delete decision.</summary>
    void Remove(TAggregate aggregate);
}

/// <summary>
/// Transactional boundary. One unit of work per application operation: everything the use case
/// touched is committed together, and integration events leave through the outbox in the same commit.
/// </summary>
public interface IUnitOfWork
{
    /// <summary>Persists all pending changes. Safe to call more than once per operation.</summary>
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>True when the context holds changes that have not been persisted yet.</summary>
    bool HasChanges { get; }
}
