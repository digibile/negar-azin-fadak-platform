using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NegarAzinFadak.Core.Auditing;

namespace NegarAzinFadak.Infrastructure.Persistence.Configurations;

/// <summary>
/// Append-only mapping of the audit trail.
/// </summary>
/// <remarks>
/// The record is tenant-owned, so it carries the platform's global filter like every other row in scope: a
/// request scoped to one organization can only ever read its own history, and a platform operator reads
/// across organizations by holding an empty scope. The query service still states the tenant in its
/// <c>WHERE</c> clause, because it is also called by background work that has no request in scope and must
/// not inherit "whatever the ambient scope happens to be".
/// </remarks>
internal sealed class AuditRecordConfiguration : IEntityTypeConfiguration<AuditRecord>
{
    private static string? Serialize(IReadOnlyDictionary<string, string?>? attributes)
        => attributes == null ? null : JsonSerializer.Serialize(attributes);

    public void Configure(EntityTypeBuilder<AuditRecord> builder)
    {
        builder.ToTable("AuditRecords");
        builder.HasKey(record => record.Id);
        builder.Property(record => record.Action).HasMaxLength(128).IsRequired();
        builder.Property(record => record.ResourceType).HasMaxLength(128).IsRequired();
        builder.Property(record => record.ResourceId).HasMaxLength(128).IsRequired();
        builder.Property(record => record.CorrelationId).HasMaxLength(128).IsRequired();
        builder.Property(record => record.Outcome).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(record => record.ReasonCode).HasMaxLength(128);
        builder.Property(record => record.Scope).IsRequired();


        // The map is compared by its serialized form, so an in-place change is visible to change tracking
        // instead of the column silently keeping the previous attributes.
        builder.Property(record => record.Attributes)
            .HasConversion(
                attributes => attributes == null ? null : JsonSerializer.Serialize(attributes),
                value => string.IsNullOrWhiteSpace(value)
                    ? null
                    : JsonSerializer.Deserialize<Dictionary<string, string?>>(value))
            .HasMaxLength(4096)
            .Metadata.SetValueComparer(new ValueComparer<IReadOnlyDictionary<string, string?>?>(
                (left, right) => string.Equals(Serialize(left), Serialize(right), StringComparison.Ordinal),
                value => StringComparer.Ordinal.GetHashCode(Serialize(value) ?? string.Empty),
                value => JsonSerializer.Deserialize<Dictionary<string, string?>>(Serialize(value) ?? "null")));

        // An audit question is almost always "what happened to this resource in this window", and the
        // second is "who did what in this window". Both are served by these two indexes; the trail is
        // write-heavy on purpose, so no further index is maintained for it.
        builder.HasIndex(record => new { record.ResourceType, record.ResourceId, record.OccurredAt });
        builder.HasIndex(record => new { record.ActorUserId, record.OccurredAt });
        builder.HasIndex(record => new { record.OccurredAt });
    }
}
