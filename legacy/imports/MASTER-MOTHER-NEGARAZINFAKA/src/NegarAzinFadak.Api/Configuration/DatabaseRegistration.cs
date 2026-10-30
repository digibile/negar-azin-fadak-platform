using Microsoft.EntityFrameworkCore;
using NegarAzinFadak.Core;

namespace NegarAzinFadak.Api.Configuration;

/// <summary>Applies the configured provider to a <see cref="DbContextOptionsBuilder"/>.</summary>
/// <remarks>
/// One implementation shared by the running host and the design-time factory. Provider selection living
/// in two places is how a design-time migration ends up generated against a different provider than the
/// one that runs, which is precisely the defect the second migration assembly now prevents.
/// </remarks>
public static class DatabaseRegistration
{
    /// <summary>Migrations assembly holding the SQLite migration set.</summary>
    public const string SqliteMigrationsAssembly = "NegarAzinFadak.Migrations.Sqlite";

    /// <summary>Migrations assembly holding the PostgreSQL migration set.</summary>
    public const string PostgreSqlMigrationsAssembly = "NegarAzinFadak.Migrations.PostgreSQL";

    /// <summary>Configures <paramref name="builder"/> for the selected provider and migration set.</summary>
    /// <exception cref="InvalidOperationException">
    /// The provider is unknown, or no connection string was configured. Both are deployment faults and
    /// must surface at startup rather than on the first request.
    /// </exception>
    public static void Configure(DbContextOptionsBuilder builder, DatabaseOptions options)
    {
        ArgumentNullException.ThrowIfNull(builder);
        var settings = Guard.AgainstNull(options);

        var connectionString = settings.ConnectionString;
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                $"'{DatabaseOptions.SectionName}:{nameof(DatabaseOptions.ConnectionString)}' is not configured. "
                + "Supply it through user-secrets or the environment; it is never committed.");
        }

        switch (settings.Provider)
        {
            case DatabaseProvider.Sqlite:
                builder.UseSqlite(
                    connectionString,
                    sqlite => sqlite
                        .MigrationsAssembly(SqliteMigrationsAssembly)
                        .CommandTimeout(settings.CommandTimeoutSeconds));
                break;

            case DatabaseProvider.PostgreSql:
                builder.UseNpgsql(
                    connectionString,
                    npgsql => npgsql
                        .MigrationsAssembly(PostgreSqlMigrationsAssembly)
                        .CommandTimeout(settings.CommandTimeoutSeconds));
                break;

            default:
                throw new InvalidOperationException(
                    $"Unsupported database provider '{settings.Provider}'.");
        }
    }
}
