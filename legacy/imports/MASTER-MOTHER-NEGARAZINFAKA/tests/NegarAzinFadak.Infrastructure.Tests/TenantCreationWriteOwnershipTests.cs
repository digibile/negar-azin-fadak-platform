using Microsoft.EntityFrameworkCore;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Infrastructure.Persistence;
using OrganizationRoot = NegarAzinFadak.Organization.Domain.Organization;
using NegarAzinFadak.Organization.Domain.Menus;

namespace NegarAzinFadak.Infrastructure.Tests;

/// <summary>
/// Who owns a row that a session writes for an organization other than its own.
/// </summary>
/// <remarks>
/// The rule is that a session cannot choose the target of a write: rows are attributed to the session's
/// organization, so a write aimed at somebody else's tenant lands somewhere neither party can read it. The
/// one case that cannot follow that rule is creating a tenant — a provisioning session has no scope to hold
/// for a tenant that does not exist yet, and everything the new tenant is given has to be written in the same
/// save. These tests pin both halves: the exemption is real, and it does not extend to an existing tenant.
/// </remarks>
public sealed class TenantCreationWriteOwnershipTests
{
    private static readonly Guid Writer = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
    private static readonly Guid Existing = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002");
    private static readonly Guid Created = Guid.Parse("cccccccc-0000-0000-0000-000000000003");

    [Fact]
    public async Task A_row_of_a_tenant_being_created_in_the_same_save_is_readable_by_that_tenant()
    {
        using var factory = new SqliteContextFactory(new TenantScope(Writer));

        // The shape of provisioning: the organization and its navigation are one unit of work, because a
        // tenant whose base structure was refused is a tenant that should not exist.
        factory.Context.Organizations.Add(new OrganizationRoot(Created, "created-tenant", "Created tenant"));
        AddMenu(factory.Context, new TenantScope(Created), "master");
        await factory.Context.SaveChangesAsync();

        using var createdContext = factory.CreateContextFor(new TenantScope(Created));
        using var writerContext = factory.CreateContextFor(new TenantScope(Writer));

        // Without the exemption the row would be stamped with the writer's organization and be invisible to
        // both parties: a provisioned tenant with a navigation nobody can open.
        Assert.Equal(["master"], await CodesOf(createdContext));
        Assert.Empty(await writerContext.Menus.ToListAsync());
    }

    [Fact]
    public async Task A_row_of_an_existing_tenant_is_not_granted_to_the_session_that_writes_it()
    {
        using var factory = new SqliteContextFactory(new TenantScope(Writer));
        factory.Context.Organizations.Add(new OrganizationRoot(Existing, "existing-tenant", "Existing tenant"));
        await factory.Context.SaveChangesAsync();
        factory.Context.ChangeTracker.Clear();

        // The organization exists already, so this is an ordinary cross-tenant write and keeps being
        // attributed to the writer.
        AddMenu(factory.Context, new TenantScope(Existing), "master");
        await factory.Context.SaveChangesAsync();

        using var existingContext = factory.CreateContextFor(new TenantScope(Existing));
        using var writerContext = factory.CreateContextFor(new TenantScope(Writer));

        Assert.Empty(await existingContext.Menus.ToListAsync());
        Assert.Equal(["master"], await CodesOf(writerContext));
    }

    [Fact]
    public async Task A_platform_job_writing_without_a_session_keeps_the_row_with_its_owner()
    {
        using var factory = new SqliteContextFactory();

        // Unresolved sessions are how background work runs, and they write across organizations legitimately.
        AddMenu(factory.Context, new TenantScope(Existing), "master");
        AddMenu(factory.Context, new TenantScope(Created), "portal");
        await factory.Context.SaveChangesAsync();

        using var existingContext = factory.CreateContextFor(new TenantScope(Existing));
        using var createdContext = factory.CreateContextFor(new TenantScope(Created));

        Assert.Equal(["master"], await CodesOf(existingContext));
        Assert.Equal(["portal"], await CodesOf(createdContext));
    }

    /// <summary>Reads the menu codes a session can see, which is what the isolation decides.</summary>
    private static async Task<string[]> CodesOf(NegarAzinFadakDbContext context)
        => (await context.Menus.Select(menu => menu.Code).ToListAsync()).ToArray();

    private static void AddMenu(NegarAzinFadakDbContext context, TenantScope scope, string code)
    {
        var menu = Menu.Define(Guid.NewGuid(), scope, code, code).Value;
        _ = menu.AddItem(null, $"{code}.root", code);
        context.Menus.Add(menu);
    }
}
