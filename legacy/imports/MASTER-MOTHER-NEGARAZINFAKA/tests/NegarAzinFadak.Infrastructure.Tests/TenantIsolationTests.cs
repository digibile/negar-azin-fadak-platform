using Microsoft.EntityFrameworkCore;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Identity.Domain.Users;

namespace NegarAzinFadak.Infrastructure.Tests;

/// <summary>
/// Tenant isolation is a platform rule, not a per-query convention: a query that forgets its predicate
/// must still be unable to read another organization's rows.
/// </summary>
public sealed class TenantIsolationTests
{
    private static readonly TenantScope AlphaScope = new(Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001"));
    private static readonly TenantScope BetaScope = new(Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002"));
    private static readonly Guid AlphaCompany = Guid.Parse("cccccccc-0000-0000-0000-000000000001");

    [Fact]
    public async Task A_query_never_reaches_another_organizations_rows()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        var alphaUser = AddUser(factory.Context, AlphaScope, "+989121110001");

        using var betaContext = factory.CreateContextFor(BetaScope);
        var betaUser = AddUser(betaContext, BetaScope, "+989121110002");

        // Each tenant sees its own row and only its own row. Neither can reach the other without ever
        // writing a predicate, which is the guarantee the global filter exists to provide.
        var betaVisible = await betaContext.Users.ToListAsync();
        var alphaVisible = await factory.Context.Users.ToListAsync();

        Assert.Equal([betaUser.Id], betaVisible.Select(user => user.Id));
        Assert.Equal([alphaUser.Id], alphaVisible.Select(user => user.Id));

        // Both rows are genuinely present; the separation above is produced by the filter, not by the
        // write having failed. Dropping the filter on purpose is the only way to observe the other tenant,
        // and it is a deliberate opt-out reserved for platform administration.
        var unfiltered = await betaContext.Users.IgnoreQueryFilters().ToListAsync();
        Assert.Contains(betaUser.Id, unfiltered.Select(user => user.Id));
        Assert.Contains(alphaUser.Id, unfiltered.Select(user => user.Id));
    }

    [Fact]
    public async Task An_organization_scoped_caller_sees_every_row_of_its_organization()
    {
        using var factory = new SqliteContextFactory(AlphaScope);

        // Organization-level record.
        var organizationLevelUser = AddUser(factory.Context, AlphaScope, "+989121110008");

        // Records carrying a narrower company coordinate. The filter resolves the organization only, so
        // these remain visible to an organization-level caller; see docs/adr/tenant-isolation-levels.md
        // for the levels that are deliberately not isolated yet.
        using var companyContext = factory.CreateContextFor(AlphaScope.WithCompany(AlphaCompany));
        var companyUser = AddUser(companyContext, AlphaScope.WithCompany(AlphaCompany), "+989121110010");

        // A different organization entirely.
        using var foreignContext = factory.CreateContextFor(BetaScope);
        AddUser(foreignContext, BetaScope, "+989121110012");

        using var caller = factory.CreateContextFor(AlphaScope);

        var visible = await caller.Users.Select(user => user.Id).ToListAsync();
        var expected = new[] { organizationLevelUser.Id, companyUser.Id };
        Assert.Equal(expected.Order(), visible.Order());

        // ...and nothing beyond the organization.
        Assert.Equal(3, await caller.Users.IgnoreQueryFilters().CountAsync());
    }

    [Fact]
    public async Task A_platform_level_context_without_a_scope_sees_every_tenant()
    {
        using var factory = new SqliteContextFactory();
        AddUser(factory.Context, AlphaScope, "+989121110004");
        AddUser(factory.Context, BetaScope, "+989121110005");

        using var platformContext = factory.CreateUnscopedContext();

        Assert.Equal(2, await platformContext.Users.CountAsync());
    }

    [Fact]
    public async Task Write_attempts_from_the_wrong_scope_do_not_create_visible_rows()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        using var betaContext = factory.CreateContextFor(BetaScope);

        betaContext.Users.Add(User.Register(
            Guid.NewGuid(),
            AlphaScope,
            MobileNumber.Create("+989121110006"),
            UserSource.OperatorAssisted));

        await betaContext.SaveChangesAsync();
        factory.Context.ChangeTracker.Clear();

        Assert.Empty(await factory.Context.Users.ToListAsync());
        Assert.Single(await factory.Context.Users.IgnoreQueryFilters().ToListAsync());
    }

    [Fact]
    public async Task Documents_and_timeline_entries_are_isolated_too()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        var user = AddUser(factory.Context, AlphaScope, "+989121110007");

        using var betaContext = factory.CreateContextFor(BetaScope);

        Assert.Empty(await betaContext.Users.Include(candidate => candidate.Roles).ToListAsync());
        Assert.Empty(await betaContext.UserEvents.ToListAsync());
        Assert.Single(await betaContext.Users.IgnoreQueryFilters()
            .Where(candidate => candidate.Id == user.Id)
            .ToListAsync());
    }

    private static User AddUser(NegarAzinFadak.Infrastructure.Persistence.NegarAzinFadakDbContext context, TenantScope scope, string mobile)
    {
        var user = User.Register(
            Guid.NewGuid(),
            scope,
            MobileNumber.Create(mobile),
            UserSource.MobileRegistration);

        context.Users.Add(user);
        context.SaveChanges();
        return user;
    }
}
