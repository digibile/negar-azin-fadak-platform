namespace NegarAzinFadak.Core.Domain;

/// <summary>
/// The transactional boundary of the domain. Only aggregate roots may be loaded and saved directly,
/// and only aggregate roots raise events.
/// </summary>
public abstract class AggregateRoot : Entity
{
    protected AggregateRoot(Guid id) : base(id)
    {
    }

    protected AggregateRoot()
    {
    }
}
