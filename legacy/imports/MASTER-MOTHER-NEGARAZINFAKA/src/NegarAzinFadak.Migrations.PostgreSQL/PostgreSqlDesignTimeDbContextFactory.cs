using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using NegarAzinFadak.Infrastructure.Persistence;

namespace NegarAzinFadak.Migrations.PostgreSQL;

/// <summary>
/// Lets <c>dotnet ef</c> build the context for design-time commands against PostgreSQL.
/// </summary>
/// <remarks>
/// The connection string below is a design-time placeholder and deliberately carries no credential.
/// It is never used to reach a database: <c>migrations add</c> only needs the provider to shape the
/// generated SQL, and it opens no connection. A real connection string arrives from configuration or a
/// secret store at run time, never from this file.
/// </remarks>
internal sealed class PostgreSqlDesignTimeDbContextFactory : IDesignTimeDbContextFactory<NegarAzinFadakDbContext>
{
    /// <summary>
    /// Placeholder endpoint; no password is present, and design-time commands never connect.
    /// </summary>
    internal const string DesignTimeConnectionString =
        "Host=localhost;Port=5432;Database=negar_design_time;Username=design_time_placeholder";

    /// <summary>
    /// Migrations are declared into this assembly rather than the one holding the context. AGENTS.md
    /// requires a migration set per provider, and two sets for one context cannot coexist in a single
    /// assembly: EF would find two migration histories for the same context and refuse to choose.
    /// </summary>
    internal const string MigrationsAssembly = "NegarAzinFadak.Migrations.PostgreSQL";

    /// <inheritdoc />
    public NegarAzinFadakDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<NegarAzinFadakDbContext>()
            .UseNpgsql(
                DesignTimeConnectionString,
                builder => builder.MigrationsAssembly(MigrationsAssembly))
            .Options;

        return new NegarAzinFadakDbContext(options);
    }
}
