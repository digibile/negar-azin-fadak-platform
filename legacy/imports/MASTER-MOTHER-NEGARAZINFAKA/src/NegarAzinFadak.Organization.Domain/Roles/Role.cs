using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Auditing;
using NegarAzinFadak.Core.Domain;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Tenancy;

namespace NegarAzinFadak.Organization.Domain.Roles;

/// <summary>Availability of a role for assignment.</summary>
public enum RoleStatus
{
    /// <summary>Assignable to identities.</summary>
    Active = 0,

    /// <summary>Kept for history but no longer assignable; identities holding it keep it until revoked.</summary>
    Retired = 1
}

/// <summary>
/// A named set of permissions, defined by a tenant and assignable to identities within that tenant.
/// </summary>
/// <remarks>
/// <para>
/// The role code is what a token carries, so the code is the contract: it is normalised, length-bounded
/// and immutable after creation. Renaming the display title is free; renaming the code would silently
/// strip the permissions of everyone who already holds it.
/// </para>
/// <para>
/// A role carries its own <see cref="TenantScope"/>, so the same role code may exist independently in two
/// organizations with different permission sets. That is the point: a reseller tenant must be able to
/// grant <c>seller.order.read</c> without that code meaning anything to another tenant.
/// </para>
/// </remarks>
public sealed class Role : AggregateRoot, IAuditable, IHasConcurrencyStamp, ITenantScoped
{
    private readonly List<RolePermission> _permissions = [];

    private Role()
    {
        Code = string.Empty;
        Name = string.Empty;
        Scope = TenantScope.None;
    }

    private Role(Guid id, TenantScope scope, string code, string name, bool isBuiltIn, string? description)
        : base(id)
    {
        Scope = Guard.AgainstNull(scope);
        Guard.Against(scope.IsEmpty, "A role must belong to an organization.");
        Code = NormalizeCode(code);
        Name = Guard.AgainstNullOrWhiteSpace(name).Trim();
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        IsBuiltIn = isBuiltIn;
        Status = RoleStatus.Active;
        ConcurrencyStamp = Guid.NewGuid().ToString("N");
    }

    /// <summary>Organizational coordinates that own this role.</summary>
    public TenantScope Scope { get; private set; }

    /// <summary>Stable role code carried in access tokens, e.g. <c>seller_manager</c>.</summary>
    public string Code { get; private set; }

    public string Name { get; private set; }

    public string? Description { get; private set; }

    /// <summary>
    /// True for a role the platform provisioned and relies on, e.g. the tenant administrator. A built-in
    /// role may be edited and retired but not deleted or renamed by code, because revoking the platform's
    /// own administrator is a decision no tenant administrator should be able to make by accident.
    /// </summary>
    public bool IsBuiltIn { get; private set; }

    public RoleStatus Status { get; private set; }

    public bool IsActive => Status == RoleStatus.Active;

    public IReadOnlyList<RolePermission> Permissions => _permissions.AsReadOnly();

    public DateTimeOffset CreatedAt { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTimeOffset? ModifiedAt { get; set; }

    public Guid? ModifiedBy { get; set; }

    public string ConcurrencyStamp { get; set; } = string.Empty;

    /// <summary>Defines a role inside a tenant.</summary>
    public static Role Define(Guid id, TenantScope scope, string code, string name, string? description = null)
        => new(id, Guard.AgainstNull(scope), code, name, isBuiltIn: false, description);

    /// <summary>Provisions a role the platform itself depends on. Only the seeding use case may call this.</summary>
    public static Role DefineBuiltIn(Guid id, TenantScope scope, string code, string name, string? description = null)
        => new(id, Guard.AgainstNull(scope), code, name, isBuiltIn: true, description);

    /// <summary>Renames the display title. The code is never changed: tokens already reference it.</summary>
    public Result Rename(string name, string? description = null)
    {
        Name = Guard.AgainstNullOrWhiteSpace(name).Trim();
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        return Result.Success();
    }

    /// <summary>
    /// Grants a catalog permission by code. A duplicate grant is reported rather than silently ignored,
    /// because a caller that asked to grant something and cannot tell whether it already holds it will
    /// keep asking.
    /// </summary>
    /// <remarks>
    /// The code is not checked against <see cref="Permission"/> here. The catalog is a platform-wide
    /// table read on every grant, and resolving it is the application layer's job; the role owns the
    /// invariant that matters to it, which is that a permission is never held twice.
    /// </remarks>
    /// <param name="permissionCode">Code of the catalog permission to grant.</param>
    /// <param name="grantedAt">When the grant was made.</param>
    /// <param name="actorId">Who made it. Recorded on the grant itself, not only in the audit trail.</param>
    public Result Grant(string permissionCode, DateTimeOffset grantedAt, Guid? actorId = null)
    {
        if (!IsActive)
        {
            // Held here and not only in the calling use case: a retired role is unassignable, and a grant
            // added to it is a permission that looks live in an administration screen while no identity can
            // ever receive it.
            return Result.Failure(AuthorizationErrors.NotAssignable);
        }

        var code = NormalizePermissionCode(permissionCode);

        // A revoked grant still occupies the (role, code) pair, and the unique index says so. Refusing the
        // re-grant keeps the rule honest: re-granting means removing the setting, which makes the gap in
        // the role's permission history a deliberate act rather than an accident of a delete.
        if (_permissions.Any(existing => existing.PermissionCode == code))
        {
            return Result.Failure(AuthorizationErrors.PermissionAlreadyGranted(code));
        }

        _permissions.Add(new RolePermission(Guid.NewGuid(), Id, code, grantedAt, actorId, Scope));
        return Result.Success();
    }

    /// <summary>Revokes a previously granted permission.</summary>
    /// <param name="permissionCode">Code of the catalog permission to withdraw.</param>
    /// <param name="revokedAt">When the revocation happened.</param>
    /// <param name="actorId">Who performed it. Kept on the grant row so the history is attributable
    /// without joining it to the audit trail.</param>
    public Result Revoke(string permissionCode, DateTimeOffset revokedAt, Guid? actorId = null)
    {
        var code = NormalizePermissionCode(permissionCode);
        var granted = _permissions.FirstOrDefault(permission => permission.PermissionCode == code);
        if (granted is null || granted.IsRevoked)
        {
            return Result.Failure(AuthorizationErrors.PermissionNotGranted(code));
        }

        granted.Revoke(revokedAt, actorId);
        return Result.Success();
    }

    /// <summary>True when the role currently holds the permission.</summary>
    public bool HasPermission(string permissionCode)
    {
        if (string.IsNullOrWhiteSpace(permissionCode))
        {
            return false;
        }

        var code = NormalizePermissionCode(permissionCode);
        return _permissions.Any(permission => permission.PermissionCode == code && !permission.IsRevoked);
    }

    /// <summary>Codes the role currently holds, excluding revoked grants.</summary>
    public IReadOnlyCollection<string> EffectivePermissions()
        => _permissions
            .Where(permission => !permission.IsRevoked)
            .Select(permission => permission.PermissionCode)
            .ToArray()
            .AsReadOnly();

    /// <summary>Makes the role assignable again.</summary>
    public Result Activate()
    {
        if (IsActive)
        {
            return Result.Success();
        }

        Status = RoleStatus.Active;
        return Result.Success();
    }

    /// <summary>
    /// Retires the role: it stops being assignable, and identities already holding it lose nothing until
    /// the grants are revoked. Retiring rather than deleting is what keeps historical tokens and audit
    /// records interpretable.
    /// </summary>
    public Result Retire()
    {
        if (!IsActive)
        {
            return Result.Failure(AuthorizationErrors.AlreadyRetired(Code));
        }

        Status = RoleStatus.Retired;
        return Result.Success();
    }

    private static string NormalizeCode(string code)
    {
        var trimmed = Guard.AgainstNullOrWhiteSpace(code).Trim().ToLowerInvariant();
        if (trimmed.Length > 64)
        {
            throw new ArgumentException("A role code must not exceed 64 characters.", nameof(code));
        }

        return trimmed;
    }

    private static string NormalizePermissionCode(string code)
    {
        var trimmed = Guard.AgainstNullOrWhiteSpace(code).Trim().ToLowerInvariant();
        if (trimmed.Length > 128)
        {
            throw new ArgumentException("A permission code must not exceed 128 characters.", nameof(code));
        }

        return trimmed;
    }
}
