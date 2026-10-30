using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NegarAzinFadak.Application.Auditing;
using NegarAzinFadak.Application.Navigation;
using NegarAzinFadak.Application.Options;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Persistence;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Organization.Domain;
using NegarAzinFadak.Organization.Domain.Configuration;
using NegarAzinFadak.Organization.Domain.Events;
using OrganizationDomain = NegarAzinFadak.Organization.Domain;
using NegarAzinFadak.Organization.Domain.Roles;

namespace NegarAzinFadak.Application.Tenancy;

/// <summary>What a caller supplies to create a tenant.</summary>
/// <param name="Code">Short unique tenant code, used in URLs, imports and external references.</param>
/// <param name="Name">Display name.</param>
/// <param name="LegalName">Legal name for contracts; defaults to <paramref name="Name"/>.</param>
/// <param name="CurrencyCode">ISO 4217 code of the tenant's default currency.</param>
/// <param name="EconomicCode">Economic identification code, when the tenant is a legal entity.</param>
/// <param name="NationalRegistrationNumber">National registration number, when the tenant is a legal entity.</param>
public sealed record ProvisionTenantCommand(
    string Code,
    string Name,
    string? LegalName,
    string CurrencyCode,
    string? EconomicCode,
    string? NationalRegistrationNumber);

/// <summary>What provisioning produced, for the caller to report back.</summary>
/// <param name="Scope">Coordinates of the new tenant.</param>
/// <param name="ConfigurationId">Identifier of the tenant's configuration document.</param>
/// <param name="RoleIds">Identifiers of the roles minted from the configured templates.</param>
/// <param name="IsActive">True when the tenant was activated as part of provisioning.</param>
public sealed record ProvisionedTenant(
    TenantScope Scope,
    Guid ConfigurationId,
    IReadOnlyList<Guid> RoleIds,
    bool IsActive);

/// <summary>
/// Creates a tenant: the organization, its configuration document, and the roles it starts with.
/// </summary>
/// <remarks>
/// <para>
/// Provisioning is one transaction. A tenant with a configuration document but no administrator role, or
/// with an administrator role and no configuration, is a tenant that cannot be used and cannot be
/// diagnosed from the data — so the whole thing commits or none of it does.
/// </para>
/// <para>
/// What the tenant starts with comes from configuration: role templates in
/// <see cref="PlatformAuthorizationOptions"/>, setting templates in
/// <see cref="TenantProvisioningOptions"/> and the base navigation structure in
/// <see cref="MenuOptions"/>. This use case contains no role code, no percentage, no threshold and no menu
/// section of its own, which is what makes "no hard-coded business values" a property of the code rather
/// than a convention.
/// </para>
/// <para>
/// Templates are fully validated before anything is attached to the unit of work. A half-applied
/// template would otherwise stay in the change tracker and could be committed by an unrelated save later
/// in the same request.
/// </para>
/// </remarks>
public sealed class TenantProvisioningService
{
    private readonly IRepository<OrganizationDomain.Organization> _organizations;
    private readonly IRepository<TenantConfiguration> _configurations;
    private readonly IRepository<Role> _roles;
    private readonly IPermissionCatalog _permissionCatalog;
    private readonly MenuStructureService _menuStructure;
    private readonly IUnitOfWork _unitOfWork;
    private readonly AuditTrailWriter _audit;
    private readonly IClock _clock;
    private readonly TenantProvisioningOptions _provisioning;
    private readonly PlatformAuthorizationOptions _authorization;
    private readonly ILogger<TenantProvisioningService> _logger;

    public TenantProvisioningService(
        IRepository<OrganizationDomain.Organization> organizations,
        IRepository<TenantConfiguration> configurations,
        IRepository<Role> roles,
        IPermissionCatalog permissionCatalog,
        MenuStructureService menuStructure,
        IUnitOfWork unitOfWork,
        AuditTrailWriter audit,
        IClock clock,
        IOptions<TenantProvisioningOptions> provisioning,
        IOptions<PlatformAuthorizationOptions> authorization,
        ILogger<TenantProvisioningService> logger)
    {
        _organizations = Guard.AgainstNull(organizations);
        _configurations = Guard.AgainstNull(configurations);
        _roles = Guard.AgainstNull(roles);
        _permissionCatalog = Guard.AgainstNull(permissionCatalog);
        _menuStructure = Guard.AgainstNull(menuStructure);
        _unitOfWork = Guard.AgainstNull(unitOfWork);
        _audit = Guard.AgainstNull(audit);
        _clock = Guard.AgainstNull(clock);
        _provisioning = Guard.AgainstNull(provisioning).Value;
        _authorization = Guard.AgainstNull(authorization).Value;
        _logger = Guard.AgainstNull(logger);
    }

    /// <summary>Provisions a new tenant from the configured templates.</summary>
    public async Task<Result<ProvisionedTenant>> ProvisionAsync(
        ProvisionTenantCommand command,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(command);

        var validated = Validate(command);
        if (validated.IsFailure)
        {
            return await DeniedAsync(command.Code ?? string.Empty, Result.Failure(validated.FirstError), cancellationToken).ConfigureAwait(false);
        }

        var input = validated.Value;
        var now = _clock.UtcNow;
        var scope = new TenantScope(Guid.NewGuid());

        // Everything is built and validated before it is attached, so a rejected template cannot leave a
        // partially applied tenant in the change tracker for an unrelated save to commit.
        var organization = new OrganizationDomain.Organization(scope.OrganizationId, input.Code, input.Name, input.LegalName);

        var currency = organization.SetDefaultCurrency(input.CurrencyCode);
        if (currency.IsFailure)
        {
            return await DeniedAsync(input.Code, currency, cancellationToken).ConfigureAwait(false);
        }

        organization.SetLegalIdentifiers(input.EconomicCode, input.NationalRegistrationNumber);

        var configuration = TenantConfiguration.ForTenant(Guid.NewGuid(), scope);
        var settingsApplied = ApplySettingTemplates(configuration);
        if (settingsApplied.IsFailure)
        {
            return await DeniedAsync(input.Code, settingsApplied, cancellationToken).ConfigureAwait(false);
        }

        var activePermissionCodes = await _permissionCatalog
            .ListActiveCodesAsync(cancellationToken).ConfigureAwait(false);

        var roles = BuildRoles(scope, activePermissionCodes, now);
        if (roles.IsFailure)
        {
            return await DeniedAsync(input.Code, Result.Failure(roles.FirstError), cancellationToken).ConfigureAwait(false);
        }

        // Before anything is attached, for the same reason the roles are: a base structure that cannot be
        // installed must refuse the tenant outright rather than leave a menu staged for an organization that
        // was never committed.
        var menu = await _menuStructure.InstallAsync(scope, cancellationToken).ConfigureAwait(false);
        if (menu.IsFailure)
        {
            return await DeniedAsync(input.Code, Result.Failure(menu.FirstError), cancellationToken).ConfigureAwait(false);
        }

        var isActive = false;
        if (_provisioning.ActivateOnProvisioning)
        {
            var activation = organization.Activate(_audit.ActorId, now, "activated by provisioning");
            if (activation.IsFailure)
            {
                return await DeniedAsync(input.Code, activation, cancellationToken).ConfigureAwait(false);
            }

            isActive = true;
        }

        var provisioned = new ProvisionedTenant(
            scope,
            configuration.Id,
            roles.Value.Select(role => role.Id).ToArray().AsReadOnly(),
            isActive);

        _organizations.Add(organization);
        _configurations.Add(configuration);
        foreach (var role in roles.Value)
        {
            _roles.Add(role);
        }

        organization.RaiseDomainEvent(new OrganizationRegistered(
            Guid.NewGuid(), now, organization.Id, scope, organization.Code, organization.Name));

        if (isActive)
        {
            organization.RaiseDomainEvent(new TenantActivatedIntegration(
                Guid.NewGuid(), now, scope, organization.Id, organization.Code));
        }

        foreach (var setting in configuration.Settings)
        {
            configuration.RaiseDomainEvent(new TenantSettingPublished(
                Guid.NewGuid(),
                now,
                scope,
                setting.Code,
                setting.Kind,
                setting.DisplayValue,
                setting.IsSensitive));
        }

        // Staged before the save so the record of provisioning and the provisioning itself commit together:
        // a tenant that exists without its audit line is a tenant nobody can account for.
        await _audit.RecordSuccessAsync(
            TenantAuditActions.Provision,
            ResourceTypes.Organization,
            organization.Id.ToString(),
            new Dictionary<string, string?>
            {
                ["code"] = organization.Code,
                ["roleCount"] = provisioned.RoleIds.Count.ToString(System.Globalization.CultureInfo.InvariantCulture),
                ["active"] = isActive ? "true" : "false",
                ["menuId"] = menu.Value.MenuId?.ToString(),
                ["menuSectionsAdded"] = menu.Value.SectionsAdded.ToString(System.Globalization.CultureInfo.InvariantCulture)
            },
            cancellationToken).ConfigureAwait(false);

        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        _logger.LogInformation(
            "Tenant {OrganizationCode} provisioned with {RoleCount} role(s), configuration {ConfigurationId} and {MenuSectionCount} base menu section(s).",
            organization.Code,
            provisioned.RoleIds.Count,
            configuration.Id,
            menu.Value.SectionsAdded);

        return Result<ProvisionedTenant>.Success(provisioned);
    }

    /// <summary>Records the refusal and returns it as the failure this use case reports.</summary>
    private async Task<Result<ProvisionedTenant>> DeniedAsync(
        string code,
        Result failure,
        CancellationToken cancellationToken)
    {
        await _audit.AuditDenialAsync(
            TenantAuditActions.Provision,
            ResourceTypes.Organization,
            code,
            failure,
            cancellationToken: cancellationToken).ConfigureAwait(false);

        return Result<ProvisionedTenant>.Failure(failure.Errors);
    }

    private static Result<ProvisionTenantCommand> Validate(ProvisionTenantCommand command)
    {
        if (string.IsNullOrWhiteSpace(command.Code) || command.Code.Trim().Length > 64)
        {
            return Result<ProvisionTenantCommand>.Failure(TenantProvisioningErrors.CodeInvalid);
        }

        if (string.IsNullOrWhiteSpace(command.Name) || command.Name.Trim().Length > 256)
        {
            return Result<ProvisionTenantCommand>.Failure(TenantProvisioningErrors.NameInvalid);
        }

        if (string.IsNullOrWhiteSpace(command.CurrencyCode))
        {
            return Result<ProvisionTenantCommand>.Failure(
                TenantProvisioningErrors.CurrencyInvalid(command.CurrencyCode ?? string.Empty));
        }

        return Result<ProvisionTenantCommand>.Success(command with
        {
            Code = command.Code.Trim(),
            Name = command.Name.Trim()
        });
    }

    private Result ApplySettingTemplates(TenantConfiguration configuration)
    {
        foreach (var template in _provisioning.Settings)
        {
            var applied = configuration.Set(
                template.Code,
                template.Value,
                template.Kind,
                template.IsSensitive,
                template.ToRange());

            if (applied.IsFailure)
            {
                return Result.Failure(TenantProvisioningErrors.ConfigurationTemplateInvalid(
                    template.Code,
                    applied.FirstError.Code));
            }
        }

        return Result.Success();
    }

    private Result<IReadOnlyList<Role>> BuildRoles(
        TenantScope scope,
        IReadOnlyCollection<string> activePermissionCodes,
        DateTimeOffset now)
    {
        var active = new HashSet<string>(activePermissionCodes, StringComparer.OrdinalIgnoreCase);
        var built = new List<Role>();

        foreach (var template in _authorization.RoleTemplates)
        {
            var role = template.IsBuiltIn
                ? Role.DefineBuiltIn(Guid.NewGuid(), scope, template.Code, template.Name, template.Description)
                : Role.Define(Guid.NewGuid(), scope, template.Code, template.Name, template.Description);

            foreach (var permissionCode in template.Permissions)
            {
                if (!active.Contains(permissionCode))
                {
                    // Reported rather than skipped: a role silently missing a permission looks correct and
                    // denies the tenant's own administrator the capability they need in order to fix it.
                    return Result<IReadOnlyList<Role>>.Failure(
                        TenantProvisioningErrors.RoleTemplatePermissionUnknown(template.Code, permissionCode));
                }

                var granted = role.Grant(permissionCode, now);
                if (granted.IsFailure)
                {
                    return Result<IReadOnlyList<Role>>.Failure(granted.FirstError);
                }

                role.RaiseDomainEvent(new RolePermissionsChanged(
                    Guid.NewGuid(), now, role.Id, scope, role.Code, permissionCode.Trim().ToLowerInvariant()));
            }

            role.RaiseDomainEvent(new RoleChangedIntegration(Guid.NewGuid(), now, scope, role.Id, role.Code));
            built.Add(role);
        }

        return Result<IReadOnlyList<Role>>.Success(built.AsReadOnly());
    }
}
