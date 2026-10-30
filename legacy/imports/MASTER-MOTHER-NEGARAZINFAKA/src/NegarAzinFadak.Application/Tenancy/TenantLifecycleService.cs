using Microsoft.Extensions.Logging;
using NegarAzinFadak.Application.Auditing;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Persistence;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Organization.Domain;
using NegarAzinFadak.Organization.Domain.Events;
using OrganizationDomain = NegarAzinFadak.Organization.Domain;

namespace NegarAzinFadak.Application.Tenancy;

/// <summary>
/// Drives the tenant's own lifecycle and the organizational tree below it.
/// </summary>
/// <remarks>
/// <para>
/// Status changes are the highest-consequence operation in the platform: they decide whether a tenant may
/// trade, settle and extend credit at all. Each one is therefore a single transaction that both applies
/// the transition and publishes it, so a downstream module can never observe a tenant as active while its
/// own structures were never created, or the reverse.
/// </para>
/// <para>
/// Suspension requires a reason and is audited as a denial-proof event rather than a description, because
/// "why is my tenant suspended" is a question the platform must be able to answer months later.
/// </para>
/// </remarks>
public sealed class TenantLifecycleService
{
    private readonly IRepository<OrganizationDomain.Organization> _organizations;
    private readonly IRepository<Company> _companies;
    private readonly IRepository<Brand> _brands;
    private readonly IRepository<Branch> _branches;
    private readonly IRepository<Store> _stores;
    private readonly IOrganizationDirectory _directory;
    private readonly IUnitOfWork _unitOfWork;
    private readonly AuditTrailWriter _audit;
    private readonly IClock _clock;
    private readonly ILogger<TenantLifecycleService> _logger;

    public TenantLifecycleService(
        IRepository<OrganizationDomain.Organization> organizations,
        IRepository<Company> companies,
        IRepository<Brand> brands,
        IRepository<Branch> branches,
        IRepository<Store> stores,
        IOrganizationDirectory directory,
        IUnitOfWork unitOfWork,
        AuditTrailWriter audit,
        IClock clock,
        ILogger<TenantLifecycleService> logger)
    {
        _organizations = Guard.AgainstNull(organizations);
        _companies = Guard.AgainstNull(companies);
        _brands = Guard.AgainstNull(brands);
        _branches = Guard.AgainstNull(branches);
        _stores = Guard.AgainstNull(stores);
        _directory = Guard.AgainstNull(directory);
        _unitOfWork = Guard.AgainstNull(unitOfWork);
        _audit = Guard.AgainstNull(audit);
        _clock = Guard.AgainstNull(clock);
        _logger = Guard.AgainstNull(logger);
    }

    /// <summary>Activates the tenant, publishing the event downstream modules provision against.</summary>
    public async Task<Result> ActivateAsync(CancellationToken cancellationToken = default)
    {
        var resolved = await LoadTenantAsync(cancellationToken).ConfigureAwait(false);
        if (resolved.IsFailure)
        {
            return Result.Failure(resolved.FirstError);
        }

        var organization = resolved.Value;
        var now = _clock.UtcNow;
        var previous = organization.Status;
        var activated = organization.Activate(_audit.ActorId, now, "activated by administrator");
        if (activated.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                TenantAuditActions.Activate, ResourceTypes.Organization, organization.Id.ToString(), activated, cancellationToken: cancellationToken)
                .ConfigureAwait(false);
        }

        organization.RaiseDomainEvent(new OrganizationalUnitStatusChanged(
            Guid.NewGuid(),
            now,
            organization.Id,
            organization.Scope,
            organization.Code,
            previous,
            OrganizationalUnitStatus.Active,
            "activated by administrator"));

        organization.RaiseDomainEvent(new TenantActivatedIntegration(
            Guid.NewGuid(), now, organization.Scope, organization.Id, organization.Code));

        await _audit.RecordSuccessAsync(
            TenantAuditActions.Activate,
            ResourceTypes.Organization,
            organization.Id.ToString(),
            new Dictionary<string, string?> { ["code"] = organization.Code },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }

    /// <summary>Suspends the tenant, with a mandatory reason, and tells every module to stop work.</summary>
    public async Task<Result> SuspendAsync(string reason, CancellationToken cancellationToken = default)
    {
        var resolved = await LoadTenantAsync(cancellationToken).ConfigureAwait(false);
        if (resolved.IsFailure)
        {
            return Result.Failure(resolved.FirstError);
        }

        var organization = resolved.Value;
        var now = _clock.UtcNow;
        var previous = organization.Status;

        var suspended = organization.Suspend(reason, _audit.ActorId, now);
        if (suspended.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                TenantAuditActions.Suspend, ResourceTypes.Organization, organization.Id.ToString(), suspended, cancellationToken: cancellationToken)
                .ConfigureAwait(false);
        }

        organization.RaiseDomainEvent(new OrganizationalUnitStatusChanged(
            Guid.NewGuid(), now, organization.Id, organization.Scope, organization.Code, previous, organization.Status, reason));

        organization.RaiseDomainEvent(new TenantSuspendedIntegration(
            Guid.NewGuid(), now, organization.Scope, organization.Id, organization.Code, reason));

        await _audit.RecordSuccessAsync(
            TenantAuditActions.Suspend,
            ResourceTypes.Organization,
            organization.Id.ToString(),
            new Dictionary<string, string?> { ["code"] = organization.Code, ["reason"] = reason.Trim() },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        _logger.LogWarning("Tenant {OrganizationCode} suspended: {Reason}", organization.Code, reason);
        return Result.Success();
    }

    /// <summary>Closes the tenant permanently, retaining all of its history.</summary>
    public async Task<Result> CloseAsync(string? reason, CancellationToken cancellationToken = default)
    {
        var resolved = await LoadTenantAsync(cancellationToken).ConfigureAwait(false);
        if (resolved.IsFailure)
        {
            return Result.Failure(resolved.FirstError);
        }

        var organization = resolved.Value;
        var now = _clock.UtcNow;
        var previous = organization.Status;

        var closed = organization.Close(reason, _audit.ActorId, now);
        if (closed.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                TenantAuditActions.Close, ResourceTypes.Organization, organization.Id.ToString(), closed, cancellationToken: cancellationToken)
                .ConfigureAwait(false);
        }

        organization.RaiseDomainEvent(new OrganizationalUnitStatusChanged(
            Guid.NewGuid(), now, organization.Id, organization.Scope, organization.Code, previous, organization.Status, reason));

        await _audit.RecordSuccessAsync(
            TenantAuditActions.Close,
            ResourceTypes.Organization,
            organization.Id.ToString(),
            new Dictionary<string, string?> { ["code"] = organization.Code },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }

    /// <summary>Creates a node of the organizational tree below the tenant.</summary>
    public async Task<Result<OrganizationalUnit>> CreateUnitAsync(
        OrganizationalUnitLevel level,
        string code,
        string name,
        string? legalName,
        CancellationToken cancellationToken = default)
    {
        var scope = _audit.Scope;
        if (scope.IsEmpty)
        {
            return Result<OrganizationalUnit>.Failure(TenantProvisioningErrors.OutsideTenant);
        }

        if (level == OrganizationalUnitLevel.Organization)
        {
            // Creating a second root is provisioning, not administration; the two paths have different
            // rules and must not be reachable through one endpoint.
            return Result<OrganizationalUnit>.Failure(TenantProvisioningErrors.NotOperable("organization"));
        }

        var parentScope = ResolveParentScope(level, scope);
        if (parentScope is null)
        {
            return Result<OrganizationalUnit>.Failure(OrganizationErrors.NotFound(scope.OrganizationId.ToString()));
        }

        var normalizedCode = (code ?? string.Empty).Trim();
        if (normalizedCode.Length is 0 or > 64)
        {
            return Result<OrganizationalUnit>.Failure(TenantProvisioningErrors.CodeInvalid);
        }

        if (await _directory.CodeExistsAsync(parentScope, level, normalizedCode, null, cancellationToken).ConfigureAwait(false))
        {
            var duplicate = Result<OrganizationalUnit>.Failure(TenantProvisioningErrors.CodeExists(normalizedCode));
            return await _audit.AuditDenialAsync(
                TenantAuditActions.UnitCreate, ResourceTypes.OrganizationalUnit, normalizedCode, duplicate, cancellationToken: cancellationToken)
                .ConfigureAwait(false);
        }

        OrganizationalUnit unit = level switch
        {
            OrganizationalUnitLevel.Company => new Company(Guid.NewGuid(), parentScope.OrganizationId, normalizedCode, name, legalName),
            OrganizationalUnitLevel.Brand => new Brand(Guid.NewGuid(), parentScope, normalizedCode, name, legalName),
            OrganizationalUnitLevel.Branch => new Branch(Guid.NewGuid(), parentScope, normalizedCode, name, legalName),
            OrganizationalUnitLevel.Store => new Store(Guid.NewGuid(), parentScope, normalizedCode, name, legalName),
            _ => throw new ArgumentOutOfRangeException(nameof(level), level, "Unsupported organizational level.")
        };

        Track(unit);

        await _audit.RecordSuccessAsync(
            TenantAuditActions.UnitCreate,
            ResourceTypes.OrganizationalUnit,
            unit.Id.ToString(),
            new Dictionary<string, string?> { ["code"] = unit.Code, ["level"] = level.ToString() },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result<OrganizationalUnit>.Success(unit);
    }

    /// <summary>Renames a node of the organizational tree.</summary>
    public async Task<Result> RenameUnitAsync(
        OrganizationalUnitLevel level,
        Guid unitId,
        string name,
        string? legalName,
        CancellationToken cancellationToken = default)
    {
        var resolved = await LoadUnitAsync(level, unitId, cancellationToken).ConfigureAwait(false);
        if (resolved.IsFailure)
        {
            return Result.Failure(resolved.FirstError);
        }

        var unit = resolved.Value;
        var renamed = unit.Rename(name, legalName);
        if (renamed.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                TenantAuditActions.UnitRename, ResourceTypes.OrganizationalUnit, unitId.ToString(), renamed, cancellationToken: cancellationToken)
                .ConfigureAwait(false);
        }

        await _audit.RecordSuccessAsync(
            TenantAuditActions.UnitRename, ResourceTypes.OrganizationalUnit, unitId.ToString(), cancellationToken: cancellationToken)
            .ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }

    /// <summary>Activates a node of the organizational tree.</summary>
    public async Task<Result> ActivateUnitAsync(OrganizationalUnitLevel level, Guid unitId, CancellationToken cancellationToken = default)
    {
        var resolved = await LoadUnitAsync(level, unitId, cancellationToken).ConfigureAwait(false);
        if (resolved.IsFailure)
        {
            return Result.Failure(resolved.FirstError);
        }

        var unit = resolved.Value;
        var previous = unit.Status;
        var activated = unit.Activate(_audit.ActorId, _clock.UtcNow);
        if (activated.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                TenantAuditActions.Activate, ResourceTypes.OrganizationalUnit, unitId.ToString(), activated, cancellationToken: cancellationToken)
                .ConfigureAwait(false);
        }

        unit.RaiseDomainEvent(new OrganizationalUnitStatusChanged(
            Guid.NewGuid(), _clock.UtcNow, unit.Id, unit.Scope, unit.Code, previous, unit.Status, null));

        await _audit.RecordSuccessAsync(TenantAuditActions.Activate, ResourceTypes.OrganizationalUnit, unitId.ToString(), cancellationToken: cancellationToken)
            .ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }

    /// <summary>Suspends a node of the organizational tree, with a mandatory reason.</summary>
    public async Task<Result> SuspendUnitAsync(
        OrganizationalUnitLevel level,
        Guid unitId,
        string reason,
        CancellationToken cancellationToken = default)
    {
        var resolved = await LoadUnitAsync(level, unitId, cancellationToken).ConfigureAwait(false);
        if (resolved.IsFailure)
        {
            return Result.Failure(resolved.FirstError);
        }

        var unit = resolved.Value;
        var previous = unit.Status;
        var suspended = unit.Suspend(reason, _audit.ActorId, _clock.UtcNow);
        if (suspended.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                TenantAuditActions.Suspend, ResourceTypes.OrganizationalUnit, unitId.ToString(), suspended, cancellationToken: cancellationToken)
                .ConfigureAwait(false);
        }

        unit.RaiseDomainEvent(new OrganizationalUnitStatusChanged(
            Guid.NewGuid(), _clock.UtcNow, unit.Id, unit.Scope, unit.Code, previous, unit.Status, reason));

        await _audit.RecordSuccessAsync(
            TenantAuditActions.Suspend,
            ResourceTypes.OrganizationalUnit,
            unitId.ToString(),
            new Dictionary<string, string?> { ["reason"] = reason.Trim() },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }

    private async Task<Result<OrganizationDomain.Organization>> LoadTenantAsync(CancellationToken cancellationToken)
    {
        var scope = _audit.Scope;
        if (scope.IsEmpty)
        {
            return Result<OrganizationDomain.Organization>.Failure(TenantProvisioningErrors.OutsideTenant);
        }

        var organization = await _organizations.GetByIdAsync(scope.OrganizationId, cancellationToken).ConfigureAwait(false);
        return organization is null
            ? Result<OrganizationDomain.Organization>.Failure(TenantProvisioningErrors.NotFound(scope.OrganizationId.ToString()))
            : Result<OrganizationDomain.Organization>.Success(organization);
    }

    private async Task<Result<OrganizationalUnit>> LoadUnitAsync(
        OrganizationalUnitLevel level,
        Guid unitId,
        CancellationToken cancellationToken)
    {
        OrganizationalUnit? unit = level switch
        {
            OrganizationalUnitLevel.Organization => await _organizations.GetByIdAsync(unitId, cancellationToken).ConfigureAwait(false),
            OrganizationalUnitLevel.Company => await _companies.GetByIdAsync(unitId, cancellationToken).ConfigureAwait(false),
            OrganizationalUnitLevel.Brand => await _brands.GetByIdAsync(unitId, cancellationToken).ConfigureAwait(false),
            OrganizationalUnitLevel.Branch => await _branches.GetByIdAsync(unitId, cancellationToken).ConfigureAwait(false),
            OrganizationalUnitLevel.Store => await _stores.GetByIdAsync(unitId, cancellationToken).ConfigureAwait(false),
            _ => null
        };

        return unit is null
            ? Result<OrganizationalUnit>.Failure(OrganizationErrors.NotFound(unitId.ToString()))
            : Result<OrganizationalUnit>.Success(unit);
    }

    /// <summary>
    /// Derives the scope a new node must be created under. A missing parent level is a caller error rather
    /// than an implicit root, because a company created directly under the organization would sit outside
    /// the hierarchy every later read assumes.
    /// </summary>
    private static TenantScope? ResolveParentScope(OrganizationalUnitLevel level, TenantScope scope) => level switch
    {
        OrganizationalUnitLevel.Company => scope,
        OrganizationalUnitLevel.Brand => scope.CompanyId is null ? null : scope with { BrandId = null, BranchId = null, StoreId = null },
        OrganizationalUnitLevel.Branch => scope.CompanyId is null || scope.BrandId is null
            ? null
            : scope with { BranchId = null, StoreId = null },
        OrganizationalUnitLevel.Store => scope.CompanyId is null || scope.BrandId is null || scope.BranchId is null
            ? null
            : scope with { StoreId = null },
        _ => null
    };

    private void Track(OrganizationalUnit unit)
    {
        switch (unit)
        {
            case Company company:
                _companies.Add(company);
                break;
            case Brand brand:
                _brands.Add(brand);
                break;
            case Branch branch:
                _branches.Add(branch);
                break;
            case Store store:
                _stores.Add(store);
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(unit), unit.GetType().Name, "Unsupported organizational level.");
        }
    }
}
