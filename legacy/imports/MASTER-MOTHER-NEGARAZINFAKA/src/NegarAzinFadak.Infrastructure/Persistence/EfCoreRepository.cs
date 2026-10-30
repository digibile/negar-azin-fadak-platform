using Microsoft.EntityFrameworkCore;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Domain;
using NegarAzinFadak.Core.Persistence;

namespace NegarAzinFadak.Infrastructure.Persistence;

/// <summary>
/// Aggregate persistence over EF Core.
/// </summary>
/// <remarks>
/// <para>
/// The repository is intentionally thin. Its one job is to make aggregate roots — and only aggregate
/// roots — reachable, because a use case that could load and save a child entity directly would be able
/// to change state without the owning aggregate ever validating it.
/// </para>
/// <para>
/// Reads go through the global tenant filter, so <see cref="GetByIdAsync"/> returning <see langword="null"/>
/// is the tenant boundary: a row of another organization is indistinguishable from one that does not
/// exist, which is exactly what a caller should not be able to tell.
/// </para>
/// <para>
/// The repository does not save. Saving stays with <see cref="IUnitOfWork"/> so a use case that touches
/// several aggregates still commits once.
/// </para>
/// </remarks>
public sealed class EfCoreRepository<TAggregate>(NegarAzinFadakDbContext context) : IRepository<TAggregate>
    where TAggregate : AggregateRoot
{
    private readonly NegarAzinFadakDbContext _context = Guard.AgainstNull(context);

    private DbSet<TAggregate> Set => _context.Set<TAggregate>();

    /// <inheritdoc />
    public async Task<TAggregate?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => await Set.FindAsync([id], cancellationToken).ConfigureAwait(false);

    /// <inheritdoc />
    public async Task<TAggregate> GetRequiredByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => await GetByIdAsync(id, cancellationToken).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"Aggregate of type {typeof(TAggregate).Name} with id '{id}' was not found.");

    /// <inheritdoc />
    public void Add(TAggregate aggregate) => Set.Add(Guard.AgainstNull(aggregate));

    /// <inheritdoc />
    public void Update(TAggregate aggregate) => Set.Update(Guard.AgainstNull(aggregate));

    /// <inheritdoc />
    public void Remove(TAggregate aggregate) => Set.Remove(Guard.AgainstNull(aggregate));
}
