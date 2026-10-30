using NegarAzinFadak.Core.Domain;
using NegarAzinFadak.Core.Messaging;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Organization.Domain.Configuration;
using NegarAzinFadak.Organization.Domain.Roles;

namespace NegarAzinFadak.Organization.Domain.Events;

/// <summary>A tenant was created and is waiting to be activated.</summary>
public sealed record OrganizationRegistered(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid OrganizationId,
    TenantScope Scope,
    string Code,
    string Name) : DomainEvent(EventId, OccurredAt);

/// <summary>An organizational unit changed lifecycle status.</summary>
public sealed record OrganizationalUnitStatusChanged(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UnitId,
    TenantScope Scope,
    string UnitCode,
    OrganizationalUnitStatus From,
    OrganizationalUnitStatus To,
    string? Reason) : DomainEvent(EventId, OccurredAt);

/// <summary>A role was defined or its permission set changed.</summary>
public sealed record RolePermissionsChanged(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid RoleId,
    TenantScope Scope,
    string RoleCode,
    string GrantedPermissionCode) : DomainEvent(EventId, OccurredAt);

/// <summary>
/// Published when a tenant becomes operational, so catalog, sales, credit and notifications can open
/// their per-tenant structures without importing the organization module's internals.
/// </summary>
public sealed record TenantActivatedIntegration(
    Guid EventId,
    DateTimeOffset OccurredAt,
    TenantScope Scope,
    Guid OrganizationId,
    string OrganizationCode) : IntegrationEvent(EventId, OccurredAt, Scope);

/// <summary>
/// Published when a tenant stops being able to trade. Every module that grants or settles money reads
/// this to stop work for that tenant without polling the organization table.
/// </summary>
public sealed record TenantSuspendedIntegration(
    Guid EventId,
    DateTimeOffset OccurredAt,
    TenantScope Scope,
    Guid OrganizationId,
    string OrganizationCode,
    string? Reason) : IntegrationEvent(EventId, OccurredAt, Scope);

/// <summary>Published when a tenant setting changes, so cached configuration in other modules is invalidated.</summary>
public sealed record TenantSettingChangedIntegration(
    Guid EventId,
    DateTimeOffset OccurredAt,
    TenantScope Scope,
    Guid ConfigurationId,
    string SettingCode) : IntegrationEvent(EventId, OccurredAt, Scope);

/// <summary>
/// Published when a role's effective permission set changes, so a session token minted earlier can be
/// recognised as stale instead of granting access until it expires.
/// </summary>
public sealed record RoleChangedIntegration(
    Guid EventId,
    DateTimeOffset OccurredAt,
    TenantScope Scope,
    Guid RoleId,
    string RoleCode) : IntegrationEvent(EventId, OccurredAt, Scope);

/// <summary>What happened to one item of a menu.</summary>
public enum MenuItemChangeKind
{
    /// <summary>The item was added to the menu.</summary>
    Added = 0,

    /// <summary>One or more descriptive fields of the item changed.</summary>
    Updated = 1,

    /// <summary>The item's code changed.</summary>
    Recoded = 2,

    /// <summary>The item, and everything below it, was re-parented.</summary>
    Moved = 3,

    /// <summary>The item became visible to navigation again.</summary>
    Activated = 4,

    /// <summary>The item was hidden from navigation.</summary>
    Deactivated = 5,

    /// <summary>The item was removed from the menu.</summary>
    Removed = 6
}

/// <summary>
/// A menu item was created, changed, moved, hidden or removed.
/// </summary>
/// <remarks>
/// Published as a domain event rather than written only to the audit trail, because navigation is read by
/// clients that cache it: a client that has to be told a section moved is a client that will keep offering
/// a route the platform has retired. The change leaves through the outbox in the same commit as the edit,
/// so a subscriber can never be told about a move that was rolled back.
/// </remarks>
/// <param name="EventId">Identifier of this event occurrence.</param>
/// <param name="OccurredAt">When the change happened.</param>
/// <param name="Scope">Tenant the menu belongs to.</param>
/// <param name="MenuId">Menu the item belongs to.</param>
/// <param name="MenuCode">Code of the menu, for a subscriber that does not keep identifiers.</param>
/// <param name="ItemId">Identifier of the affected item.</param>
/// <param name="ItemCode">Code of the affected item after the change.</param>
/// <param name="Change">What kind of change it was.</param>
/// <param name="PreviousItemCode">Code before a <see cref="MenuItemChangeKind.Recoded"/> change.</param>
public sealed record MenuItemChanged(
    Guid EventId,
    DateTimeOffset OccurredAt,
    TenantScope Scope,
    Guid MenuId,
    string MenuCode,
    Guid ItemId,
    string ItemCode,
    MenuItemChangeKind Change,
    string? PreviousItemCode = null) : DomainEvent(EventId, OccurredAt);

/// <summary>
/// A menu became available or was withdrawn for an organizational level.
/// </summary>
/// <remarks>
/// A separate event from <see cref="MenuItemChanged"/> because the whole tree changed at once, and a
/// subscriber that invalidates per item would have to enumerate a tree it cannot read while it is being
/// changed.
/// </remarks>
/// <param name="EventId">Identifier of this event occurrence.</param>
/// <param name="OccurredAt">When the change happened.</param>
/// <param name="Scope">Tenant the menu belongs to.</param>
/// <param name="MenuId">Menu that changed.</param>
/// <param name="MenuCode">Code of the menu.</param>
/// <param name="IsActive">Whether the menu is now available to navigation.</param>
public sealed record MenuAvailabilityChanged(
    Guid EventId,
    DateTimeOffset OccurredAt,
    TenantScope Scope,
    Guid MenuId,
    string MenuCode,
    bool IsActive) : IntegrationEvent(EventId, OccurredAt, Scope);

/// <summary>Carries a tenant setting's new value to modules that must not re-read the whole configuration.</summary>
/// <param name="EventId">Identifier of this event occurrence.</param>
/// <param name="OccurredAt">When the setting changed.</param>
/// <param name="Scope">Tenant the setting belongs to.</param>
/// <param name="SettingCode">Stable setting code.</param>
/// <param name="ValueKind">Declared type of the value.</param>
/// <param name="Value">The value, always masked when <paramref name="IsSensitive"/>.</param>
/// <param name="IsSensitive">True when the value is a secret and has been masked before publication.</param>
public sealed record TenantSettingPublished(
    Guid EventId,
    DateTimeOffset OccurredAt,
    TenantScope Scope,
    string SettingCode,
    TenantSettingKind ValueKind,
    string Value,
    bool IsSensitive) : IntegrationEvent(EventId, OccurredAt, Scope);
