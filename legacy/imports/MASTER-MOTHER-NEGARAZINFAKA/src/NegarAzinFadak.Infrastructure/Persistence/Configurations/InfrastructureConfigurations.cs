using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace NegarAzinFadak.Infrastructure.Persistence.Configurations;

/// <summary>
/// Outbox rows are infrastructure state, not tenant-owned aggregates: a publisher must be able to read
/// every organization's pending events from a single queue, so no tenant filter is applied here. The
/// originating coordinates travel on the row itself and are restored by the consumer.
/// </summary>
internal sealed class OutboxMessageConfiguration : IEntityTypeConfiguration<OutboxMessageEntity>
{
    public void Configure(EntityTypeBuilder<OutboxMessageEntity> builder)
    {
        builder.ToTable("OutboxMessages");
        builder.HasKey(message => message.Id);
        builder.Property(message => message.EventId).IsRequired();
        builder.Property(message => message.EventType).HasMaxLength(512).IsRequired();
        builder.Property(message => message.Payload).IsRequired();
        builder.Property(message => message.Scope).HasMaxLength(80).IsRequired();
        builder.Property(message => message.LastError).HasMaxLength(1024);

        // The dispatcher's read is always "undispatched, due now, under the attempt ceiling, oldest first".
        builder.HasIndex(message => new { message.DispatchedAt, message.NextAttemptAt });
        builder.HasIndex(message => message.EventId).IsUnique();
    }
}

/// <summary>
/// Rate-limit counters are deliberately not tenant-scoped: an abuse budget must be spent on the abuse
/// target (a mobile number, an IP), not on an organization, so limiting must hold even when the
/// attacker rotates organizational context.
/// </summary>
internal sealed class RateLimitCounterConfiguration : IEntityTypeConfiguration<RateLimitCounterEntity>
{
    public void Configure(EntityTypeBuilder<RateLimitCounterEntity> builder)
    {
        builder.ToTable("RateLimitCounters");
        builder.HasKey(counter => counter.Key);
        builder.Property(counter => counter.Key).HasMaxLength(256);
        builder.HasIndex(counter => counter.WindowStartedAt);
    }
}
