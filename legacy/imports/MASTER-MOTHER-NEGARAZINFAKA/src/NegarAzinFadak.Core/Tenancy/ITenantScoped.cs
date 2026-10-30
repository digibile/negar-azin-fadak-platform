namespace NegarAzinFadak.Core.Tenancy;

/// <summary>
/// Implemented by every tenant-owned entity. Persistence uses it to apply one global tenant filter by
/// convention, so a new entity cannot accidentally become readable across tenants.
/// </summary>
public interface ITenantScoped
{
    /// <summary>Organizational coordinates of the owning tenant.</summary>
    TenantScope Scope { get; }
}
