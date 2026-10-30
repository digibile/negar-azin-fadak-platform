using Microsoft.Extensions.Logging;
using NegarAzinFadak.Application.Auditing;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Persistence;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Organization.Domain.Configuration;
using NegarAzinFadak.Organization.Domain.Events;

namespace NegarAzinFadak.Application.Tenancy;

/// <summary>
/// Reads and writes the tenant's configuration document on behalf of the API and of other modules.
/// </summary>
/// <remarks>
/// <para>
/// The document is created lazily. A tenant that has been provisioned but has never changed a setting has
/// no configuration row, and forcing one would make "unset" unrepresentable — which is the opposite of
/// what this module is for. A missing document reads as "no settings defined", and the caller applies its
/// own fallback, because a fallback baked into the platform is a hard-coded business value wearing a
/// configuration coat.
/// </para>
/// <para>
/// Every write publishes the change to the outbox, so a module caching configuration can invalidate
/// without polling the database.
/// </para>
/// </remarks>
public sealed class TenantConfigurationService
{
    private readonly IRepository<TenantConfiguration> _configurations;
    private readonly ITenantConfigurationDirectory _directory;
    private readonly IUnitOfWork _unitOfWork;
    private readonly AuditTrailWriter _audit;
    private readonly IClock _clock;
    private readonly ILogger<TenantConfigurationService> _logger;

    public TenantConfigurationService(
        IRepository<TenantConfiguration> configurations,
        ITenantConfigurationDirectory directory,
        IUnitOfWork unitOfWork,
        AuditTrailWriter audit,
        IClock clock,
        ILogger<TenantConfigurationService> logger)
    {
        _configurations = Guard.AgainstNull(configurations);
        _directory = Guard.AgainstNull(directory);
        _unitOfWork = Guard.AgainstNull(unitOfWork);
        _audit = Guard.AgainstNull(audit);
        _clock = Guard.AgainstNull(clock);
        _logger = Guard.AgainstNull(logger);
    }

    /// <summary>Current settings of the caller's tenant, with sensitive values already masked.</summary>
    public async Task<Result<IReadOnlyList<TenantSettingView>>> DescribeAsync(CancellationToken cancellationToken = default)
    {
        var configuration = await FindAsync(cancellationToken).ConfigureAwait(false);
        return configuration is null
            ? Result<IReadOnlyList<TenantSettingView>>.Success([])
            : Result<IReadOnlyList<TenantSettingView>>.Success(configuration.Describe());
    }

    /// <summary>Creates or replaces one setting of the caller's tenant.</summary>
    public async Task<Result> SetAsync(
        string code,
        string? value,
        TenantSettingKind kind,
        bool isSensitive,
        NumericRange range,
        CancellationToken cancellationToken = default)
    {
        var scope = _audit.Scope;
        if (scope.IsEmpty)
        {
            return Result.Failure(TenantConfigurationErrors.OutsideTenant);
        }

        var existing = await FindAsync(cancellationToken).ConfigureAwait(false);
        var configuration = existing ?? TenantConfiguration.ForTenant(Guid.NewGuid(), scope);

        var applied = configuration.Set(code, value, kind, isSensitive, range);
        if (applied.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                TenantAuditActions.SettingSet, ResourceTypes.TenantSetting, code ?? string.Empty, applied, cancellationToken: cancellationToken)
                .ConfigureAwait(false);
        }

        if (existing is null)
        {
            _configurations.Add(configuration);
        }

        var now = _clock.UtcNow;
        var written = configuration.Setting(code)
            ?? throw new InvalidOperationException($"Setting '{code}' was applied but could not be read back.");
        var normalizedCode = written.Code;

        configuration.RaiseDomainEvent(new TenantSettingPublished(
            Guid.NewGuid(), now, scope, normalizedCode, written.Kind, written.DisplayValue, written.IsSensitive));
        configuration.RaiseDomainEvent(new TenantSettingChangedIntegration(
            Guid.NewGuid(), now, scope, configuration.Id, normalizedCode));

        // Staged before the save so the record and the value it describes commit together; a setting that
        // exists without its audit line, or an audit line for a setting that was rolled back, would both be
        // answers to "when did this change" that are wrong.
        await _audit.RecordSuccessAsync(
            TenantAuditActions.SettingSet,
            ResourceTypes.TenantSetting,
            normalizedCode,
            new Dictionary<string, string?>
            {
                ["kind"] = written.Kind.ToString(),
                ["sensitive"] = written.IsSensitive ? "true" : "false"
            },
            cancellationToken).ConfigureAwait(false);

        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        _logger.LogInformation(
            "Tenant {OrganizationId} setting {SettingCode} written as {SettingKind}.",
            scope.OrganizationId,
            normalizedCode,
            written.Kind);

        return Result.Success();
    }

    /// <summary>Removes a setting so the code falls back to the caller's own default.</summary>
    public async Task<Result> RemoveAsync(string code, CancellationToken cancellationToken = default)
    {
        var configuration = await FindAsync(cancellationToken).ConfigureAwait(false);
        if (configuration is null)
        {
            return Result.Failure(TenantConfigurationErrors.NotFound());
        }

        var removed = configuration.Remove(code);
        if (removed.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                TenantAuditActions.SettingRemove, ResourceTypes.TenantSetting, code ?? string.Empty, removed, cancellationToken: cancellationToken)
                .ConfigureAwait(false);
        }

        var normalizedCode = code.Trim().ToLowerInvariant();
        configuration.RaiseDomainEvent(new TenantSettingChangedIntegration(
            Guid.NewGuid(), _clock.UtcNow, configuration.Scope, configuration.Id, normalizedCode));

        await _audit.RecordSuccessAsync(
            TenantAuditActions.SettingRemove, ResourceTypes.TenantSetting, normalizedCode, cancellationToken: cancellationToken)
            .ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }

    /// <summary>
    /// Reads a setting for internal use by another module, loading the document once per operation.
    /// </summary>
    /// <remarks>
    /// Exposed as a service rather than as a static helper so a module never builds a
    /// <see cref="TenantConfiguration"/> itself, and therefore never reads another tenant's document by
    /// accident.
    /// </remarks>
    public async Task<Result<TenantConfiguration>> RequireAsync(CancellationToken cancellationToken = default)
    {
        var scope = _audit.Scope;
        if (scope.IsEmpty)
        {
            return Result<TenantConfiguration>.Failure(TenantConfigurationErrors.OutsideTenant);
        }

        var configuration = await FindAsync(cancellationToken).ConfigureAwait(false);
        return configuration is null
            ? Result<TenantConfiguration>.Failure(TenantConfigurationErrors.NotFound())
            : Result<TenantConfiguration>.Success(configuration);
    }

    private Task<TenantConfiguration?> FindAsync(CancellationToken cancellationToken)
    {
        var scope = _audit.Scope;
        return scope.IsEmpty
            ? Task.FromResult<TenantConfiguration?>(null)
            : _directory.FindAsync(scope, cancellationToken);
    }
}
