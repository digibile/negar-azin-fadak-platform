using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using NegarAzinFadak.Infrastructure.Persistence;

namespace NegarAzinFadak.Migrations.Sqlite;

/// <summary>
/// Lets <c>dotnet ef</c> build the context for design-time commands against SQLite.
/// </summary>
/// <remarks>
/// The connection string below is a design-time placeholder. It is never used to reach a database:
/// <c>migrations add</c> only needs the provider to shape the generated SQL, and it opens no connection.
/// A real connection string arrives from configuration at run time, never from this file.
/// </remarks>
internal sealed class SqliteDesignTimeDbContextFactory : IDesignTimeDbContextFactory<NegarAzinFadakDbContext>
{
    /// <summary>Placeholder file name; the file is not created by design-time commands.</summary>
    internal const string DesignTimeConnectionString = "Data Source=negar-design-time.db";

    /// <summary>
    /// Migrations are declared into this assembly rather than the one holding the context. AGENTS.md
    /// requires a migration set per provider, and two sets for one context cannot coexist in a single
    /// assembly: EF would find two migration histories for the same context and refuse to choose.
    /// </summary>
    internal const string MigrationsAssembly = "NegarAzinFadak.Migrations.Sqlite";

    /// <inheritdoc />
    public NegarAzinFadakDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<NegarAzinFadakDbContext>()
            .UseSqlite(
                DesignTimeConnectionString,
                builder => builder.MigrationsAssembly(MigrationsAssembly))
            .Options;

        return new NegarAzinFadakDbContext(options);
    }
}
