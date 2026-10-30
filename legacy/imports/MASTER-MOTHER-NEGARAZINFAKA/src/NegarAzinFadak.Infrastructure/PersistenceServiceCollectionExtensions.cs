using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using NegarAzinFadak.Application.Documents;
using NegarAzinFadak.Application.Identity;
using NegarAzinFadak.Application.Navigation;
using NegarAzinFadak.Application.Tenancy;
using NegarAzinFadak.Core.Auditing;
using NegarAzinFadak.Core.Domain;
using NegarAzinFadak.Core.Messaging;
using NegarAzinFadak.Core.Persistence;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Infrastructure.Persistence;

namespace NegarAzinFadak.Infrastructure;

/// <summary>
/// Single registration point for persistence, so the composition root and the test harness configure the
/// context identically. A test that builds its own <see cref="DbContextOptions"/> can silently miss an
/// interceptor and then disagree with production behaviour, which is exactly the class of bug these
/// interceptors exist to prevent.
/// </summary>
public static class PersistenceServiceCollectionExtensions
{
    /// <summary>
    /// Registers the platform <see cref="NegarAzinFadakDbContext"/> with tenant isolation, audit stamping
    /// and UTC instant storage applied through the same interceptors the application uses.
    /// </summary>
    /// <param name="services">Container to register into.</param>
    /// <param name="configure">Provider-specific configuration, e.g. <c>UseSqlite</c> or <c>UseNpgsql</c>.</param>
    public static IServiceCollection AddNegarAzinFadakDbContext(
        this IServiceCollection services,
        Action<DbContextOptionsBuilder> configure)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configure);

        services.AddScoped<NegarAzinFadakDbContext>(provider =>
        {
            var options = new DbContextOptionsBuilder<NegarAzinFadakDbContext>();
            configure(options);
            options.AddInterceptors(ResolveInterceptors(provider));

            return new NegarAzinFadakDbContext(
                options.Options,
                provider.GetRequiredService<ITenantContext>(),
                provider.GetRequiredService<ICurrentUser>());
        });

        services.AddScoped<IUnitOfWork>(provider => provider.GetRequiredService<NegarAzinFadakDbContext>());
        services.AddScoped<IAuditTrail, EfCoreAuditTrail>();
        services.AddScoped<IOutbox, EfCoreOutbox>();
        services.AddScoped<IDomainEventDispatcher, DomainEventDispatcher>();
        services.AddScoped<IOrganizationDirectory, EfCoreOrganizationDirectory>();
        services.AddScoped<IRoleDirectory, EfCoreRoleDirectory>();
        services.AddScoped<IPermissionCatalog, EfCorePermissionCatalog>();
        services.AddScoped<IPermissionCatalogWriter, EfCorePermissionCatalogWriter>();
        services.AddScoped<IIdentitySignInDirectory, EfCoreIdentitySignInDirectory>();
        services.AddScoped<IIdentityDirectory, EfCoreIdentityDirectory>();
        services.AddScoped<IDocumentDirectory, EfCoreDocumentDirectory>();
        services.AddScoped<IDocumentTypeCatalog, EfCoreDocumentTypeCatalog>();
        services.AddScoped<IDigitalFolderDirectory, EfCoreDigitalFolderDirectory>();
        services.AddScoped<ITenantConfigurationDirectory, EfCoreTenantConfigurationDirectory>();
        services.AddScoped<IMenuDirectory, EfCoreMenuDirectory>();

        // The repository is open: every aggregate in the platform is reachable through it, and registering
        // the closed generic types here would need a new line for each of them the first time a module is
        // added. The service provider caches one instance per closed type, so a resolve stays cheap.
        services.AddScoped(typeof(IRepository<>), typeof(EfCoreRepository<>));

        return services;
    }

    /// <summary>
    /// Builds the interceptor set for a service provider. Exposed so a test harness can reuse the exact
    /// production interceptors over an externally supplied connection.
    /// </summary>
    public static IInterceptor[] ResolveInterceptors(IServiceProvider provider)
    {
        ArgumentNullException.ThrowIfNull(provider);

        return
        [
            new AuditSaveChangesInterceptor(
                provider.GetRequiredService<IClock>(),
                provider.GetRequiredService<ICurrentUser>()),
            new TenantScopeInterceptor(provider.GetRequiredService<ITenantContext>()),
            new DomainEventOutboxInterceptor(provider.GetRequiredService<IDomainEventDispatcher>())
        ];
    }
}
