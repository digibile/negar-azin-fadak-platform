using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Auditing;
using NegarAzinFadak.Core.Tenancy;

namespace NegarAzinFadak.Organization.Domain;

/// <summary>
/// One recorded lifecycle transition of an organizational unit.
/// </summary>
/// <remarks>
/// The current status alone cannot answer "who suspended this tenant and when". Because a tenant's status
/// decides whether it may trade, that question is an operational and legal one, so the transition is kept
/// as data next to the unit instead of being reconstructed from log output.
/// </remarks>
public sealed class OrganizationalUnitStatusChange : IAuditable, ITenantScoped
{
    private OrganizationalUnitStatusChange()
    {
        From = OrganizationalUnitStatus.Draft;
        To = OrganizationalUnitStatus.Draft;
        Scope = TenantScope.None;
    }

    internal OrganizationalUnitStatusChange(
        Guid id,
        Guid unitId,
        OrganizationalUnitStatus from,
        OrganizationalUnitStatus to,
        string? reason,
        Guid? actorId,
        DateTimeOffset changedAt,
        TenantScope scope)
    {
        Id = Guard.AgainstEmpty(id);
        UnitId = Guard.AgainstEmpty(unitId);
        From = from;
        To = to;
        Reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        ActorId = actorId;
        ChangedAt = changedAt;
        Scope = Guard.AgainstNull(scope);
    }

    public Guid Id { get; private set; }

    /// <summary>Identifier of the unit whose status changed.</summary>
    public Guid UnitId { get; private set; }

    public OrganizationalUnitStatus From { get; private set; }

    public OrganizationalUnitStatus To { get; private set; }

    /// <summary>Why the transition happened. Mandatory for suspension, so a hold is always explainable.</summary>
    public string? Reason { get; private set; }

    /// <summary>Identity that caused the transition, or <see langword="null"/> for a scheduled platform action.</summary>
    public Guid? ActorId { get; private set; }

    public DateTimeOffset ChangedAt { get; private set; }

    public TenantScope Scope { get; private set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTimeOffset? ModifiedAt { get; set; }

    public Guid? ModifiedBy { get; set; }
}
