using Microsoft.EntityFrameworkCore;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Infrastructure.Persistence;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Organization.Domain.Configuration;
using NegarAzinFadak.Organization.Domain.Events;
using NegarAzinFadak.Organization.Domain.Roles;

namespace NegarAzinFadak.Infrastructure.Tests;

/// <summary>
/// The authorization and configuration tables are tenant-owned, so the platform's global filter has to hold
/// for them exactly as it does for identities — a role of another organization must be invisible even to a
/// query that forgot to ask.
/// </summary>
public sealed class TenancyIsolationTests
{
    private static readonly TenantScope AlphaScope = new(Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001"));
    private static readonly TenantScope BetaScope = new(Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002"));
    private static readonly DateTimeOffset Now = new(2026, 3, 1, 8, 30, 0, TimeSpan.Zero);
    private static readonly Guid Actor = Guid.Parse("dddddddd-0000-0000-0000-000000000001");

    [Fact]
    public async Task A_role_of_another_tenant_is_invisible_to_a_forgetful_query()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        var alphaRole = AddRole(factory.Context, AlphaScope, "seller_manager");

        using var betaContext = factory.CreateContextFor(BetaScope);
        var betaRole = AddRole(betaContext, BetaScope, "seller_manager");

        // Both tenants use the same role code; that is legal, and it is the reason the isolation has to work
        // at row level rather than by name.
        var betaVisible = await betaContext.Roles.ToListAsync();
        var alphaVisible = await factory.Context.Roles.ToListAsync();

        Assert.Equal([betaRole.Id], betaVisible.Select(role => role.Id));
        Assert.Equal([alphaRole.Id], alphaVisible.Select(role => role.Id));
    }

    [Fact]
    public async Task A_tenant_configuration_of_another_tenant_is_not_found()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        AddConfiguration(factory.Context, AlphaScope, "credit.default.down_payment", "30");

        using var betaContext = factory.CreateContextFor(BetaScope);

        Assert.Null(await betaContext.TenantConfigurations
            .Include(configuration => configuration.Settings)
            .FirstOrDefaultAsync());
    }

    [Fact]
    public async Task A_permission_grant_of_another_tenant_is_invisible()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        var alphaRole = AddRole(factory.Context, AlphaScope, "seller_manager");
        alphaRole.Grant("seller.order.read", Now, Actor);
        await factory.Context.SaveChangesAsync();

        using var betaContext = factory.CreateContextFor(BetaScope);

        Assert.Empty(await betaContext.RolePermissions.ToListAsync());
    }

    [Fact]
    public async Task An_unresolved_session_is_platform_work_and_reaches_every_tenant()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        AddRole(factory.Context, AlphaScope, "seller_manager");

        using var betaContext = factory.CreateContextFor(BetaScope);
        AddRole(betaContext, BetaScope, "seller_manager");

        // A background job runs without a request and must still be able to do platform work. The filter
        // resolves to "everything" for it, which is why a query that must not cross tenants has to state its
        // own scope rather than relying on the ambient one.
        using var unscoped = factory.CreateUnscopedContext();
        Assert.Equal(2, await unscoped.Roles.CountAsync());
    }

    [Fact]
    public async Task A_role_is_written_under_the_session_that_wrote_it()
    {
        using var factory = new SqliteContextFactory(AlphaScope);

        // A company-scoped session inside the same organization. The role carries the organization scope, and
        // the isolation column records the session's organization, so both agree here.
        var companyScope = AlphaScope.WithCompany(Guid.Parse("cccccccc-0000-0000-0000-000000000001"));
        using var companyContext = factory.CreateContextFor(companyScope);
        var role = AddRole(companyContext, companyScope, "seller_manager");

        await companyContext.SaveChangesAsync();
        companyContext.ChangeTracker.Clear();

        using var organizationContext = factory.CreateContextFor(AlphaScope);

        // Visible to the organization-level session: a role belongs to the tenant, not to the company the
        // administrator happened to be logged into.
        Assert.NotNull(await organizationContext.Roles.FirstOrDefaultAsync(candidate => candidate.Id == role.Id));
    }

    private static Role AddRole(NegarAzinFadakDbContext context, TenantScope scope, string code)
    {
        var role = Role.Define(Guid.NewGuid(), scope, code, code);
        context.Roles.Add(role);
        context.SaveChanges();
        return role;
    }

    private static void AddConfiguration(NegarAzinFadakDbContext context, TenantScope scope, string code, string value)
    {
        var configuration = TenantConfiguration.ForTenant(Guid.NewGuid(), scope);
        configuration.Set(code, value, TenantSettingKind.Decimal, false, new NumericRange(0m, 100m));
        context.TenantConfigurations.Add(configuration);
        context.SaveChanges();
    }

}
