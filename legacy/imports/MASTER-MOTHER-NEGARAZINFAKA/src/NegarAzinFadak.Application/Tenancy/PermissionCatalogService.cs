using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NegarAzinFadak.Application.Auditing;
using NegarAzinFadak.Application.Options;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Persistence;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Organization.Domain.Roles;

namespace NegarAzinFadak.Application.Tenancy;

/// <summary>What publishing the permission catalog produced.</summary>
/// <param name="Added">Catalog entries created by this run.</param>
/// <param name="Total">Entries in the catalog after publishing.</param>
public sealed record PermissionCatalogPublication(int Added, int Total);

/// <summary>
/// Publishes the permission catalog declared in configuration into the database.
/// </summary>
/// <remarks>
/// <para>
/// The catalog is the mechanism that makes permissions data. Endpoints name a code, the token carries a
/// code, and the role rows grant a code; the only question this use case answers is which codes exist and
/// whether they may still be granted. It reconciles rather than replaces, because a permission that
/// disappeared from configuration may still be held by a live role, and deleting the catalog row would
/// turn a readable "withdrawn capability" into an unexplained denial.
/// </para>
/// <para>
/// It is idempotent. Reconciliation runs at startup and on demand, so running it twice must converge on
/// the same catalog rather than duplicating it.
/// </para>
/// </remarks>
public sealed class PermissionCatalogService
{
    private readonly IPermissionCatalog _catalog;
    private readonly IPermissionCatalogWriter _writer;
    private readonly IUnitOfWork _unitOfWork;
    private readonly AuditTrailWriter _audit;
    private readonly PlatformAuthorizationOptions _options;
    private readonly ILogger<PermissionCatalogService> _logger;

    public PermissionCatalogService(
        IPermissionCatalog catalog,
        IPermissionCatalogWriter writer,
        IUnitOfWork unitOfWork,
        AuditTrailWriter audit,
        IOptions<PlatformAuthorizationOptions> options,
        ILogger<PermissionCatalogService> logger)
    {
        _catalog = Guard.AgainstNull(catalog);
        _writer = Guard.AgainstNull(writer);
        _unitOfWork = Guard.AgainstNull(unitOfWork);
        _audit = Guard.AgainstNull(audit);
        _options = Guard.AgainstNull(options).Value;
        _logger = Guard.AgainstNull(logger);
    }

    /// <summary>Reconciles the database catalog with the configured declarations.</summary>
    public async Task<Result<PermissionCatalogPublication>> PublishAsync(CancellationToken cancellationToken = default)
    {
        var declared = _options.Permissions;
        if (declared.Count is 0)
        {
            _logger.LogWarning(
                "No permissions are declared in the '{Section}' section. The catalog stays empty and every permission check fails closed until it is populated.",
                PlatformAuthorizationOptions.SectionName);

            return Result<PermissionCatalogPublication>.Success(new PermissionCatalogPublication(0, 0));
        }

        var invalid = declared
            .Where(permission => string.IsNullOrWhiteSpace(permission.Code))
            .Select(_ => "A declared permission has no code.")
            .Concat(_options.Validate())
            .ToArray();

        if (invalid.Length > 0)
        {
            // A malformed declaration is a deployment fault, not a tenant error. It is reported rather
            // than partially applied, because half a catalog is harder to diagnose than none.
            return Result<PermissionCatalogPublication>.Failure(
                Error.Validation(
                    "tenant.permission_catalog.invalid",
                    string.Join(" ", invalid)));
        }

        var existing = await _catalog.ListAllAsync(cancellationToken).ConfigureAwait(false);
        var byCode = existing.ToDictionary(permission => permission.Code, StringComparer.Ordinal);
        var added = 0;

        foreach (var definition in declared)
        {
            var code = definition.Code.Trim().ToLowerInvariant();
            if (byCode.TryGetValue(code, out var permission))
            {
                if (!permission.IsActive)
                {
                    // A permission that reappears in configuration is reactivated, so withdrawing a code
                    // from configuration and putting it back is a deliberate, reversible act.
                    permission.SetActive(true);
                    _writer.Update(permission);
                }

                continue;
            }

            added++;
            var created = new Permission(definition.Code, definition.Category, definition.Title, definition.Description);
            _writer.Add(created);
        }

        await _audit.RecordSuccessAsync(
            TenantAuditActions.CatalogPublish,
            ResourceTypes.Permission,
            "catalog",
            new Dictionary<string, string?>
            {
                ["added"] = added.ToString(System.Globalization.CultureInfo.InvariantCulture),
                ["total"] = (existing.Count + added).ToString(System.Globalization.CultureInfo.InvariantCulture)
            },
            cancellationToken).ConfigureAwait(false);

        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        _logger.LogInformation(
            "Permission catalog reconciled: {Added} added, {Total} total.",
            added,
            existing.Count + added);

        return Result<PermissionCatalogPublication>.Success(
            new PermissionCatalogPublication(added, existing.Count + added));
    }
}
