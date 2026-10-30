using Microsoft.Extensions.Logging;
using NegarAzinFadak.Application.Auditing;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Messaging;
using NegarAzinFadak.Core.Persistence;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Organization.Domain.Events;
using NegarAzinFadak.Organization.Domain.Roles;

namespace NegarAzinFadak.Application.Tenancy;

/// <summary>
/// Defines and maintains the roles a tenant grants to its own identities.
/// </summary>
/// <remarks>
/// <para>
/// Every method takes the role identifier and resolves it through a tenant-filtered repository, so a role
/// belonging to another organization is reported as not found rather than modified. The domain never sees
/// a role it should not, and this use case never gets the chance to make that call itself.
/// </para>
/// <para>
/// Permission codes are validated against the catalog before they are granted. Granting an undeclared
/// code would produce a role that looks right and grants nothing, so it is refused with a message naming
/// the code.
/// </para>
/// </remarks>
public sealed class RoleAdministrationService
{
    private readonly IRepository<Role> _roles;
    private readonly IRoleDirectory _directory;
    private readonly IPermissionCatalog _catalog;
    private readonly IUnitOfWork _unitOfWork;
    private readonly AuditTrailWriter _audit;
    private readonly IClock _clock;
    private readonly ILogger<RoleAdministrationService> _logger;

    public RoleAdministrationService(
        IRepository<Role> roles,
        IRoleDirectory directory,
        IPermissionCatalog catalog,
        IUnitOfWork unitOfWork,
        AuditTrailWriter audit,
        IClock clock,
        ILogger<RoleAdministrationService> logger)
    {
        _roles = Guard.AgainstNull(roles);
        _directory = Guard.AgainstNull(directory);
        _catalog = Guard.AgainstNull(catalog);
        _unitOfWork = Guard.AgainstNull(unitOfWork);
        _audit = Guard.AgainstNull(audit);
        _clock = Guard.AgainstNull(clock);
        _logger = Guard.AgainstNull(logger);
    }

    /// <summary>Defines a new role inside the caller's tenant.</summary>
    public async Task<Result<Role>> DefineAsync(
        string code,
        string name,
        string? description,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name))
        {
            return Result<Role>.Failure(AuthorizationErrors.PermissionCodeInvalid);
        }

        var scope = _audit.Scope;
        if (scope.IsEmpty)
        {
            return Result<Role>.Failure(TenantProvisioningErrors.OutsideTenant);
        }

        // Checked before the write rather than left to the unique index. A repeated definition is an
        // expected outcome — a retried request, an operator pasting the same code — and the caller has to be
        // told it in the platform's own vocabulary. Letting the index refuse it would answer 500 to
        // something the caller did on purpose, and the refusal would carry no code to branch on.
        var normalized = code.Trim().ToLowerInvariant();
        if (await _directory.FindByCodeAsync(scope, normalized, cancellationToken).ConfigureAwait(false) is not null)
        {
            return await _audit
                .AuditDenialAsync(
                    TenantAuditActions.RoleDefine,
                    ResourceTypes.Role,
                    normalized,
                    Result<Role>.Failure(AuthorizationErrors.DuplicateRole(normalized)),
                    cancellationToken: cancellationToken)
                .ConfigureAwait(false);
        }

        var role = Role.Define(Guid.NewGuid(), scope, code, name, description);
        _roles.Add(role);

        await _audit.RecordSuccessAsync(
            TenantAuditActions.RoleDefine,
            ResourceTypes.Role,
            role.Id.ToString(),
            new Dictionary<string, string?> { ["code"] = role.Code, ["builtIn"] = "false" },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        _logger.LogInformation("Role {RoleCode} defined in organization {OrganizationId}.", role.Code, scope.OrganizationId);
        return Result<Role>.Success(role);
    }

    /// <summary>Renames a role. The code is never changed, because tokens reference it.</summary>
    public async Task<Result> RenameAsync(Guid roleId, string name, string? description, CancellationToken cancellationToken = default)
    {
        var resolved = await LoadAsync(roleId, cancellationToken).ConfigureAwait(false);
        if (resolved.IsFailure)
        {
            return Result.Failure(resolved.FirstError);
        }

        var role = resolved.Value;
        var renamed = role.Rename(name, description);
        if (renamed.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                TenantAuditActions.RoleRename, ResourceTypes.Role, roleId.ToString(), renamed, cancellationToken: cancellationToken)
                .ConfigureAwait(false);
        }

        await _audit.RecordSuccessAsync(TenantAuditActions.RoleRename, ResourceTypes.Role, roleId.ToString(), cancellationToken: cancellationToken)
            .ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }

    /// <summary>Grants a catalog permission to a role.</summary>
    public async Task<Result> GrantPermissionAsync(
        Guid roleId,
        string permissionCode,
        CancellationToken cancellationToken = default)
    {
        var resolved = await LoadAsync(roleId, cancellationToken).ConfigureAwait(false);
        if (resolved.IsFailure)
        {
            return Result.Failure(resolved.FirstError);
        }

        var role = resolved.Value;
        var code = (permissionCode ?? string.Empty).Trim().ToLowerInvariant();

        var permission = await _catalog.FindAsync(code, cancellationToken).ConfigureAwait(false);
        if (permission is null)
        {
            var missing = Result.Failure(AuthorizationErrors.PermissionNotFound(code));
            return await _audit.AuditDenialAsync(
                TenantAuditActions.RoleGrantPermission, ResourceTypes.Role, roleId.ToString(), missing, cancellationToken: cancellationToken)
                .ConfigureAwait(false);
        }

        if (!permission.IsActive)
        {
            var inactive = Result.Failure(AuthorizationErrors.PermissionInactive(code));
            return await _audit.AuditDenialAsync(
                TenantAuditActions.RoleGrantPermission, ResourceTypes.Role, roleId.ToString(), inactive, cancellationToken: cancellationToken)
                .ConfigureAwait(false);
        }

        if (!role.IsActive)
        {
            var retired = Result.Failure(AuthorizationErrors.NotAssignable);
            return await _audit.AuditDenialAsync(
                TenantAuditActions.RoleGrantPermission, ResourceTypes.Role, roleId.ToString(), retired, cancellationToken: cancellationToken)
                .ConfigureAwait(false);
        }

        var granted = role.Grant(permission.Code, _clock.UtcNow, _audit.ActorId);
        if (granted.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                TenantAuditActions.RoleGrantPermission, ResourceTypes.Role, roleId.ToString(), granted, cancellationToken: cancellationToken)
                .ConfigureAwait(false);
        }

        role.RaiseDomainEvent(new RolePermissionsChanged(
            Guid.NewGuid(), _clock.UtcNow, role.Id, role.Scope, role.Code, permission.Code));
        role.RaiseDomainEvent(new RoleChangedIntegration(
            Guid.NewGuid(), _clock.UtcNow, role.Scope, role.Id, role.Code));

        await _audit.RecordSuccessAsync(
            TenantAuditActions.RoleGrantPermission,
            ResourceTypes.Role,
            roleId.ToString(),
            new Dictionary<string, string?> { ["permission"] = permission.Code },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }

    /// <summary>Revokes a permission from a role.</summary>
    public async Task<Result> RevokePermissionAsync(
        Guid roleId,
        string permissionCode,
        CancellationToken cancellationToken = default)
    {
        var resolved = await LoadAsync(roleId, cancellationToken).ConfigureAwait(false);
        if (resolved.IsFailure)
        {
            return Result.Failure(resolved.FirstError);
        }

        var role = resolved.Value;
        var revoked = role.Revoke(permissionCode, _clock.UtcNow, _audit.ActorId);
        if (revoked.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                TenantAuditActions.RoleRevokePermission, ResourceTypes.Role, roleId.ToString(), revoked, cancellationToken: cancellationToken)
                .ConfigureAwait(false);
        }

        role.RaiseDomainEvent(new RoleChangedIntegration(
            Guid.NewGuid(), _clock.UtcNow, role.Scope, role.Id, role.Code));

        await _audit.RecordSuccessAsync(
            TenantAuditActions.RoleRevokePermission,
            ResourceTypes.Role,
            roleId.ToString(),
            new Dictionary<string, string?> { ["permission"] = (permissionCode ?? string.Empty).Trim().ToLowerInvariant() },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }

    /// <summary>Retires a role so it can no longer be assigned, keeping its grants for history.</summary>
    public async Task<Result> RetireAsync(Guid roleId, CancellationToken cancellationToken = default)
    {
        var resolved = await LoadAsync(roleId, cancellationToken).ConfigureAwait(false);
        if (resolved.IsFailure)
        {
            return Result.Failure(resolved.FirstError);
        }

        var role = resolved.Value;
        var retired = role.Retire();
        if (retired.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                TenantAuditActions.RoleRetire, ResourceTypes.Role, roleId.ToString(), retired, cancellationToken: cancellationToken)
                .ConfigureAwait(false);
        }

        await _audit.RecordSuccessAsync(TenantAuditActions.RoleRetire, ResourceTypes.Role, roleId.ToString(), cancellationToken: cancellationToken)
            .ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }

    /// <summary>Makes a retired role assignable again.</summary>
    public async Task<Result> ActivateAsync(Guid roleId, CancellationToken cancellationToken = default)
    {
        var resolved = await LoadAsync(roleId, cancellationToken).ConfigureAwait(false);
        if (resolved.IsFailure)
        {
            return Result.Failure(resolved.FirstError);
        }

        var role = resolved.Value;
        role.Activate();

        await _audit.RecordSuccessAsync(TenantAuditActions.RoleActivate, ResourceTypes.Role, roleId.ToString(), cancellationToken: cancellationToken)
            .ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }

    private async Task<Result<Role>> LoadAsync(Guid roleId, CancellationToken cancellationToken)
    {
        // Loaded through the directory, with its grants and tracked. The generic repository would return a
        // role whose grants were never read, and a change to a role the caller cannot see is a change the
        // aggregate cannot make correctly.
        var role = await _directory.FindTrackedByIdAsync(roleId, cancellationToken).ConfigureAwait(false);
        if (role is null)
        {
            return Result<Role>.Failure(AuthorizationErrors.RoleNotFound(roleId.ToString()));
        }

        if (role.Scope.OrganizationId != _audit.Scope.OrganizationId)
        {
            return Result<Role>.Failure(AuthorizationErrors.RoleOutsideTenant);
        }

        return Result<Role>.Success(role);
    }
}
