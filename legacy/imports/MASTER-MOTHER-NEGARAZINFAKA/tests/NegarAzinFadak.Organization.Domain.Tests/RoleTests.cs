using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Organization.Domain.Roles;

namespace NegarAzinFadak.Organization.Domain.Tests;

/// <summary>
/// What a role guarantees about its own grants: a permission is held at most once, a revoked grant stops
/// authorizing without being erased, and a retired role stops being assignable.
/// </summary>
/// <remarks>
/// Authorization is the one place where a wrong answer is invisible until it causes harm, so these rules are
/// asserted on the aggregate rather than assumed from the database schema.
/// </remarks>
public sealed class RoleTests
{
    private static readonly TenantScope Scope = new(Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001"));
    private static readonly DateTimeOffset Now = new(2026, 3, 1, 8, 30, 0, TimeSpan.Zero);
    private static readonly Guid Actor = Guid.Parse("dddddddd-0000-0000-0000-000000000001");

    [Fact]
    public void A_newly_defined_role_is_active_and_holds_nothing()
    {
        var role = Role.Define(Guid.NewGuid(), Scope, "Seller_Manager", "Seller manager");

        Assert.True(role.IsActive);
        Assert.False(role.IsBuiltIn);
        Assert.Empty(role.EffectivePermissions());

        // The code is the token contract, so it is normalized once here rather than at every comparison.
        Assert.Equal("seller_manager", role.Code);
    }

    [Fact]
    public void A_built_in_role_is_marked_as_one()
    {
        var role = Role.DefineBuiltIn(Guid.NewGuid(), Scope, "tenant_admin", "Administrator");

        Assert.True(role.IsBuiltIn);
    }

    [Fact]
    public void Granting_the_same_permission_twice_is_refused()
    {
        var role = Role.Define(Guid.NewGuid(), Scope, "seller_manager", "Seller manager");
        role.Grant("seller.order.read", Now, Actor);

        var again = role.Grant("seller.order.read", Now.AddMinutes(1), Actor);

        // Reported rather than ignored: a caller that cannot tell whether it already holds a permission will
        // keep asking, and a silent success hides that from whoever is diagnosing the grant.
        Assert.True(again.IsFailure);
        Assert.Equal(AuthorizationErrors.PermissionAlreadyGrantedCode, again.FirstError.Code);
        Assert.Single(role.Permissions);
    }

    [Fact]
    public void A_revoked_grant_stops_authorizing_and_is_kept_for_history()
    {
        var role = Role.Define(Guid.NewGuid(), Scope, "seller_manager", "Seller manager");
        role.Grant("seller.order.read", Now, Actor);

        var revoked = role.Revoke("seller.order.read", Now.AddHours(1), Actor);

        Assert.True(revoked.IsSuccess);
        Assert.False(role.HasPermission("seller.order.read"));
        Assert.Empty(role.EffectivePermissions());

        var grant = Assert.Single(role.Permissions);
        Assert.True(grant.IsRevoked);
        Assert.Equal(Now.AddHours(1), grant.RevokedAt);
        Assert.Equal(Actor, grant.RevokedBy);
        Assert.Equal(Actor, grant.GrantedBy);
    }

    [Fact]
    public void Revoking_a_permission_the_role_does_not_hold_is_refused()
    {
        var role = Role.Define(Guid.NewGuid(), Scope, "seller_manager", "Seller manager");

        var revoked = role.Revoke("seller.order.read", Now, Actor);

        Assert.True(revoked.IsFailure);
        Assert.Equal(AuthorizationErrors.PermissionNotGrantedCode, revoked.FirstError.Code);
    }

    [Fact]
    public void Revoking_twice_is_refused_rather_than_re_stamping_the_grant()
    {
        var role = Role.Define(Guid.NewGuid(), Scope, "seller_manager", "Seller manager");
        role.Grant("seller.order.read", Now, Actor);
        role.Revoke("seller.order.read", Now.AddHours(1), Actor);

        var again = role.Revoke("seller.order.read", Now.AddHours(2), Actor);

        // The second revocation would otherwise overwrite the first revocation's actor and timestamp, and the
        // history would claim the grant was withdrawn by whoever ran last.
        Assert.True(again.IsFailure);
        Assert.Equal(Now.AddHours(1), Assert.Single(role.Permissions).RevokedAt);
    }

    [Fact]
    public void A_retired_role_refuses_further_grants()
    {
        var role = Role.Define(Guid.NewGuid(), Scope, "seller_manager", "Seller manager");
        role.Grant("seller.order.read", Now, Actor);

        role.Retire();
        var granted = role.Grant("seller.order.write", Now, Actor);

        Assert.True(granted.IsFailure);
        Assert.Equal(AuthorizationErrors.RoleNotAssignableCode, granted.FirstError.Code);

        // The grants it already had are untouched: retiring makes a role unassignable, it does not silently
        // strip the permissions of everyone already holding it.
        Assert.Single(role.EffectivePermissions());
    }

    [Fact]
    public void A_retired_role_can_be_reactivated()
    {
        var role = Role.Define(Guid.NewGuid(), Scope, "seller_manager", "Seller manager");
        role.Retire();

        var activated = role.Activate();

        Assert.True(activated.IsSuccess);
        Assert.True(role.IsActive);
    }

    [Fact]
    public void Renaming_a_role_never_changes_its_code()
    {
        var role = Role.Define(Guid.NewGuid(), Scope, "seller_manager", "Seller manager");

        role.Rename("Regional seller manager", "Owns the northern region");

        // Tokens already reference the code. Changing it here would strip the permissions of every identity
        // holding the role, without any of them being told.
        Assert.Equal("seller_manager", role.Code);
        Assert.Equal("Regional seller manager", role.Name);
    }
}
