using Microsoft.EntityFrameworkCore;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Infrastructure.Persistence;
using NegarAzinFadak.Organization.Domain.Menus;

namespace NegarAzinFadak.Infrastructure.Tests;

/// <summary>
/// Menus are tenant-owned, and the levels compose: a brand operator navigates the tenant's sections, then
/// their company's, then their brand's. The global filter has to hold the line across organizations, and the
/// narrowing inside the store has to hold it across the levels of one organization.
/// </summary>
public sealed class MenuTenancyIsolationTests
{
    private static readonly TenantScope AlphaScope = new(Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001"));
    private static readonly TenantScope BetaScope = new(Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002"));
    private static readonly Guid AlphaCompany = Guid.Parse("aaaaaaaa-0000-0000-0000-0000000000c1");
    private static readonly Guid AlphaBrand = Guid.Parse("aaaaaaaa-0000-0000-0000-0000000000b1");
    private static readonly Guid OtherCompany = Guid.Parse("aaaaaaaa-0000-0000-0000-0000000000c2");
    private static readonly Guid OtherBrand = Guid.Parse("aaaaaaaa-0000-0000-0000-0000000000b2");
    private static readonly Guid Now = Guid.Parse("dddddddd-0000-0000-0000-000000000001");

    [Fact]
    public async Task A_menu_of_another_organization_is_invisible_to_a_forgetful_query()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        AddMenu(factory.Context, AlphaScope, MenuLevel.Tenant, "master");
        await factory.Context.SaveChangesAsync();

        using var betaContext = factory.CreateContextFor(BetaScope);
        AddMenu(betaContext, BetaScope, MenuLevel.Tenant, "master");
        await betaContext.SaveChangesAsync();

        var betaMenus = await betaContext.Menus.ToListAsync();
        var alphaMenus = await factory.Context.Menus.ToListAsync();

        // Both tenants use the same menu code, which is why the isolation has to work at row level rather
        // than by name.
        Assert.Equal([BetaScope.OrganizationId], betaMenus.Select(menu => menu.Scope.OrganizationId).Distinct());
        Assert.Equal([AlphaScope.OrganizationId], alphaMenus.Select(menu => menu.Scope.OrganizationId).Distinct());
    }

    [Fact]
    public async Task A_forgetful_query_cannot_reach_a_foreign_menu_by_identifier()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        using var betaContext = factory.CreateContextFor(BetaScope);
        var foreign = AddMenu(betaContext, BetaScope, MenuLevel.Tenant, "master");
        await betaContext.SaveChangesAsync();
        factory.Context.ChangeTracker.Clear();

        Assert.Null(await new EfCoreMenuDirectory(factory.Context).FindTrackedByIdAsync(foreign.Id));
    }

    [Fact]
    public async Task A_brand_caller_sees_its_own_chain_of_levels_and_nothing_beyond_it()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        var directory = new EfCoreMenuDirectory(factory.Context);

        AddMenu(factory.Context, AlphaScope, MenuLevel.Tenant, "tenant-master");
        AddMenu(factory.Context, AlphaScope.WithCompany(AlphaCompany), MenuLevel.Company, "company-master");
        AddMenu(factory.Context, AlphaScope.WithCompany(AlphaCompany).WithBrand(AlphaBrand), MenuLevel.Brand, "brand-master");
        AddMenu(factory.Context, AlphaScope.WithCompany(OtherCompany), MenuLevel.Company, "other-company-master");
        AddMenu(factory.Context, AlphaScope.WithCompany(OtherCompany).WithBrand(OtherBrand), MenuLevel.Brand, "other-brand-master");
        AddMenu(factory.Context, BetaScope, MenuLevel.Tenant, "beta-master");
        await factory.Context.SaveChangesAsync();
        factory.Context.ChangeTracker.Clear();

        var brandOperator = AlphaScope.WithCompany(AlphaCompany).WithBrand(AlphaBrand);
        var visible = await directory.ListVisibleAsync(brandOperator);

        // A brand operator acts in a leaf of the hierarchy, so what they see is the path from the tenant
        // down to their own brand, in that order. Another company's menu shares this organization and is
        // still somebody else's configuration.
        Assert.Equal(
            ["tenant-master", "company-master", "brand-master"],
            visible.Select(menu => menu.Code));
    }

    [Fact]
    public async Task A_menu_of_another_brand_is_not_visible_to_a_caller_that_acts_at_company_level()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        var directory = new EfCoreMenuDirectory(factory.Context);

        AddMenu(factory.Context, AlphaScope.WithCompany(AlphaCompany), MenuLevel.Company, "company-master");
        AddMenu(factory.Context, AlphaScope.WithCompany(AlphaCompany).WithBrand(AlphaBrand), MenuLevel.Brand, "brand-master");
        await factory.Context.SaveChangesAsync();
        factory.Context.ChangeTracker.Clear();

        // A company operator has not chosen a brand, so no brand menu is theirs. Handing them one anyway
        // would show a section whose actions are performed against a brand they are not acting in.
        var visible = await directory.ListVisibleAsync(AlphaScope.WithCompany(AlphaCompany));

        Assert.Equal(["company-master"], visible.Select(menu => menu.Code));
    }

    [Fact]
    public async Task A_withdrawn_menu_is_still_readable_for_administration()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        var directory = new EfCoreMenuDirectory(factory.Context);
        var menu = AddMenu(factory.Context, AlphaScope, MenuLevel.Tenant, "master");
        menu.Deactivate();
        await factory.Context.SaveChangesAsync();
        factory.Context.ChangeTracker.Clear();

        // An administrator's question is often "which section is missing", and a withdrawn menu is exactly
        // the answer. Filtering it away hides the state the screen exists to show.
        var visible = await directory.ListVisibleAsync(AlphaScope);

        Assert.Equal(["master"], visible.Select(candidate => candidate.Code));
        Assert.False(Assert.Single(visible).IsActive);
    }

    [Fact]
    public async Task An_administration_read_returns_one_level_and_the_callers_own_company()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        var directory = new EfCoreMenuDirectory(factory.Context);

        AddMenu(factory.Context, AlphaScope, MenuLevel.Tenant, "tenant-master");
        AddMenu(factory.Context, AlphaScope.WithCompany(AlphaCompany), MenuLevel.Company, "company-master");
        AddMenu(factory.Context, AlphaScope.WithCompany(OtherCompany), MenuLevel.Company, "other-company-master");
        await factory.Context.SaveChangesAsync();
        factory.Context.ChangeTracker.Clear();

        var own = await directory.ListAtLevelAsync(AlphaScope.WithCompany(AlphaCompany), MenuLevel.Company);
        var tenant = await directory.ListAtLevelAsync(AlphaScope, MenuLevel.Tenant);

        Assert.Equal(["company-master"], own.Select(menu => menu.Code));
        Assert.Equal(["tenant-master"], tenant.Select(menu => menu.Code));
    }

    [Fact]
    public async Task An_installer_lookup_finds_a_menu_by_code_at_the_level_and_nowhere_else()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        var directory = new EfCoreMenuDirectory(factory.Context);

        AddMenu(factory.Context, AlphaScope, MenuLevel.Tenant, "master");
        AddMenu(factory.Context, AlphaScope.WithCompany(AlphaCompany), MenuLevel.Company, "master");
        await factory.Context.SaveChangesAsync();
        factory.Context.ChangeTracker.Clear();

        // The installer knows a code, not an identifier, and has to recognise what a previous run installed.
        // Two levels may carry the same code, so the level is part of the question.
        var tenant = await directory.FindTrackedByCodeAsync(AlphaScope, MenuLevel.Tenant, "MASTER");
        var company = await directory.FindTrackedByCodeAsync(AlphaScope.WithCompany(AlphaCompany), MenuLevel.Company, "master");

        Assert.Equal(MenuLevel.Tenant, tenant?.Level);
        Assert.Equal(MenuLevel.Company, company?.Level);
        Assert.False(await directory.CodeExistsAsync(AlphaScope, MenuLevel.Brand, "master"));
    }

    [Fact]
    public async Task A_scoped_caller_without_a_company_owns_no_menu()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        var directory = new EfCoreMenuDirectory(factory.Context);
        AddMenu(factory.Context, AlphaScope, MenuLevel.Tenant, "master");
        await factory.Context.SaveChangesAsync();
        factory.Context.ChangeTracker.Clear();

        // An unresolved scope belongs to a platform administrator, who is not acting inside a tenant. It
        // owns no navigation and must not be handed somebody else's by defaulting to "the first tenant".
        Assert.Empty(await directory.ListVisibleAsync(TenantScope.None));
        Assert.Empty(await directory.ListAtLevelAsync(TenantScope.None, MenuLevel.Tenant));
        Assert.Null(await directory.FindTrackedByIdAsync(Guid.NewGuid()));
        Assert.False(await directory.CodeExistsAsync(TenantScope.None, MenuLevel.Tenant, "master"));
    }

    /// <summary>Writes a menu, and the sections that make a level worth separating, then returns it.</summary>
    private static Menu AddMenu(
        NegarAzinFadakDbContext context,
        TenantScope scope,
        MenuLevel level,
        string code)
    {
        var menu = Menu.Define(Guid.NewGuid(), scope, code, code).Value;
        _ = menu.AddItem(null, $"{code}.root", code);
        context.Menus.Add(menu);
        return menu;
    }
}
