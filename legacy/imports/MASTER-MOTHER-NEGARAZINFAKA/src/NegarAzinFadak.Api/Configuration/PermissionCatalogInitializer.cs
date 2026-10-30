using Microsoft.Extensions.Options;
using NegarAzinFadak.Application.Options;
using NegarAzinFadak.Application.Tenancy;

namespace NegarAzinFadak.Api.Configuration;

/// <summary>
/// Publishes the configured permission catalog at startup, and the controlled settings a deployment may
/// change without a new release.
/// </summary>
/// <remarks>
/// <para>
/// The catalog is reconciled on every start rather than seeded once. A deployment that adds a permission in
/// configuration must be able to roll that out by restarting, without a migration and without an
/// administrator remembering to press a button — and reconciliation is idempotent, so a restart loop
/// converges instead of accumulating duplicates.
/// </para>
/// <para>
/// A rejected declaration stops the host. The alternative — starting with an empty or partial catalog — is
/// worse, because every permission check then fails closed and the symptom appears as a mysterious 403 in
/// an application that was healthy a minute ago. Failing at startup names the deployment as the cause.
/// </para>
/// <para>
/// It runs after <see cref="DatabaseInitializer"/> because the catalog needs its table; hosted services
/// start in registration order, and the order is asserted by the registration next to it.
/// </para>
/// </remarks>
internal sealed class PermissionCatalogInitializer(
    IServiceScopeFactory scopeFactory,
    IOptions<PlatformAuthorizationOptions> options,
    ILogger<PermissionCatalogInitializer> logger) : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
    private readonly PlatformAuthorizationOptions _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
    private readonly ILogger<PermissionCatalogInitializer> _logger = logger ?? throw new ArgumentNullException(nameof(logger));

    /// <inheritdoc />
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (_options.Permissions.Count is 0)
        {
            _logger.LogWarning(
                "The '{Section}' section declares no permissions. The catalog stays empty and every permission check will fail closed.",
                PlatformAuthorizationOptions.SectionName);
            return;
        }

        await using var scope = _scopeFactory.CreateAsyncScope();
        var publisher = scope.ServiceProvider.GetRequiredService<PermissionCatalogService>();

        var published = await publisher.PublishAsync(cancellationToken).ConfigureAwait(false);
        if (published.IsFailure)
        {
            throw new InvalidOperationException(
                $"The '{PlatformAuthorizationOptions.SectionName}' section is invalid: {published.FirstError.Description}");
        }

        _logger.LogInformation(
            "Permission catalog published: {Added} added, {Total} active entries.",
            published.Value.Added,
            published.Value.Total);
    }

    /// <inheritdoc />
    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
