using Microsoft.EntityFrameworkCore;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Organization.Domain.Events;
using NegarAzinFadak.Organization.Domain.Roles;

namespace NegarAzinFadak.Infrastructure.Tests;

/// <summary>
/// Publication is atomic with the state change, and it happens in the only order that is safe.
/// </summary>
/// <remarks>
/// The two failure modes this guards against are symmetric and both fatal: publishing before the commit
/// announces a change that may still roll back, and saving before publishing loses the event in a crash,
/// leaving a downstream module permanently unaware that a tenant was suspended. The only safe arrangement
/// is the event row inside the same transaction as the change.
/// </remarks>
public sealed class DomainEventOutboxTests
{
    private static readonly TenantScope Scope = new(Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001"));
    private static readonly DateTimeOffset Now = new(2026, 3, 1, 8, 30, 0, TimeSpan.Zero);

    [Fact]
    public async Task An_integration_event_reaches_the_outbox_in_the_same_save_as_the_aggregate()
    {
        using var factory = new SqliteContextFactory(Scope);
        var role = NewRole();
        factory.Context.Roles.Add(role);
        var eventId = Guid.NewGuid();
        role.RaiseDomainEvent(new TenantActivatedIntegration(eventId, Now, Scope, Guid.NewGuid(), "alpha"));

        await factory.Context.SaveChangesAsync();

        // One SaveChanges wrote both. There is no window in which the role exists and the event does not,
        // because neither row is committed independently of the other.
        var message = Assert.Single(await factory.Context.OutboxMessages.ToListAsync());
        Assert.Equal(eventId, message.EventId);
        Assert.Equal(typeof(TenantActivatedIntegration).AssemblyQualifiedName, message.EventType);
        Assert.Contains("alpha", message.Payload, StringComparison.Ordinal);
    }

    [Fact]
    public async Task An_integration_event_is_not_also_dispatched_in_process()
    {
        using var factory = new SqliteContextFactory(Scope);
        var role = NewRole();
        factory.Context.Roles.Add(role);
        role.RaiseDomainEvent(new TenantSuspendedIntegration(Guid.NewGuid(), Now, Scope, Guid.NewGuid(), "alpha", "audit"));

        await factory.Context.SaveChangesAsync();

        // Its contract is the outbox, not an in-process handler. Delivering it in-process as well would let a
        // module react to a tenant being suspended before the transaction that suspended it is durable.
        Assert.Empty(factory.Dispatcher.Events);
    }

    [Fact]
    public async Task A_pure_domain_event_is_dispatched_in_process_and_kept_out_of_the_outbox()
    {
        using var factory = new SqliteContextFactory(Scope);
        var role = NewRole();
        factory.Context.Roles.Add(role);
        role.RaiseDomainEvent(new RolePermissionsChanged(Guid.NewGuid(), Now, role.Id, Scope, role.Code, "seller.order.read"));

        await factory.Context.SaveChangesAsync();

        // Nothing outside this process is waiting on it, so it is delivered directly. Filing it in the outbox
        // as well would leave a row nothing ever reads.
        Assert.Single(factory.Dispatcher.Events);
        Assert.Empty(await factory.Context.OutboxMessages.ToListAsync());
    }

    [Fact]
    public async Task Events_are_drained_once_so_a_later_save_does_not_republish_them()
    {
        using var factory = new SqliteContextFactory(Scope);
        var role = NewRole();
        factory.Context.Roles.Add(role);
        var eventId = Guid.NewGuid();
        role.RaiseDomainEvent(new RoleChangedIntegration(eventId, Now, Scope, role.Id, role.Code));

        await factory.Context.SaveChangesAsync();
        await factory.Context.SaveChangesAsync();

        // Draining is what makes this safe. Without it, every later save of the same tracked aggregate would
        // append a second copy of the event, and the consumer's deduplication would be the only thing
        // standing between a routine edit and a duplicated business effect.
        Assert.Single(await factory.Context.OutboxMessages.ToListAsync());
    }

    [Fact]
    public async Task An_event_raised_on_an_otherwise_unchanged_aggregate_is_still_published()
    {
        using var factory = new SqliteContextFactory(Scope);
        var role = NewRole();
        factory.Context.Roles.Add(role);
        await factory.Context.SaveChangesAsync();
        factory.Context.ChangeTracker.Clear();

        var reloaded = await factory.Context.Roles.FirstAsync();
        reloaded.RaiseDomainEvent(new RoleChangedIntegration(Guid.NewGuid(), Now, Scope, reloaded.Id, reloaded.Code));

        // The reloaded role is Unchanged, so a scan that only looked at Added/Modified/Deleted would find
        // nothing and drop the event. The use case that raised it would have no way of knowing.
        Assert.Equal(EntityState.Unchanged, factory.Context.Entry(reloaded).State);
        await factory.Context.SaveChangesAsync();

        Assert.Single(await factory.Context.OutboxMessages.ToListAsync());
    }

    [Fact]
    public async Task An_event_raised_on_a_tenant_outside_the_current_scope_still_carries_its_own_scope()
    {
        using var factory = new SqliteContextFactory(Scope);
        var role = NewRole();
        factory.Context.Roles.Add(role);
        var beta = new TenantScope(Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002"));
        role.RaiseDomainEvent(new RoleChangedIntegration(Guid.NewGuid(), Now, beta, role.Id, role.Code));

        await factory.Context.SaveChangesAsync();

        // The outbox row is stamped with the session's organization, but the payload keeps the scope the
        // aggregate was acting in. A consumer therefore reads the scope from the event, not from the row.
        var message = Assert.Single(await factory.Context.OutboxMessages.ToListAsync());
        Assert.Contains(beta.OrganizationId.ToString(), message.Payload, StringComparison.OrdinalIgnoreCase);
    }

    private static Role NewRole() => Role.Define(Guid.NewGuid(), Scope, "seller_manager", "Seller manager");
}
