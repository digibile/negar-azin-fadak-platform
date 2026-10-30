using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Organization.Domain;

namespace NegarAzinFadak.Organization.Domain.Tests;

/// <summary>
/// The organizational hierarchy's own rules: which unit may exist under which parent, and what a lifecycle
/// transition is allowed to do to the status history.
/// </summary>
/// <remarks>
/// These are the rules that no database constraint can express, and the ones whose absence would be found
/// by a user rather than by a failed test in a build: a brand with no company, or a suspension nobody can
/// explain when the tenant asks why.
/// </remarks>
public sealed class OrganizationalUnitTests
{
    private static readonly Guid OrganizationId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
    private static readonly TenantScope OrganizationScope = new(OrganizationId);
    private static readonly DateTimeOffset Now = new(2026, 3, 1, 8, 30, 0, TimeSpan.Zero);
    private static readonly Guid Actor = Guid.Parse("dddddddd-0000-0000-0000-000000000001");

    [Fact]
    public void A_new_unit_starts_in_draft_and_carries_its_organization()
    {
        var organization = new Organization(OrganizationId, "acme", "Acme");

        Assert.Equal(OrganizationalUnitStatus.Draft, organization.Status);
        Assert.False(organization.IsActive);
        Assert.Equal(OrganizationId, organization.Scope.OrganizationId);
        Assert.Null(organization.ParentId);
    }

    [Fact]
    public void A_company_knows_its_organization_as_its_parent()
    {
        var company = new Company(Guid.NewGuid(), OrganizationId, "subsidiary", "Acme Trading");

        // The parent is stored, not derived from the scope string: "children of this organization" has to
        // be an indexed query, and a value-converted member access cannot be translated to one.
        Assert.Equal(OrganizationId, company.ParentId);
    }

    [Fact]
    public void A_brand_below_a_company_records_that_company_as_its_parent()
    {
        var companyScope = OrganizationScope.WithCompany(Guid.NewGuid());

        var brand = new Brand(Guid.NewGuid(), companyScope, "acme-home", "Acme Home");

        Assert.Equal(companyScope.CompanyId, brand.ParentId);
    }

    [Fact]
    public void A_brand_without_a_company_is_refused()
    {
        // An organization-only scope satisfies "the next level down is unset", so the guard has to name the
        // coordinate it actually requires. Without that, a brand could be created directly under the tenant
        // root and the hierarchy would have a hole no query could explain.
        Assert.Throws<InvalidOperationException>(() =>
            new Brand(Guid.NewGuid(), OrganizationScope, "acme-home", "Acme Home"));
    }

    [Fact]
    public void A_branch_below_an_organization_is_refused()
    {
        Assert.Throws<InvalidOperationException>(() =>
            new Branch(Guid.NewGuid(), OrganizationScope, "north", "North Branch"));
    }

    [Fact]
    public void A_store_without_a_branch_is_refused()
    {
        Assert.Throws<InvalidOperationException>(() =>
            new Store(Guid.NewGuid(), OrganizationScope, "central", "Central Warehouse"));
    }

    [Fact]
    public void A_unit_placed_below_its_own_level_is_refused()
    {
        var companyScope = OrganizationScope.WithCompany(Guid.NewGuid());
        var brandScope = companyScope.WithBrand(Guid.NewGuid());
        var branchScope = brandScope.WithBranch(Guid.NewGuid());

        // Each level must be introduced exactly once. A brand built on a scope that already names a brand is
        // a caller that lost track of where it was, and accepting it would produce a unit whose parent
        // pointer disagrees with its scope.
        Assert.Throws<InvalidOperationException>(() =>
            new Brand(Guid.NewGuid(), brandScope, "acme-home", "Acme Home"));
        Assert.Throws<InvalidOperationException>(() =>
            new Branch(Guid.NewGuid(), branchScope, "north", "North Branch"));
        Assert.Throws<InvalidOperationException>(() =>
            new Store(Guid.NewGuid(), branchScope.WithStore(Guid.NewGuid()), "central", "Central Warehouse"));
    }

    [Fact]
    public void Suspension_without_a_reason_is_refused()
    {
        var organization = new Organization(OrganizationId, "acme", "Acme");
        organization.Activate(Actor, Now);

        var suspended = organization.Suspend("   ", Actor, Now);

        Assert.True(suspended.IsFailure);
        Assert.Equal(OrganizationErrors.SuspensionReasonRequiredCode, suspended.FirstError.Code);

        // A refusal leaves no trace on the aggregate: a unit that was refused a suspension must not look
        // suspended in a status read, and its history must not gain an entry that never happened.
        Assert.Equal(OrganizationalUnitStatus.Active, organization.Status);
        Assert.Single(organization.StatusHistory);
    }

    [Fact]
    public void A_suspension_records_who_did_it_and_why()
    {
        var organization = new Organization(OrganizationId, "acme", "Acme");
        organization.Activate(Actor, Now);

        var suspended = organization.Suspend("pending tax documentation", Actor, Now.AddHours(2));

        Assert.True(suspended.IsSuccess);
        Assert.Equal(OrganizationalUnitStatus.Suspended, organization.Status);

        // The history is complete, not overwritten: the suspension is the second entry, and the activation
        // before it is still there.
        Assert.Equal(2, organization.StatusHistory.Count);
        var transition = organization.StatusHistory[^1];
        Assert.Equal(OrganizationalUnitStatus.Active, transition.From);
        Assert.Equal(OrganizationalUnitStatus.Suspended, transition.To);
        Assert.Equal(Actor, transition.ActorId);
        Assert.Equal("pending tax documentation", transition.Reason);
        Assert.Equal(Now.AddHours(2), transition.ChangedAt);
    }

    [Fact]
    public void A_closed_unit_can_no_longer_change_status()
    {
        var organization = new Organization(OrganizationId, "acme", "Acme");
        organization.Activate(Actor, Now);
        organization.Close("merged into the parent", Actor, Now);

        var suspended = organization.Suspend("a late idea", Actor, Now);

        Assert.True(suspended.IsFailure);
        Assert.Equal(OrganizationErrors.UnitClosedCode, suspended.FirstError.Code);
    }

    [Fact]
    public void An_already_active_unit_stays_active_and_records_nothing()
    {
        var organization = new Organization(OrganizationId, "acme", "Acme");
        organization.Activate(Actor, Now);

        var again = organization.Activate(Actor, Now.AddHours(1));

        // Re-activating is a no-op rather than an error, because an activation endpoint is often called by
        // a workflow that does not know whether it already ran. A spurious history entry would misreport it.
        Assert.True(again.IsSuccess);
        Assert.Equal(OrganizationalUnitStatus.Active, organization.Status);
        Assert.Single(organization.StatusHistory);
    }

    [Fact]
    public void An_invalid_currency_is_refused_and_the_previous_one_survives()
    {
        var organization = new Organization(OrganizationId, "acme", "Acme");
        organization.SetDefaultCurrency("IRR");

        var rejected = organization.SetDefaultCurrency("IR");

        Assert.True(rejected.IsFailure);
        Assert.Equal("IRR", organization.DefaultCurrencyCode);
    }

    [Fact]
    public void Codes_are_normalized_so_imports_and_labels_agree()
    {
        var organization = new Organization(OrganizationId, "  acme  ", "Acme");

        Assert.Equal("ACME", organization.Code);
    }
}
