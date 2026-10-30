using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NegarAzinFadak.Api.Configuration;
using NegarAzinFadak.Infrastructure.Persistence;

namespace NegarAzinFadak.Api.Configuration;

/// <summary>
/// Applies pending migrations at startup when <see cref="DatabaseOptions.MigrateOnStartup"/> is set.
/// </summary>
/// <remarks>
/// Off by default so that a schema change stays an explicit, reviewable deployment step and several
/// replicas starting together cannot race to migrate a shared database. It exists because a developer
/// should be able to run <c>dotnet run</c> against an empty file and get a working schema without first
/// remembering the EF command.
/// </remarks>
internal sealed class DatabaseInitializer(
    IServiceScopeFactory scopeFactory,
    IOptions<DatabaseOptions> options,
    ILogger<DatabaseInitializer> logger) : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
    private readonly DatabaseOptions _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
    private readonly ILogger<DatabaseInitializer> _logger = logger ?? throw new ArgumentNullException(nameof(logger));

    /// <inheritdoc />
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!_options.MigrateOnStartup)
        {
            return;
        }

        await using var scope = _scopeFactory.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<NegarAzinFadakDbContext>();

        var pending = (await context.Database.GetPendingMigrationsAsync(cancellationToken)).ToArray();

        if (pending.Length is 0)
        {
            _logger.LogInformation("Database schema is up to date; no migration applied.");
            return;
        }

        _logger.LogInformation(
            "Applying {Count} pending migration(s): {Migrations}",
            pending.Length,
            string.Join(", ", pending));

        await context.Database.MigrateAsync(cancellationToken);

        _logger.LogInformation("Database migration completed.");
    }

    /// <inheritdoc />
    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
