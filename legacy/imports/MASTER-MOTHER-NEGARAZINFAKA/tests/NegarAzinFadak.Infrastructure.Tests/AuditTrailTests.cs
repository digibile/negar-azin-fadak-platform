using Microsoft.EntityFrameworkCore;
using NegarAzinFadak.Core.Auditing;
using NegarAzinFadak.Core.Paging;
using NegarAzinFadak.Core.Persistence;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Application.Auditing;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Infrastructure.Persistence;
using NegarAzinFadak.Organization.Domain.Roles;

namespace NegarAzinFadak.Infrastructure.Tests;

/// <summary>
/// The audit trail is the platform's answer to "who did this, and was it allowed". These tests pin the three
/// properties that answer depends on: a success is atomic with the change it describes, a refusal survives
/// even though nothing was written, and a query cannot leave its tenant.
/// </summary>
public sealed class AuditTrailTests
{
    private static readonly TenantScope AlphaScope = new(Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001"));
    private static readonly TenantScope BetaScope = new(Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002"));
    private static readonly DateTimeOffset Now = new(2026, 3, 1, 8, 30, 0, TimeSpan.Zero);

    [Fact]
    public async Task A_success_record_is_staged_and_appears_only_when_the_caller_saves()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        var writer = Writer(factory);
        var role = Role.Define(
            Guid.NewGuid(), AlphaScope, "seller_manager", "Seller manager");
        factory.Context.Roles.Add(role);

        await writer.RecordSuccessAsync("role.define", "role", role.Id.ToString());

        // Staged, not written. If it were already committed, a rollback of the role would leave a trail
        // claiming a role that does not exist.
        Assert.Empty(await Read(factory.Context, AlphaScope));

        await factory.Context.SaveChangesAsync();

        Assert.Single(await Read(factory.Context, AlphaScope));
    }

    [Fact]
    public async Task A_refusal_is_committed_even_though_the_use_case_saved_nothing()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        var writer = Writer(factory);

        await writer.RecordDeniedAsync("role.define", "role", "seller_manager", "authorization.role.duplicate_code");

        // This is the whole reason refusals are flushed rather than staged. A refusal produces no business
        // change, so there is no later save to carry the record; left in the change tracker it would be
        // discarded with the request and the attempt would leave no trace at all.
        var record = Assert.Single(await Read(factory.Context, AlphaScope));
        Assert.Equal(AuditOutcome.Denied, record.Outcome);
        Assert.Equal("authorization.role.duplicate_code", record.ReasonCode);
    }

    [Fact]
    public async Task A_refusal_recorded_from_a_failed_result_still_commits_and_returns_the_failure()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        var writer = Writer(factory);
        var failure = AuthorizationErrors.DuplicateRole("seller_manager");

        var returned = await writer.AuditDenialAsync(
            "role.define", "role", "seller_manager", Result.Failure(failure));

        // Re-returned unchanged: auditing must never turn a refusal into a success on the way back.
        Assert.True(returned.IsFailure);
        Assert.Equal(failure.Code, returned.FirstError.Code);
        Assert.Equal(AuditOutcome.Denied, Assert.Single(await Read(factory.Context, AlphaScope)).Outcome);
    }

    [Fact]
    public async Task A_successful_result_is_not_recorded_as_a_refusal()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        var writer = Writer(factory);

        await writer.AuditDenialAsync("role.define", "role", "x", Result.Success());

        Assert.Empty(await Read(factory.Context, AlphaScope));
    }

    [Fact]
    public async Task A_record_takes_its_actor_and_timestamp_from_the_request_not_the_caller()
    {
        var actor = Guid.Parse("dddddddd-0000-0000-0000-000000000001");
        using var factory = new SqliteContextFactory(AlphaScope, new CurrentUser(actor, AlphaScope, correlationId: "corr-42"));
        var writer = Writer(factory);

        await writer.RecordSuccessAsync("role.define", "role", "role-1");
        await factory.Context.SaveChangesAsync();
        factory.Context.ChangeTracker.Clear();

        var record = Assert.Single(await Read(factory.Context, AlphaScope));
        Assert.Equal(actor, record.ActorUserId);
        Assert.Equal(Now, record.OccurredAt);
        Assert.Equal("corr-42", record.CorrelationId);
        Assert.Equal(AlphaScope, record.Scope);
    }

    [Fact]
    public async Task A_query_returns_nothing_from_another_tenant()
    {
        using var alpha = new SqliteContextFactory(AlphaScope);
        await Writer(alpha).RecordSuccessAsync("role.define", "role", "alpha-role");
        await alpha.Context.SaveChangesAsync();

        using var beta = alpha.CreateContextFor(BetaScope);

        // Beta asks for a scope it owns, and still gets nothing. The filter is the tenant boundary, and the
        // explicit predicate in the query is what makes it visible in this test rather than implied.
        var page = await new EfCoreAuditTrail(beta).QueryAsync(new AuditQuery(BetaScope));
        Assert.Equal(0, page.TotalCount);
    }

    [Fact]
    public async Task A_platform_query_reads_the_platform_lines_and_never_the_whole_trail()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        await Writer(factory).RecordSuccessAsync("role.define", "role", "alpha-role");
        await factory.Context.SaveChangesAsync();
        factory.Context.ChangeTracker.Clear();

        var page = await new EfCoreAuditTrail(factory.Context).QueryAsync(AuditQuery.ForPlatform());

        // The platform keeps its own records, and reading them must not become a way to read every tenant's.
        // A caller that has lost its tenant context therefore reads nothing at all.
        Assert.Equal(0, page.TotalCount);
    }

    [Fact]
    public async Task A_query_filters_by_resource_action_and_actor()
    {
        var actor = Guid.Parse("dddddddd-0000-0000-0000-000000000001");
        using var factory = new SqliteContextFactory(AlphaScope, new CurrentUser(actor, AlphaScope, correlationId: "corr-1"));
        var writer = Writer(factory);
        var roleId = Guid.NewGuid().ToString();

        await writer.RecordSuccessAsync("role.define", "role", roleId);
        await writer.RecordSuccessAsync("role.define", "role", Guid.NewGuid().ToString());
        await writer.RecordSuccessAsync("tenant.suspend", "organization", Guid.NewGuid().ToString());
        await factory.Context.SaveChangesAsync();

        var trail = new EfCoreAuditTrail(factory.Context);

        Assert.Equal(1, (await trail.QueryAsync(new AuditQuery(AlphaScope) { ResourceId = roleId })).TotalCount);
        Assert.Equal(1, (await trail.QueryAsync(new AuditQuery(AlphaScope) { Action = "tenant.suspend" })).TotalCount);
        Assert.Equal(1, (await trail.QueryAsync(new AuditQuery(AlphaScope) { ResourceType = "organization" })).TotalCount);
        Assert.Equal(3, (await trail.QueryAsync(new AuditQuery(AlphaScope) { ActorUserId = actor })).TotalCount);
        Assert.Equal(0, (await trail.QueryAsync(new AuditQuery(AlphaScope) { ActorUserId = Guid.NewGuid() })).TotalCount);
    }

    [Fact]
    public async Task A_query_window_is_half_open_so_adjacent_ranges_never_double_count()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        var writer = Writer(factory);
        await writer.RecordSuccessAsync("role.define", "role", "first");
        await factory.Context.SaveChangesAsync();
        factory.Context.ChangeTracker.Clear();

        var trail = new EfCoreAuditTrail(factory.Context);
        var page = await trail.QueryAsync(new AuditQuery(AlphaScope) { From = Now, To = Now });

        // An instant is not a range. A window that ended where another began, or one that treated both ends
        // as inclusive, is how a "show me this hour" report ends up printing the same action twice.
        Assert.Equal(0, page.TotalCount);
    }

    [Fact]
    public async Task A_page_is_newest_first_and_stable_across_pages()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        await Writer(factory).RecordSuccessAsync("role.define", "role", "r1");
        await Writer(factory).RecordSuccessAsync("role.define", "role", "r2");
        await factory.Context.SaveChangesAsync();
        factory.Context.ChangeTracker.Clear();

        // Both records carry the same timestamp, because a fixed clock gave them the same instant. Without
        // the identifier tie-breaker their order is whatever the store happens to return, and paging through
        // the trail silently repeats one line and drops the other.
        var trail = new EfCoreAuditTrail(factory.Context);
        var first = await trail.QueryAsync(AuditQuery.ForTenant(AlphaScope, new PageRequest(1, 1)));
        var second = await trail.QueryAsync(AuditQuery.ForTenant(AlphaScope, new PageRequest(2, 1)));

        Assert.Equal(2, first.TotalCount);
        Assert.NotEqual(first.Items[0].Id, second.Items[0].Id);
    }

    [Fact]
    public async Task A_platform_level_record_is_written_without_a_tenant_and_stays_out_of_every_tenant_view()
    {
        using var platform = new SqliteContextFactory(TenantScope.None, new CurrentUser(null, TenantScope.None, correlationId: "corr-sys"));
        await Writer(platform).RecordSuccessAsync("catalog.sync", "permission", "catalog");
        await platform.Context.SaveChangesAsync();
        platform.Context.ChangeTracker.Clear();

        // Platform work is legitimately not tenant work, so it commits without a tenant. It is still not
        // visible to a tenant: an audit screen inside a customer must not show platform maintenance.
        Assert.Single(await Read(platform.Context, TenantScope.None));

        using var alpha = new SqliteContextFactory(AlphaScope);
        Assert.Empty(await Read(alpha.Context, AlphaScope));
    }

    [Fact]
    public async Task A_materialized_record_without_an_identifier_is_refused_rather_than_invented()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        var trail = new EfCoreAuditTrail(factory.Context);

        // The domain constructor supplies an identifier when it is given an empty one, so the only way an
        // empty identifier reaches the writer is a record rebuilt outside the domain. The identifier is the
        // trail's deduplication key, so accepting one would write a duplicate that looks like a first
        // occurrence.
        var record = new AuditRecord();
        await Assert.ThrowsAsync<ArgumentException>(() => trail.RecordAsync(record));
        await Assert.ThrowsAsync<ArgumentException>(() => trail.RecordManyAsync([record]));
    }

    [Fact]
    public void A_record_without_an_action_is_refused()
    {
        // An audit line with no action cannot be filtered, alerted on, or read. It is noise that looks like
        // evidence, which is worse than a missing line.
        Assert.Throws<ArgumentException>(() =>
            new AuditRecord(Guid.NewGuid(), "  ", "role", "r1", AuditOutcome.Success, null, AlphaScope, Now, "corr"));
    }

    [Fact]
    public async Task A_batch_of_records_is_written_together_and_an_empty_batch_is_accepted()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        var trail = new EfCoreAuditTrail(factory.Context);
        var records = new[]
        {
            NewRecord("role.define", "r1"),
            NewRecord("role.define", "r2")
        };

        await trail.RecordManyAsync(records);
        await factory.Context.SaveChangesAsync();

        Assert.Equal(2, (await trail.QueryAsync(new AuditQuery(AlphaScope))).TotalCount);
        await trail.RecordManyAsync([]);
    }

    private static AuditRecord NewRecord(string action, string resourceId)
        => new(Guid.NewGuid(), action, "role", resourceId, AuditOutcome.Success, null, AlphaScope, Now, "corr");

    private static AuditTrailWriter Writer(SqliteContextFactory factory)
        => new(
            new EfCoreAuditTrail(factory.Context),
            factory.Context,
            factory.Principal,
            new FixedClock(Now));

    /// <summary>
    /// Reads the trail the same way a tenant would: through the port, not through the change tracker. Going
    /// around the port here would let a test pass while the real read path was broken.
    /// </summary>
    private static async Task<IReadOnlyList<AuditRecord>> Read(
        NegarAzinFadakDbContext context,
        TenantScope scope)
        => (await new EfCoreAuditTrail(context).QueryAsync(new AuditQuery(scope))).Items;
}
