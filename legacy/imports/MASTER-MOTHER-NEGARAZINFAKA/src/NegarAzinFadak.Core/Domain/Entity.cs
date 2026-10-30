namespace NegarAzinFadak.Core.Domain;

/// <summary>Marker for a persisted domain entity.</summary>
public interface IEntity
{
    Guid Id { get; }
}

/// <summary>
/// An entity with identity semantics: two entities are the same when their identifiers are equal,
/// regardless of attribute values.
/// </summary>
public abstract class Entity : IEntity, IEquatable<Entity>
{
    private readonly List<IDomainEvent> _domainEvents = [];

    protected Entity(Guid id) => Id = Guard.AgainstEmpty(id);

    /// <summary>Parameterless constructor for materialization by the persistence layer only.</summary>
    protected Entity()
    {
    }

    /// <summary>
    /// Identifier of the entity. Assignable only through the constructor or <see cref="AssignId"/>, so that
    /// an identifier can never be mutated once the entity is in the domain.
    /// </summary>
    public Guid Id { get; private set; }

    /// <summary>
    /// Sets the identifier from inside a derived aggregate's constructor. Entities in other assemblies
    /// derive from this type, so the identifier cannot use a C#-visible protected setter.
    /// </summary>
    protected void AssignId(Guid id) => Id = Guard.AgainstEmpty(id);

    /// <summary>Domain events raised but not yet dispatched.</summary>
    public IReadOnlyCollection<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    /// <summary>Records a domain event to be published after the aggregate is persisted.</summary>
    public void RaiseDomainEvent(IDomainEvent domainEvent)
    {
        Guard.AgainstNull(domainEvent);
        _domainEvents.Add(domainEvent);
    }

    /// <summary>Removes and returns the pending events, typically once they have been dispatched.</summary>
    public IReadOnlyCollection<IDomainEvent> ClearDomainEvents()
    {
        var events = _domainEvents.ToArray();
        _domainEvents.Clear();
        return events;
    }

    public bool Equals(Entity? other)
        => other is not null && GetType() == other.GetType() && Id == other.Id;

    public override bool Equals(object? obj) => Equals(obj as Entity);

    public override int GetHashCode() => HashCode.Combine(GetType(), Id);

    public static bool operator ==(Entity? left, Entity? right)
        => left is null ? right is null : left.Equals(right);

    public static bool operator !=(Entity? left, Entity? right) => !(left == right);
}
