using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Organization.Domain.Events;
using NegarAzinFadak.Organization.Domain.Menus;

namespace NegarAzinFadak.Organization.Domain.Tests;

/// <summary>
/// What a menu guarantees about its own shape: a code is unique among siblings, a parent lives in the same
/// menu, a subtree cannot be re-parented into itself, the nesting is bounded, and the platform base
/// structure cannot be removed.
/// </summary>
/// <remarks>
/// Every rule here is a rule about position, and position is the one thing a client cannot verify for
/// itself. A tree with a cycle in it does not render, and a duplicate sibling code produces two entries that
/// link to the same place with no indication that they are the same entry — so the rules are asserted on the
/// aggregate rather than left to the unique index that will report them as a 500.
/// </remarks>
public sealed class MenuTests
{
    private static readonly TenantScope TenantScopeOfAlpha = new(Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001"));
    private static readonly Guid AlphaCompany = Guid.Parse("cccccccc-0000-0000-0000-000000000001");
    private static readonly Guid AlphaBrand = Guid.Parse("dddddddd-0000-0000-0000-000000000001");
    private static readonly Guid BetaCompany = Guid.Parse("cccccccc-0000-0000-0000-000000000002");

    [Fact]
    public void A_menu_takes_its_level_from_its_scope()
    {
        Assert.Equal(MenuLevel.Tenant, Menu.ResolveLevel(TenantScopeOfAlpha));
        Assert.Equal(MenuLevel.Company, Menu.ResolveLevel(TenantScopeOfAlpha.WithCompany(AlphaCompany)));
        Assert.Equal(MenuLevel.Brand, Menu.ResolveLevel(TenantScopeOfAlpha.WithCompany(AlphaCompany).WithBrand(AlphaBrand)));
    }

    [Fact]
    public void A_branch_or_store_scope_defines_no_menu_at_all()
    {
        // Refused rather than rounded down to the brand: silently defining a brand-wide menu for a request
        // that arrived with a store context would publish navigation to a wider audience than the caller
        // asked about, and nothing in the response would reveal it.
        var branchScope = TenantScopeOfAlpha.WithCompany(AlphaCompany).WithBrand(AlphaBrand).WithBranch(Guid.NewGuid());

        Assert.Null(Menu.ResolveLevel(branchScope));
        Assert.Null(Menu.ResolveLevel(TenantScope.None));

        var defined = Menu.Define(Guid.NewGuid(), branchScope, "master", "Master");

        Assert.True(defined.IsFailure);
        Assert.Equal(MenuErrors.MenuScopeInvalidCode, defined.FirstError.Code);
    }

    [Fact]
    public void A_new_menu_is_active_and_holds_nothing()
    {
        var menu = DefineTenantMenu();

        Assert.True(menu.IsActive);
        Assert.False(menu.IsPlatformDefined);
        Assert.Empty(menu.Items);
        Assert.Empty(menu.RootItems());
    }

    [Fact]
    public void A_sibling_code_is_refused_so_the_caller_learns_which_rule_they_broke()
    {
        var menu = DefineTenantMenu();
        menu.AddItem(null, "users", "Users");
        menu.AddItem(null, "reports", "Reports");

        // A different parent is a different set of siblings, so the same code is legal there. Refusing it
        // would force an operator to invent a second name for the same page instead of nesting both.
        var nested = menu.AddItem(menu.RootItems()[0].Id, "users", "Users list");

        var duplicate = menu.AddItem(null, "users", "Users again");
        Assert.True(duplicate.IsFailure);
        Assert.Equal(MenuErrors.ItemDuplicateCodeCode, duplicate.FirstError.Code);
        Assert.NotNull(nested.Value);
    }

    [Fact]
    public void A_code_is_compared_in_its_canonical_form()
    {
        var menu = DefineTenantMenu();
        menu.AddItem(null, "Users", "Users");

        // Stored lower-cased so a lookup by code cannot fail to find a section that plainly exists, and so
        // two spellings of one section cannot both be created.
        var duplicate = menu.AddItem(null, "  USERS  ", "Users again");

        Assert.Equal("users", menu.RootItems()[0].Code);
        Assert.True(duplicate.IsFailure);
        Assert.Equal(MenuErrors.ItemDuplicateCodeCode, duplicate.FirstError.Code);
    }

    [Fact]
    public void A_parent_from_another_menu_is_reported_as_not_found_in_this_one()
    {
        var menu = DefineTenantMenu();
        var other = DefineTenantMenu("other");
        other.AddItem(null, "section", "Section");

        var result = menu.AddItem(other.RootItems()[0].Id, "child", "Child");

        // "Not found in this menu" rather than "belongs to another menu": the second answer would confirm
        // that the identifier exists somewhere, which is a way to probe for menus outside this one.
        Assert.True(result.IsFailure);
        Assert.Equal(MenuErrors.ItemParentNotFoundCode, result.FirstError.Code);
    }

    [Fact]
    public void An_item_cannot_be_moved_under_itself_or_under_its_own_descendant()
    {
        var menu = DefineTenantMenu();
        var root = menu.AddItem(null, "root", "Root").Value;
        var child = menu.AddItem(root.Id, "child", "Child").Value;
        var grandchild = menu.AddItem(child.Id, "grandchild", "Grandchild").Value;

        var ontoSelf = menu.MoveItem(root.Id, root.Id);
        var ontoDescendant = menu.MoveItem(root.Id, grandchild.Id);

        // A cycle has no depth number, so no depth check could catch it — and the recursive walk a client
        // does to render the tree would not terminate.
        Assert.Equal(MenuErrors.ItemCycleCode, ontoSelf.FirstError.Code);
        Assert.Equal(MenuErrors.ItemCycleCode, ontoDescendant.FirstError.Code);
        Assert.Equal(0, menu.FindItem(root.Id)!.Depth);
    }

    [Fact]
    public void Moving_an_item_carries_its_subtree_with_it()
    {
        var menu = DefineTenantMenu();
        var target = menu.AddItem(null, "target", "Target").Value;
        var source = menu.AddItem(null, "source", "Source").Value;
        var child = menu.AddItem(source.Id, "child", "Child").Value;

        menu.MoveItem(source.Id, target.Id);

        // The child keeps its relationship and its depth changes with its parent, or the client would render
        // a branch whose grandchildren sit at a level their parent is not at.
        Assert.Equal(target.Id, menu.FindItem(source.Id)!.ParentId);
        Assert.Equal(1, menu.FindItem(source.Id)!.Depth);
        Assert.Equal(2, menu.FindItem(child.Id)!.Depth);

        // The child stays under its own parent; only the level of the branch changed. Re-pointing the
        // grandchildren at the new parent would flatten the subtree the operator moved.
        Assert.Equal(source.Id, menu.FindItem(child.Id)!.ParentId);
    }

    [Fact]
    public void Nesting_is_bounded_so_an_unreasonable_structure_is_refused_where_it_is_made()
    {
        var menu = DefineTenantMenu();
        var parent = (Guid?)null;

        for (var depth = 0; depth <= Menu.MaximumDepth; depth++)
        {
            var added = menu.AddItem(parent, $"level-{depth}", $"Level {depth}");
            Assert.True(added.IsSuccess);
            parent = added.Value.Id;
        }

        var tooDeep = menu.AddItem(parent, "level-6", "Level 6");

        Assert.True(tooDeep.IsFailure);
        Assert.Equal(MenuErrors.ItemDepthExceededCode, tooDeep.FirstError.Code);
    }

    [Fact]
    public void A_moved_subtree_that_would_exceed_the_bound_is_refused_rather_than_truncated()
    {
        var menu = DefineTenantMenu();
        var shallow = menu.AddItem(null, "shallow", "Shallow").Value;

        // Two independent chains, each as deep as the bound allows. The item moved is the one at depth 4,
        // because it is the deepest item that still carries a child — which is the case where truncation and
        // refusal differ.
        Guid? aParent = null;
        Guid? bParent = null;
        var branchA = Guid.Empty;
        var branchB = Guid.Empty;
        for (var depth = 0; depth <= Menu.MaximumDepth; depth++)
        {
            aParent = menu.AddItem(aParent, $"a-{depth}", $"A {depth}").Value.Id;
            bParent = menu.AddItem(bParent, $"b-{depth}", $"B {depth}").Value.Id;

            if (depth == Menu.MaximumDepth - 1)
            {
                branchA = aParent.Value;
                branchB = bParent.Value;
            }
        }

        var childOfA = menu.ChildrenOf(branchA)[0];
        var moved = menu.MoveItem(branchA, branchB);

        // Truncating the subtree to make it fit would silently drop sections an operator had created, so the
        // whole branch is refused and left exactly where it was.
        Assert.True(moved.IsFailure);
        Assert.Equal(MenuErrors.ItemDepthExceededCode, moved.FirstError.Code);
        Assert.Equal(Menu.MaximumDepth - 1, menu.FindItem(branchA)!.Depth);
        Assert.Equal(Menu.MaximumDepth, menu.FindItem(childOfA.Id)!.Depth);

        // Moving a branch upwards always fits, and has to be allowed: promoting an over-deep branch is
        // exactly the repair an operator performs when the bound is hit.
        Assert.True(menu.MoveItem(branchA, shallow.Id).IsSuccess);
        Assert.Equal(1, menu.FindItem(branchA)!.Depth);
        Assert.Equal(2, menu.FindItem(childOfA.Id)!.Depth);
    }

    [Fact]
    public void A_withdrawn_item_cannot_take_children_and_hides_its_own()
    {
        var menu = DefineTenantMenu();
        var parent = menu.AddItem(null, "parent", "Parent").Value;
        var child = menu.AddItem(parent.Id, "child", "Child").Value;

        Assert.True(menu.DeactivateItem(parent.Id).IsSuccess);

        var rejected = menu.AddItem(parent.Id, "another", "Another");
        Assert.Equal(MenuErrors.ItemParentInactiveCode, rejected.FirstError.Code);

        // The child keeps its place in the tree; withdrawing a branch is not a delete, and the operator who
        // reactivates it expects their structure back.
        Assert.Equal(parent.Id, menu.FindItem(child.Id)!.ParentId);
        Assert.Equal([child.Id], menu.ChildrenOf(parent.Id).Select(item => item.Id));
    }

    [Fact]
    public void A_withdrawn_menu_takes_no_new_items()
    {
        var menu = DefineTenantMenu();
        menu.Deactivate();

        var added = menu.AddItem(null, "section", "Section");

        Assert.Equal(MenuErrors.MenuInactiveCode, added.FirstError.Code);
        Assert.False(menu.IsActive);
    }

    [Fact]
    public void A_section_of_the_platform_base_structure_cannot_be_removed()
    {
        var menu = DefineTenantMenu();
        var baseSection = menu.AddItem(null, "management", "Management", isPlatformDefined: true).Value;
        var own = menu.AddItem(null, "reports", "Reports").Value;

        Assert.True(menu.RemoveItem(baseSection.Id).IsFailure);
        Assert.Equal(MenuErrors.ItemNotRemovableCode, menu.RemoveItem(baseSection.Id).FirstError.Code);

        // The rule is about the base structure, not about being a root item: an operator's own section is
        // theirs to remove, because they are the one who created it.
        Assert.True(menu.RemoveItem(own.Id).IsSuccess);
        Assert.Null(menu.FindItem(own.Id));
    }

    [Fact]
    public void An_item_with_children_cannot_be_removed()
    {
        var menu = DefineTenantMenu();
        var parent = menu.AddItem(null, "parent", "Parent").Value;
        menu.AddItem(parent.Id, "child", "Child");

        var removed = menu.RemoveItem(parent.Id);

        // Deleting the branch would silently take every route under it with it, so the caller is told to
        // move or remove the children first.
        Assert.Equal(MenuErrors.ItemHasChildrenCode, removed.FirstError.Code);
        Assert.Equal(2, menu.Items.Count);
    }

    [Fact]
    public void A_menu_with_items_cannot_be_removed_and_an_empty_one_can()
    {
        var withItems = DefineTenantMenu();
        withItems.AddItem(null, "section", "Section");

        var empty = DefineTenantMenu("empty");
        var removable = empty.Remove();

        Assert.True(withItems.Remove().IsFailure);
        Assert.Equal(MenuErrors.MenuNotEmptyCode, withItems.Remove().FirstError.Code);
        Assert.True(removable.IsSuccess);
    }

    [Fact]
    public void Renaming_a_section_changes_its_code_only_when_the_code_does_not_collide()
    {
        var menu = DefineTenantMenu();
        menu.AddItem(null, "users", "Users");
        var second = menu.AddItem(null, "reports", "Reports").Value;

        var recoded = menu.UpdateItemCode(second.Id, "  Analytics  ");
        var colliding = menu.UpdateItemCode(second.Id, "users");

        Assert.True(recoded.IsSuccess);
        Assert.Equal("analytics", menu.FindItem(second.Id)!.Code);
        Assert.Equal(MenuErrors.ItemDuplicateCodeCode, colliding.FirstError.Code);
        Assert.Equal("analytics", menu.FindItem(second.Id)!.Code);
    }

    [Fact]
    public void Siblings_are_ordered_by_position_then_code_so_the_order_is_total_and_stable()
    {
        var menu = DefineTenantMenu();
        menu.AddItem(null, "beta", "Beta", sortOrder: 10);
        menu.AddItem(null, "alpha", "Alpha", sortOrder: 10);
        menu.AddItem(null, "first", "First", sortOrder: 1);

        // Two sections declared at the same position would otherwise swap places between two reads, and a
        // menu that reshuffles itself on refresh is a menu nobody trusts.
        Assert.Equal(["first", "alpha", "beta"], menu.RootItems().Select(item => item.Code));
    }

    [Fact]
    public void A_route_must_be_a_client_path()
    {
        var menu = DefineTenantMenu();

        Assert.True(menu.AddItem(null, "group", "Group", route: null).IsSuccess);
        Assert.True(menu.AddItem(null, "page", "Page", route: "/management/users").IsSuccess);
        Assert.True(menu.AddItem(null, "external", "External", route: "https://example.com").IsFailure);
        Assert.True(menu.AddItem(null, "protocol", "Protocol", route: "javascript:alert(1)").IsFailure);
        Assert.True(menu.AddItem(null, "double", "Double", route: "//elsewhere").IsFailure);
    }

    [Fact]
    public void An_item_is_visible_only_to_a_caller_holding_its_permission()
    {
        var menu = DefineTenantMenu();
        var gated = menu.AddItem(null, "audit", "Audit", requiredPermissionCode: "platform.audit.read").Value;
        var open = menu.AddItem(null, "home", "Home").Value;

        Assert.True(gated.IsVisibleTo(["platform.audit.read"]));
        Assert.False(gated.IsVisibleTo([]));
        Assert.False(gated.IsVisibleTo(["platform.access.administer"]));

        // No requirement means every authenticated caller sees it, which is a decision the operator made by
        // leaving the field empty — not an oversight the reader should have to guess at.
        Assert.True(open.IsVisibleTo([]));
    }

    [Fact]
    public void A_withdrawn_item_cannot_be_reactivated_twice_or_deactivated_twice()
    {
        var menu = DefineTenantMenu();
        var item = menu.AddItem(null, "section", "Section").Value;
        menu.DeactivateItem(item.Id);

        Assert.True(menu.ActivateItem(item.Id).IsSuccess);
        Assert.True(menu.ActivateItem(item.Id).IsFailure);
        Assert.Equal(MenuErrors.ItemAlreadyActiveCode, menu.ActivateItem(item.Id).FirstError.Code);
        Assert.True(menu.DeactivateItem(item.Id).IsSuccess);
        Assert.Equal(MenuErrors.ItemAlreadyInactiveCode, menu.DeactivateItem(item.Id).FirstError.Code);
    }

    [Fact]
    public void A_company_menu_belongs_to_its_company_and_to_nothing_else()
    {
        var companyScope = TenantScopeOfAlpha.WithCompany(AlphaCompany);
        var menu = Menu.Define(Guid.NewGuid(), companyScope, "master", "Master").Value;

        Assert.Equal(MenuLevel.Company, menu.Level);
        Assert.Equal(AlphaCompany, menu.Scope.CompanyId);
        Assert.NotEqual(menu.Scope, TenantScopeOfAlpha.WithCompany(BetaCompany));
    }

    [Fact]
    public void Withdrawing_a_menu_twice_is_refused_rather_than_reported_as_done()
    {
        var menu = DefineTenantMenu();

        // An operator who withdraws an already withdrawn menu is looking at a screen that has not caught up
        // with their previous change. Answering "done" teaches them the screen is the problem.
        Assert.True(menu.Deactivate().IsSuccess);
        Assert.Equal(MenuErrors.MenuAlreadyInactiveCode, menu.Deactivate().FirstError.Code);
        Assert.True(menu.Activate().IsSuccess);
        Assert.Equal(MenuErrors.MenuAlreadyActiveCode, menu.Activate().FirstError.Code);
    }

    [Fact]
    public void Changing_whether_a_menu_is_available_is_announced_once_per_change()
    {
        var menu = DefineTenantMenu();
        menu.AddItem(null, "users", "Users");
        menu.ClearDomainEvents();

        Assert.True(menu.Deactivate().IsSuccess);
        var withdrawn = Assert.IsType<MenuAvailabilityChanged>(Assert.Single(menu.DomainEvents));
        Assert.Equal(menu.Id, withdrawn.MenuId);
        Assert.Equal("master", withdrawn.MenuCode);
        Assert.False(withdrawn.IsActive);
        Assert.Equal(menu.Scope, withdrawn.Scope);

        menu.ClearDomainEvents();

        // The event names the whole menu, so a subscriber that caches navigation can drop it in one step. An
        // event per item would describe the same change several times and none of them completely.
        Assert.True(menu.Activate().IsSuccess);
        var restored = Assert.IsType<MenuAvailabilityChanged>(Assert.Single(menu.DomainEvents));
        Assert.True(restored.IsActive);
    }

    [Fact]
    public void A_refused_change_announces_nothing()
    {
        var menu = DefineTenantMenu();
        menu.AddItem(null, "users", "Users");
        menu.ClearDomainEvents();

        menu.Deactivate();
        menu.ClearDomainEvents();

        // A refused withdrawal leaves the platform as it was, and an event would tell subscribers otherwise.
        Assert.True(menu.Deactivate().IsFailure);
        Assert.Empty(menu.DomainEvents);
    }

    private static Menu DefineTenantMenu(string code = "master")
        => Menu.Define(Guid.NewGuid(), TenantScopeOfAlpha, code, "Master").Value;
}
