using Microsoft.EntityFrameworkCore;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Auditing;
using NegarAzinFadak.Core.Paging;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Tenancy;

namespace NegarAzinFadak.Infrastructure.Persistence;

/// <summary>
/// Audit trail over the platform database.
/// </summary>
/// <remarks>
/// <para>
/// A write is <c>Add</c>ed and not saved here. The record therefore travels in the caller's change tracker
/// and commits with the business change that justified it — an audited change and its record are then
/// atomic by construction, rather than by the service remembering to wrap two saves in a transaction.
/// </para>
/// <para>
/// Reads are tenant-pinned, and the pin is an equality on the isolation column, never the absence of a
/// predicate. <see cref="TenantScope.None"/> therefore means "the platform's own lines" rather than "all of
/// them": a caller that loses its tenant context mid-request ends up reading nothing, never another
/// organization's history. Refusing the empty scope outright was considered and rejected, because platform
/// work is audited too and a record nobody can read is not evidence of anything.
/// </para>
/// </remarks>
public sealed class EfCoreAuditTrail(NegarAzinFadakDbContext context) : IAuditTrail
{
    private readonly NegarAzinFadakDbContext _context = Guard.AgainstNull(context);

    /// <inheritdoc />
    public Task RecordAsync(AuditRecord record, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(record);

        if (record.Id == Guid.Empty)
        {
            return Task.FromException(new ArgumentException("An audit record needs an identifier.", nameof(record)));
        }

        _context.AuditRecords.Add(record);
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task RecordManyAsync(IReadOnlyCollection<AuditRecord> records, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(records);

        if (records.Count == 0)
        {
            return Task.CompletedTask;
        }

        foreach (var record in records)
        {
            if (record.Id == Guid.Empty)
            {
                return Task.FromException(new ArgumentException("An audit record needs an identifier.", nameof(records)));
            }
        }

        _context.AuditRecords.AddRange(records);
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public async Task<PagedResult<AuditRecord>> QueryAsync(AuditQuery query, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(query);

        var records = _context.AuditRecords
            .AsNoTracking()
            .Where(record => EF.Property<Guid>(record, NegarAzinFadakDbContext.OrganizationIdColumn) == query.Scope.OrganizationId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.ResourceType))
        {
            var resourceType = query.ResourceType.Trim();
            records = records.Where(record => record.ResourceType == resourceType);
        }

        if (!string.IsNullOrWhiteSpace(query.ResourceId))
        {
            var resourceId = query.ResourceId.Trim();
            records = records.Where(record => record.ResourceId == resourceId);
        }

        if (!string.IsNullOrWhiteSpace(query.Action))
        {
            var action = query.Action.Trim();
            records = records.Where(record => record.Action == action);
        }

        if (query.ActorUserId is { } actorUserId)
        {
            records = records.Where(record => record.ActorUserId == actorUserId);
        }

        if (query.From is { } from)
        {
            records = records.Where(record => record.OccurredAt >= from);
        }

        if (query.To is { } to)
        {
            records = records.Where(record => record.OccurredAt < to);
        }

        var page = query.Page ?? new PageRequest();
        var total = await records.LongCountAsync(cancellationToken).ConfigureAwait(false);

        // Newest first, with the identifier as the tie-breaker: two actions recorded in the same instant
        // must still come back in a stable order, or paging through the trail repeats or skips a line.
        var items = await records
            .OrderByDescending(record => record.OccurredAt)
            .ThenBy(record => record.Id)
            .Skip(page.Skip)
            .Take(page.PageSize)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return new PagedResult<AuditRecord>(items, page.PageNumber, page.PageSize, total);
    }
}
