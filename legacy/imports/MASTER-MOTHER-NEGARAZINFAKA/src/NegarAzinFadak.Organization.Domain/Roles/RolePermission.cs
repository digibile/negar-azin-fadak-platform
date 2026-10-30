using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Tenancy;

namespace NegarAzinFadak.Organization.Domain.Roles;

/// <summary>
/// One grant of a catalog permission to a role, with the moment it was made and withdrawn.
/// </summary>
/// <remarks>
/// A grant is never deleted, only revoked. That keeps the answer to "how did this role end up without this
/// permission" in the role's own data instead of in an audit log somebody has to correlate, and it is why
/// the (role, code) pair stays unique across revoked grants as well.
/// </remarks>
public sealed class RolePermission : ITenantScoped
{
    private RolePermission()
    {
        PermissionCode = string.Empty;
        Scope = TenantScope.None;
    }

    internal RolePermission(
        Guid id,
        Guid roleId,
        string permissionCode,
        DateTimeOffset grantedAt,
        Guid? grantedBy,
        TenantScope scope)
    {
        Id = Guard.AgainstEmpty(id);
        RoleId = Guard.AgainstEmpty(roleId);
        PermissionCode = permissionCode;
        GrantedAt = grantedAt;
        GrantedBy = grantedBy;
        Scope = Guard.AgainstNull(scope);
    }

    public Guid Id { get; private set; }

    /// <summary>Role this grant belongs to.</summary>
    public Guid RoleId { get; private set; }

    /// <summary>Code of the catalog permission that was granted.</summary>
    public string PermissionCode { get; private set; }

    public DateTimeOffset GrantedAt { get; private set; }

    /// <summary>Who granted it, when known.</summary>
    public Guid? GrantedBy { get; private set; }

    /// <summary>When it was withdrawn, or <see langword="null"/> while it still stands.</summary>
    public DateTimeOffset? RevokedAt { get; private set; }

    /// <summary>Who withdrew it, when known.</summary>
    public Guid? RevokedBy { get; private set; }

    /// <summary>
    /// True while the grant stands. Persisted rather than computed from <see cref="RevokedAt"/> so the
    /// read side can be filtered and indexed in SQL, and so the invariant "revoked means stamped" is
    /// stored once rather than re-derived differently by every reader.
    /// </summary>
    public bool IsRevoked { get; private set; }

    /// <summary>Organizational coordinates of the owning role, so a grant is isolated with it.</summary>
    public TenantScope Scope { get; private set; }

    internal void Revoke(DateTimeOffset at, Guid? actorId)
    {
        RevokedAt = at;
        RevokedBy = actorId;
        IsRevoked = true;
    }
}
