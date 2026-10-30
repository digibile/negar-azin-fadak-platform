using Microsoft.EntityFrameworkCore;
using NegarAzinFadak.Core.Messaging;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Infrastructure.Persistence;

namespace NegarAzinFadak.Infrastructure.Tests;

/// <summary>
/// Integration events must be written inside the business transaction and delivered at least once, so a
/// committed identity change can never lose its downstream notification.
/// </summary>
public sealed class EfCoreOutboxTests
{
    private static readonly TenantScope Scope = new(Guid.Parse("aaaaaaaa-0000-0000-0000-00000000000a"));

    [Fact]
    public async Task Enqueued_events_are_readable_until_they_are_dispatched()
    {
        using var factory = new SqliteContextFactory(Scope);
        var outbox = new EfCoreOutbox(factory.Context, new FixedClock(SqliteContextFactory.FixedTime));
        var integrationEvent = new SampleIntegrationEvent(Guid.NewGuid(), SqliteContextFactory.FixedTime, Scope);

        await outbox.EnqueueAsync(integrationEvent);
        await factory.Context.SaveChangesAsync();

        var pending = await outbox.ReadPendingAsync(10);

        var message = Assert.Single(pending);
        Assert.Equal(integrationEvent.EventId, message.EventId);
        Assert.Contains(nameof(SampleIntegrationEvent), message.EventType, StringComparison.Ordinal);
        Assert.Contains(SampleIntegrationEvent.Marker, message.Payload, StringComparison.Ordinal);
        Assert.Equal(0, message.Attempts);

        await outbox.MarkDispatchedAsync(message.Id);
        await factory.Context.SaveChangesAsync();

        Assert.Empty(await outbox.ReadPendingAsync(10));
    }

    [Fact]
    public async Task A_failed_delivery_is_retried_later_with_a_recorded_reason()
    {
        using var factory = new SqliteContextFactory(Scope);
        var clock = new MutableClock(SqliteContextFactory.FixedTime);
        var outbox = new EfCoreOutbox(factory.Context, clock);

        await outbox.EnqueueAsync(new SampleIntegrationEvent(Guid.NewGuid(), clock.UtcNow, Scope));
        await factory.Context.SaveChangesAsync();

        var message = Assert.Single(await outbox.ReadPendingAsync(10));
        await outbox.MarkFailedAsync(message.Id, "gateway unavailable");
        await factory.Context.SaveChangesAsync();

        Assert.Empty(await outbox.ReadPendingAsync(10));

        var stored = Assert.Single(await factory.Context.OutboxMessages.ToListAsync());
        Assert.Equal(1, stored.Attempts);
        Assert.Equal("gateway unavailable", stored.LastError);
        Assert.True(stored.NextAttemptAt > clock.UtcNow);

        clock.Advance(TimeSpan.FromHours(1));
        var retried = Assert.Single(await outbox.ReadPendingAsync(10));
        Assert.Equal(message.EventId, retried.EventId);
        Assert.Equal(1, retried.Attempts);
    }

    [Fact]
    public async Task Events_of_different_tenants_keep_their_own_scope()
    {
        using var factory = new SqliteContextFactory(Scope);
        var otherScope = Scope with { CompanyId = Guid.NewGuid() };

        var outbox = new EfCoreOutbox(factory.Context, new FixedClock(SqliteContextFactory.FixedTime));
        await outbox.EnqueueAsync(new SampleIntegrationEvent(Guid.NewGuid(), SqliteContextFactory.FixedTime, Scope));
        await outbox.EnqueueAsync(new SampleIntegrationEvent(Guid.NewGuid(), SqliteContextFactory.FixedTime, otherScope));
        await factory.Context.SaveChangesAsync();

        var stored = await factory.Context.OutboxMessages.OrderBy(message => message.Scope).ToListAsync();

        Assert.Equal(2, stored.Count);
        Assert.Equal(Scope.OrganizationId, ValueConverterConfiguration.FromStorage(stored[0].Scope).OrganizationId);
        Assert.Equal(otherScope.CompanyId, ValueConverterConfiguration.FromStorage(stored[0].Scope).CompanyId);
    }

    private sealed record SampleIntegrationEvent(Guid EventId, DateTimeOffset OccurredAt, TenantScope Scope)
        : IntegrationEvent(EventId, OccurredAt, Scope)
    {
        public const string Marker = "identity-changed";

        public string Subject { get; init; } = Marker;
    }

    private sealed class MutableClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow { get; private set; } = now;

        public DateOnly Today => DateOnly.FromDateTime(UtcNow.UtcDateTime);

        public void Advance(TimeSpan delta) => UtcNow += delta;
    }
}
