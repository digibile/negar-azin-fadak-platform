using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using NegarAzinFadak.Core.Tenancy;
using OrganizationDomain = NegarAzinFadak.Organization.Domain;

namespace NegarAzinFadak.Infrastructure.Persistence;

/// <summary>
/// Keeps the indexed organization column in step with the tenant that is writing.
/// </summary>
/// <remarks>
/// The column is stamped from the ambient <see cref="ITenantContext"/> rather than from the aggregate's
/// own <see cref="ITenantScoped.Scope"/>, and the difference is deliberate. A row's isolation key answers
/// "which tenant may read this?", and the only party entitled to answer that is the session that wrote
/// the row. Stamping the entity's own scope instead would let a session choose its target: a caller
/// holding a company-scoped context could construct an aggregate carrying a foreign organization, write
/// it, and have it appear in that foreign tenant's listings.
///
/// Consequence: a write that carries a scope the session does not hold is not silently granted into the
/// target tenant. It is attributed to the writer, so it stays invisible to both the writer and the
/// intended owner until it is reviewed — quarantined rather than escalated. Legitimate cross-tenant
/// administration runs through a session that actually holds the target scope, and platform-level
/// background work runs unscoped and therefore falls back to the aggregate's own organization.
/// </remarks>
/// <remarks>
/// One case is neither cross-tenant administration nor background work: creating a tenant. A session
/// provisioning a tenant cannot hold the scope of a tenant that does not exist yet, and the tenant's
/// configuration, roles and navigation all have to be written in the same save that creates it. Attributing
/// those rows to the writer would leave a successfully provisioned tenant whose configuration and base
/// navigation nobody can read, so rows belonging to an organization this very save is creating keep their
/// own organization. The exemption is limited to that: an organization has to be added in this save, so a
/// session still cannot choose an existing tenant as the target of a write.
/// </remarks>
public sealed class TenantScopeInterceptor(ITenantContext tenantContext) : SaveChangesInterceptor
{
    /// <inheritdoc />
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        Stamp(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    /// <inheritdoc />
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        Stamp(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void Stamp(DbContext? context)
    {
        if (context is null)
        {
            return;
        }

        var sessionOrganization = tenantContext.Scope.OrganizationId;
        var organizationsBeingCreated = context.ChangeTracker
            .Entries<OrganizationDomain.Organization>()
            .Where(entry => entry.State is EntityState.Added)
            .Select(entry => entry.Entity.Id)
            .ToHashSet();

        foreach (var entry in context.ChangeTracker.Entries())
        {
            if (entry.State is not (EntityState.Added or EntityState.Modified))
            {
                continue;
            }

            if (entry.Entity is not ITenantScoped scoped)
            {
                continue;
            }

            var property = entry.Property(NegarAzinFadakDbContext.OrganizationIdColumn);
            if (property.Metadata.IsPrimaryKey())
            {
                continue;
            }

            // An unresolved session is platform-level background work, which legitimately writes across
            // organizations, so it falls back to the organization the aggregate itself belongs to. A row of a
            // tenant being created by this save keeps its own organization too: the writer cannot hold that
            // scope yet, and attributing the new tenant's rows to the writer would strand them.
            property.CurrentValue = sessionOrganization == Guid.Empty
                                   || organizationsBeingCreated.Contains(scoped.Scope.OrganizationId)
                ? scoped.Scope.OrganizationId
                : sessionOrganization;
        }
    }

}
