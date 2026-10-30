namespace NegarAzinFadak.Core.Auditing;

/// <summary>
/// Marks an entity whose lifecycle must be traceable. Persistence fills these values automatically
/// from <c>IClock</c> and <see cref="Security.ICurrentUser"/>, so no use case writes them by hand.
/// </summary>
public interface IAuditable
{
    DateTimeOffset CreatedAt { get; set; }

    Guid? CreatedBy { get; set; }

    DateTimeOffset? ModifiedAt { get; set; }

    Guid? ModifiedBy { get; set; }
}

/// <summary>Optimistic concurrency token. Compared by the persistence layer, never by domain code.</summary>
public interface IHasConcurrencyStamp
{
    /// <summary>Opaque version token; regenerated on every accepted write.</summary>
    string ConcurrencyStamp { get; set; }
}

/// <summary>Soft deletion marker for records that must survive for audit and legal reasons.</summary>
public interface ISoftDeletable
{
    bool IsDeleted { get; set; }

    DateTimeOffset? DeletedAt { get; set; }

    Guid? DeletedBy { get; set; }
}
