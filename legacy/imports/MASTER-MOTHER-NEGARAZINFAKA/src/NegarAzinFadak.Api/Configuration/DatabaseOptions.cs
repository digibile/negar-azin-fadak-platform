using System.ComponentModel.DataAnnotations;

namespace NegarAzinFadak.Api.Configuration;

/// <summary>EF Core provider backing the running host.</summary>
public enum DatabaseProvider
{
    /// <summary>SQLite. Used for local development and integration tests.</summary>
    Sqlite = 0,

    /// <summary>PostgreSQL. Used in production and in any shared environment.</summary>
    PostgreSql = 1
}

/// <summary>
/// Provider selection and connection settings, read from the <c>Database</c> section.
/// </summary>
/// <remarks>
/// The provider is chosen here and nowhere else, so local development and production differ by
/// configuration alone. The connection string is deliberately not defaulted: a missing value must fail
/// at startup rather than silently point a "production" host at a local file or a local container.
/// </remarks>
public sealed class DatabaseOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "Database";

    /// <summary>Provider to run against.</summary>
    [Required]
    public DatabaseProvider Provider { get; set; } = DatabaseProvider.Sqlite;

    /// <summary>
    /// Provider connection string. Supplied through user-secrets or the environment; never committed.
    /// </summary>
    [Required(AllowEmptyStrings = false)]
    public string? ConnectionString { get; set; }

    /// <summary>
    /// Applies pending migrations during startup. Convenient in Development, and off by default
    /// elsewhere so that schema changes stay an explicit, reviewable deployment step.
    /// </summary>
    public bool MigrateOnStartup { get; set; }

    /// <summary>Command timeout in seconds, applied to every query.</summary>
    [Range(1, 600)]
    public int CommandTimeoutSeconds { get; set; } = 30;
}
