using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using NegarAzinFadak.Core.Auditing;
using NegarAzinFadak.Core.Persistence;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Identity.Domain.Authentication;
using NegarAzinFadak.Identity.Domain.Documents;
using NegarAzinFadak.Identity.Domain.Users;
using Activities = NegarAzinFadak.Identity.Domain.Activities;
using Folders = NegarAzinFadak.Identity.Domain.Folders;
using Menus = NegarAzinFadak.Organization.Domain.Menus;
using OrganizationDomain = NegarAzinFadak.Organization.Domain;
using Roles = NegarAzinFadak.Organization.Domain.Roles;
using TenantConfigurationDocument = NegarAzinFadak.Organization.Domain.Configuration.TenantConfiguration;
using TenantSetting = NegarAzinFadak.Organization.Domain.Configuration.TenantSetting;

namespace NegarAzinFadak.Infrastructure.Persistence;

/// <summary>
/// Single database context for the modular monolith. One context keeps a single transaction across
/// modules — a registration, its document verification and the resulting downstream effects must commit
/// together — while each module still owns its own configuration classes.
/// </summary>
/// <remarks>
/// Tenant isolation is applied by convention: every entity that implements <see cref="ITenantScoped"/> is
/// filtered to the caller's organization, so a query can never reach another tenant's data even if a use
/// case forgets to add a predicate.
/// </remarks>
public sealed class NegarAzinFadakDbContext(
    DbContextOptions<NegarAzinFadakDbContext> options,
    ITenantContext? tenantContext = null,
    ICurrentUser? currentUser = null)
    : DbContext(options), IUnitOfWork
{
    private readonly ITenantContext _tenantContext = tenantContext ?? new TenantContext();
    private readonly ICurrentUser _currentUser = currentUser ?? CurrentUser.Anonymous;

    public DbSet<OrganizationDomain.Organization> Organizations => Set<OrganizationDomain.Organization>();

    public DbSet<OrganizationDomain.Company> Companies => Set<OrganizationDomain.Company>();

    public DbSet<OrganizationDomain.Brand> Brands => Set<OrganizationDomain.Brand>();

    public DbSet<OrganizationDomain.Branch> Branches => Set<OrganizationDomain.Branch>();

    public DbSet<OrganizationDomain.Store> Stores => Set<OrganizationDomain.Store>();

    public DbSet<Menus.Menu> Menus => Set<Menus.Menu>();

    public DbSet<Menus.MenuItem> MenuItems => Set<Menus.MenuItem>();

    public DbSet<Roles.Permission> Permissions => Set<Roles.Permission>();

    public DbSet<Roles.Role> Roles => Set<Roles.Role>();

    public DbSet<Roles.RolePermission> RolePermissions => Set<Roles.RolePermission>();

    public DbSet<TenantConfigurationDocument> TenantConfigurations => Set<TenantConfigurationDocument>();

    public DbSet<TenantSetting> TenantSettings => Set<TenantSetting>();

    public DbSet<AuditRecord> AuditRecords => Set<AuditRecord>();

    public DbSet<User> Users => Set<User>();

    public DbSet<UserRoleAssignment> UserRoleAssignments => Set<UserRoleAssignment>();

    public DbSet<UserContact> UserContacts => Set<UserContact>();

    public DbSet<UserAddress> UserAddresses => Set<UserAddress>();

    public DbSet<BankAccount> BankAccounts => Set<BankAccount>();

    public DbSet<UserProfileChangeRequest> UserProfileChangeRequests => Set<UserProfileChangeRequest>();

    public DbSet<DocumentType> DocumentTypes => Set<DocumentType>();

    public DbSet<IdentityDocument> IdentityDocuments => Set<IdentityDocument>();

    public DbSet<DocumentPage> DocumentPages => Set<DocumentPage>();

    public DbSet<DocumentExtraction> DocumentExtractions => Set<DocumentExtraction>();

    public DbSet<DocumentVerification> DocumentVerifications => Set<DocumentVerification>();

    public DbSet<Folders.DigitalFolder> DigitalFolders => Set<Folders.DigitalFolder>();

    public DbSet<Folders.DigitalDocument> DigitalDocuments => Set<Folders.DigitalDocument>();

    public DbSet<OtpChallenge> OtpChallenges => Set<OtpChallenge>();

    public DbSet<Activities.UserEvent> UserEvents => Set<Activities.UserEvent>();

    public DbSet<Activities.UserEventType> UserEventTypes => Set<Activities.UserEventType>();

    public DbSet<OutboxMessageEntity> OutboxMessages => Set<OutboxMessageEntity>();

    public DbSet<RateLimitCounterEntity> RateLimitCounters => Set<RateLimitCounterEntity>();

    /// <summary>Organizational coordinates of the current unit of work.</summary>
    public TenantScope Scope => _tenantContext.Scope;

    /// <summary>True when the ambient tenant scope has been resolved for the current request.</summary>
    public bool HasTenantScope => !Scope.IsEmpty;

    /// <summary>
    /// Organization of the current request, or <see cref="Guid.Empty"/> when running unscoped. Exposed as
    /// a flat member so the tenant filter can be expressed without reaching into <see cref="Scope"/>.
    /// </summary>
    public Guid CurrentOrganizationId => Scope.OrganizationId;

    /// <summary>
    /// Name of the indexed organization column that carries tenant isolation. It mirrors the organization
    /// of the session that wrote the row; see <see cref="TenantScopeInterceptor"/> for why.
    /// </summary>
    public const string OrganizationIdColumn = "OrganizationId";

    /// <summary>
    /// Explicitly narrows a query to the current tenant. The global filter already applies; this exists for
    /// call sites that want the predicate visible at the call site rather than implied.
    /// </summary>
    public IQueryable<TEntity> WithinTenant<TEntity>(IQueryable<TEntity> query)
        where TEntity : ITenantScoped
    {
        ArgumentNullException.ThrowIfNull(query);

        var parameter = System.Linq.Expressions.Expression.Parameter(typeof(TEntity), "entity");
        var predicate = TenantIsolationFilter.BuildVisibility(parameter, this);
        return query.Where(System.Linq.Expressions.Expression.Lambda<Func<TEntity, bool>>(predicate, parameter));
    }

    /// <summary>User that performs audit stamping, resolved from the current request.</summary>
    public Guid? AuditActorUserId => _currentUser.UserId;

    /// <inheritdoc />
    public bool HasChanges => ChangeTracker.HasChanges();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        modelBuilder.ApplyValueConverters();

        foreach (var assembly in new[]
                 {
                     typeof(DocumentType).Assembly,
                     typeof(OrganizationDomain.Organization).Assembly,
                     typeof(NegarAzinFadakDbContext).Assembly
                 })
        {
            modelBuilder.ApplyConfigurationsFromAssembly(assembly);
        }

        // Runs after the configurations so that entities reachable only through a navigation are covered.
        ValueConverterConfiguration.ApplyUtcInstantStorage(modelBuilder);
        ValueConverterConfiguration.ApplyClientAssignedKeys(modelBuilder);

        ApplyTenantFilter(modelBuilder);
    }

    /// <summary>
    /// Builds the global filter. Every tenant-owned entity is constrained to the caller's place in the
    /// organizational hierarchy; see <see cref="TenantIsolationFilter"/> for the rules and the reasoning.
    /// </summary>
    private void ApplyTenantFilter(ModelBuilder modelBuilder)
    {
        var context = this;

        TenantIsolationFilter.ApplyColumns(modelBuilder);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes()
                     .Where(type => typeof(ITenantScoped).IsAssignableFrom(type.ClrType))
                     .ToList())
        {
            var parameter = System.Linq.Expressions.Expression.Parameter(entityType.ClrType, "entity");
            var predicate = TenantIsolationFilter.BuildVisibility(parameter, context);

            modelBuilder.Entity(entityType.ClrType)
                .HasQueryFilter(System.Linq.Expressions.Expression.Lambda(predicate, parameter));
        }
    }
}

/// <summary>
/// Value converters for value objects and free-form maps. Domain invariants must survive a round trip
/// through the database, so conversion happens on the way in and out instead of being bypassed.
/// </summary>
internal static class ValueConverterConfiguration
{
    public static void ApplyValueConverters(this ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        ConfigureTenantScope(modelBuilder);
        ConfigureMobileNumber(modelBuilder);
        ConfigureNationalId(modelBuilder);
        ConfigureIban(modelBuilder);
        ConfigureOtpPolicy(modelBuilder);
        ConfigureCaptureQuality(modelBuilder);
        ConfigureJsonMaps(modelBuilder);
    }

    /// <summary>
    /// Persists every <see cref="DateTimeOffset"/> as a UTC <see cref="DateTime"/>.
    /// </summary>
    /// <remarks>
    /// Two reasons, both load-bearing. First, an instant is only unambiguous once it is UTC: SQLite has
    /// no native offset-aware type, so a stored <see cref="DateTimeOffset"/> degrades to text whose
    /// ordering depends on the offset it was written with. Second, the SQLite provider cannot translate
    /// a <see cref="DateTimeOffset"/> comparison in a <c>WHERE</c> clause at all, which would make any
    /// "due before now" query — outbox dispatch, expiry sweeps — fail at translation time. Normalising to
    /// UTC keeps ordering and range queries correct and translatable on both SQLite and PostgreSQL, and
    /// the round trip preserves the offset, so the domain still sees a full instant.
    /// </remarks>
    public static void ApplyUtcInstantStorage(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        var required = new ValueConverter<DateTimeOffset, DateTime>(
            instant => instant.UtcDateTime,
            stored => new DateTimeOffset(DateTime.SpecifyKind(stored, DateTimeKind.Utc)));

        var optional = new ValueConverter<DateTimeOffset?, DateTime?>(
            instant => instant.HasValue ? instant.Value.UtcDateTime : null,
            stored => stored == null
                ? null
                : new DateTimeOffset(DateTime.SpecifyKind(stored.Value, DateTimeKind.Utc)));

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTimeOffset))
                {
                    property.SetValueConverter(required);
                }
                else if (property.ClrType == typeof(DateTimeOffset?))
                {
                    property.SetValueConverter(optional);
                }
            }
        }
    }

    /// <summary>
    /// Declares every <c>Id</c> Guid key as client-assigned.
    /// </summary>
    /// <remarks>
    /// EF Core assumes by convention that a Guid key is produced by the database. This platform does the
    /// opposite: an aggregate assigns its own identifier in its constructor, so that the same identifier
    /// can be handed to related aggregates and to outbox messages in the same operation. Left on the
    /// default, EF treats an entity carrying a non-default Guid as already existing, and a child reached
    /// through a navigation — a document page, a contact point, a folder entry — is then issued an
    /// UPDATE against a row that was never inserted. The insert silently affects nothing and the graph is
    /// lost. Declaring the keys non-generated restores the intended "Added means Added" behaviour.
    /// </remarks>
    public static void ApplyClientAssignedKeys(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (entityType.FindPrimaryKey() is not { } primaryKey
                || primaryKey.Properties.Count != 1
                || primaryKey.Properties[0].ClrType != typeof(Guid)
                || !string.Equals(primaryKey.Properties[0].Name, "Id", StringComparison.Ordinal))
            {
                continue;
            }

            primaryKey.Properties[0].ValueGenerated = ValueGenerated.Never;
        }
    }

    private static void ConfigureTenantScope(ModelBuilder modelBuilder)
    {
        var converter = new ValueConverter<TenantScope, string>(
            scope => ToStorage(scope),
            value => FromStorage(value));

        foreach (var entityType in modelBuilder.Model.GetEntityTypes()
                     .Where(type => typeof(ITenantScoped).IsAssignableFrom(type.ClrType))
                     .ToList())
        {
            var builder = modelBuilder.Entity(entityType.ClrType);

            builder.Property(nameof(ITenantScoped.Scope))
                .HasConversion(converter)
                .HasMaxLength(80)
                .IsRequired();

            // The isolation column is a shadow property, added with its index by TenantIsolationFilter so
            // the domain aggregates stay free of persistence concerns.
        }
    }

    private static void ConfigureMobileNumber(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().Property(user => user.Mobile).HasConversion(
            mobile => mobile.Value,
            value => MobileNumber.Create(value));

        modelBuilder.Entity<OtpChallenge>().Property(challenge => challenge.Target).HasConversion(
            mobile => mobile.Value,
            value => MobileNumber.Create(value));
    }

    private static void ConfigureNationalId(ModelBuilder modelBuilder)
        => modelBuilder.Entity<IdentityProfile>().Property(profile => profile.NationalId).HasConversion(
            nationalId => nationalId == null ? null : nationalId.Value,
            value => value == null ? null : NationalId.Create(value));

    private static void ConfigureIban(ModelBuilder modelBuilder)
        => modelBuilder.Entity<BankAccount>().Property(account => account.Iban).HasConversion(
            iban => iban.Value,
            value => IbanNumber.Create(value));

    private static void ConfigureOtpPolicy(ModelBuilder modelBuilder)
        => modelBuilder.Entity<OtpChallenge>().Property(challenge => challenge.Policy).HasConversion(
            policy => JsonSerializer.Serialize(PolicyProjection.From(policy)),
            value => PolicyProjection.To(value));

    private static void ConfigureCaptureQuality(ModelBuilder modelBuilder)
        => modelBuilder.Entity<DocumentPage>().Property(page => page.Quality).HasConversion(
            quality => quality == null
                ? null
                : JsonSerializer.Serialize(new QualityProjection(
                    quality.Sharpness,
                    quality.Brightness,
                    quality.Contrast,
                    quality.DocumentFullyVisible,
                    quality.PerspectiveAcceptable,
                    quality.GlareDetected)),
            value => value == null ? null : FromQualityProjection(value));

    private static DocumentCaptureQuality? FromQualityProjection(string value)
    {
        var projection = JsonSerializer.Deserialize<QualityProjection>(value);
        return projection == null
            ? null
            : new DocumentCaptureQuality(
                projection.Sharpness,
                projection.Brightness,
                projection.Contrast,
                projection.DocumentFullyVisible,
                projection.PerspectiveAcceptable,
                projection.GlareDetected);
    }

    private static void ConfigureJsonMaps(ModelBuilder modelBuilder)
    {
        ConfigureMap<IReadOnlyDictionary<string, string?>>(
            modelBuilder.Entity<DocumentExtraction>().Property(extraction => extraction.RawFields),
            fields => fields is null ? "{}" : JsonSerializer.Serialize(fields),
            value => JsonSerializer.Deserialize<Dictionary<string, string?>>(value) ?? []);

        ConfigureMap<IReadOnlyDictionary<IdentityField, string?>>(
            modelBuilder.Entity<IdentityDocument>().Property(document => document.NormalizedFields),
            fields => fields is null ? "{}" : JsonSerializer.Serialize(fields),
            value => JsonSerializer.Deserialize<Dictionary<IdentityField, string?>>(value) ?? []);

        ConfigureMap<IReadOnlyDictionary<string, string>>(
            modelBuilder.Entity<Activities.UserEvent>().Property(@event => @event.Metadata),
            metadata => metadata is null ? "{}" : JsonSerializer.Serialize(metadata),
            value => JsonSerializer.Deserialize<Dictionary<string, string>>(value) ?? []);
    }

    /// <summary>
    /// Maps a dictionary-valued domain member to a single JSON column. The aggregates mutate these maps
    /// in place, so the comparer snapshots a detached copy: without it an in-place change would be
    /// invisible to change tracking and the column would silently keep the old values.
    /// </summary>
    private static void ConfigureMap<TMap>(
        PropertyBuilder<TMap> property,
        Func<TMap, string> toProvider,
        Func<string, TMap> fromProvider)
        where TMap : class
    {
        property.HasConversion(
            map => toProvider(map!),
            value => fromProvider(value));

        property.Metadata.SetValueComparer(new ValueComparer<TMap>(
            (left, right) => string.Equals(toProvider(left!), toProvider(right!), StringComparison.Ordinal),
            value => StringComparer.Ordinal.GetHashCode(toProvider(value!)),
            value => JsonSerializer.Deserialize<TMap>(toProvider(value!))!));
    }

    internal static string ToStorage(TenantScope scope)
        => string.Join(
            '|',
            scope.OrganizationId.ToString("N"),
            scope.CompanyId?.ToString("N") ?? string.Empty,
            scope.BrandId?.ToString("N") ?? string.Empty,
            scope.BranchId?.ToString("N") ?? string.Empty,
            scope.StoreId?.ToString("N") ?? string.Empty);

    internal static TenantScope FromStorage(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return TenantScope.None;
        }

        var parts = value.Split('|');
        var organization = parts.Length > 0 && Guid.TryParseExact(parts[0], "N", out var org) ? org : Guid.Empty;

        return new TenantScope(
            organization,
            Parse(parts, 1),
            Parse(parts, 2),
            Parse(parts, 3),
            Parse(parts, 4));
    }

    private static Guid? Parse(string[] parts, int index)
        => parts.Length > index && Guid.TryParseExact(parts[index], "N", out var value) ? value : null;

    private sealed record QualityProjection(
        double Sharpness,
        double Brightness,
        double Contrast,
        bool DocumentFullyVisible,
        bool PerspectiveAcceptable,
        bool GlareDetected);

    private sealed record PolicyProjection(int CodeLength, int TimeToLiveSeconds, int MaxAttempts, int ResendIntervalSeconds, int MaxActiveChallenges)
    {
        public static PolicyProjection From(OtpPolicy policy) => new(
            policy.CodeLength,
            (int)policy.TimeToLive.TotalSeconds,
            policy.MaxAttempts,
            (int)policy.ResendInterval.TotalSeconds,
            policy.MaxActiveChallengesPerTarget);

        public static OtpPolicy To(string json)
        {
            var projection = JsonSerializer.Deserialize<PolicyProjection>(json) ?? new PolicyProjection(5, 120, 5, 60, 3);
            return new OtpPolicy(
                projection.CodeLength,
                TimeSpan.FromSeconds(projection.TimeToLiveSeconds),
                projection.MaxAttempts,
                TimeSpan.FromSeconds(projection.ResendIntervalSeconds),
                projection.MaxActiveChallenges);
        }
    }
}
