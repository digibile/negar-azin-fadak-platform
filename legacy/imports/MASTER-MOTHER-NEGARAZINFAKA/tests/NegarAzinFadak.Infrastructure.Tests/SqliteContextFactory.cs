using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NegarAzinFadak.Core.Domain;
using NegarAzinFadak.Core.Messaging;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Infrastructure;
using NegarAzinFadak.Infrastructure.Persistence;

namespace NegarAzinFadak.Infrastructure.Tests;

/// <summary>
/// Builds a real SQLite-backed context. Tests run against the same model and the same interceptors the
/// application uses, so a mapping mistake or a missing platform rule fails here instead of in production.
/// </summary>
public sealed class SqliteContextFactory : IDisposable
{
    /// <summary>Fixed instant every test writes against, so assertions never depend on the wall clock.</summary>
    public static readonly DateTimeOffset FixedTime = new(2026, 3, 1, 8, 30, 0, TimeSpan.Zero);

    private readonly SqliteConnection _connection;

    public SqliteContextFactory(TenantScope? scope = null, ICurrentUser? currentUser = null)
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        Scope = scope ?? TenantScope.None;
        Principal = currentUser ?? CurrentUser.Anonymous;

        Context = CreateContext(Scope, Principal);
        Context.Database.EnsureCreated();
    }

    public NegarAzinFadakDbContext Context { get; }

    /// <summary>
    /// Domain events the interceptor dispatched after the commit. Exposed so a test can assert both that an
    /// event was delivered and that it was delivered after the state change, not before it.
    /// </summary>
    public RecordingDomainEventDispatcher Dispatcher { get; } = new();

    public ICurrentUser Principal { get; }

    public TenantScope Scope { get; }

    /// <summary>Builds another context over the same database, simulating a second tenant's session.</summary>
    public NegarAzinFadakDbContext CreateContextFor(TenantScope scope, ICurrentUser? currentUser = null)
    {
        var principal = currentUser ?? Principal;
        var tenantContext = new TenantContext();
        tenantContext.Set(scope);

        return new NegarAzinFadakDbContext(BuildOptions(scope, principal), tenantContext, principal);
    }

    /// <summary>A context with no ambient scope, as used by platform-level background jobs.</summary>
    public NegarAzinFadakDbContext CreateUnscopedContext()
        => new(BuildOptions(TenantScope.None, CurrentUser.Anonymous));

    private NegarAzinFadakDbContext CreateContext(TenantScope scope, ICurrentUser currentUser)
    {
        var tenantContext = new TenantContext();
        tenantContext.Set(scope);

        return new NegarAzinFadakDbContext(BuildOptions(scope, currentUser), tenantContext, currentUser);
    }

    private DbContextOptions<NegarAzinFadakDbContext> BuildOptions(TenantScope scope, ICurrentUser currentUser)
    {
        var tenantContext = new TenantContext();
        tenantContext.Set(scope);

        var services = new ServiceCollection();
        services.AddSingleton<IClock>(new FixedClock(FixedTime));
        services.AddSingleton(currentUser);
        services.AddSingleton<ITenantContext>(tenantContext);
        services.AddSingleton<IDomainEventDispatcher>(Dispatcher);
        using var provider = services.BuildServiceProvider();

        return new DbContextOptionsBuilder<NegarAzinFadakDbContext>()
            .UseSqlite(_connection)
            .AddInterceptors(PersistenceServiceCollectionExtensions.ResolveInterceptors(provider))
            .Options;
    }

    public void Dispose()
    {
        Context.Dispose();
        _connection.Dispose();
    }
}

/// <summary>
/// A dispatcher that keeps what it was given, so a test can assert on event delivery without a handler.
/// </summary>
/// <remarks>
/// It records the order of the calls as well as the events. That is what lets a test prove a pure domain event
/// is dispatched after the commit rather than before it: the outbox rows are already queryable by the time
/// the dispatcher is called.
/// </remarks>
public sealed class RecordingDomainEventDispatcher : IDomainEventDispatcher
{
    private readonly List<IDomainEvent> _events = [];

    public IReadOnlyList<IDomainEvent> Events
    {
        get
        {
            lock (_events)
            {
                return _events.ToArray();
            }
        }
    }

    public Task DispatchAsync(IReadOnlyCollection<IDomainEvent> events, CancellationToken cancellationToken = default)
    {
        lock (_events)
        {
            _events.AddRange(events);
        }

        return Task.CompletedTask;
    }
}
