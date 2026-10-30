using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using NegarAzinFadak.Core.Tenancy;

namespace NegarAzinFadak.Infrastructure.Persistence;

/// <summary>
/// Builds the tenant isolation predicate shared by the global query filter and
/// <see cref="NegarAzinFadakDbContext.WithinTenant{TEntity}"/>.
/// </summary>
/// <remarks>
/// <para>
/// Isolation reads a dedicated <see cref="IsolationColumns.Organization"/> Guid column rather than a member
/// of <see cref="ITenantScoped.Scope"/>, for two structural reasons. A member access on a converted value
/// object cannot be translated to SQL, so a predicate written as <c>entity.Scope.OrganizationId</c> fails
/// to translate and throws for every caller. And a real Guid column can be compared and indexed, whereas a
/// single serialized scope string can only ever be prefix-matched.
/// </para>
/// <para>
/// Scope of this filter is the organization only. <see cref="TenantScope"/> also carries company, brand,
/// branch and store, and <see cref="TenantScope.Includes"/> defines the intended narrowing rules, but the
/// platform issues organization-level sessions only, so filtering below the organization would change no
/// current result while making every read harder to reason about. Narrowing the filter to the levels the
/// platform actually uses is recorded in <c>docs/adr/tenant-isolation-levels.md</c>.
/// </para>
/// </remarks>
internal static class TenantIsolationFilter
{
    /// <summary>
    /// Shadow-property names holding the isolation key. It duplicates <see cref="TenantScope"/> on the row,
    /// but as a plain scalar the database can filter and index it.
    /// </summary>
    internal static class IsolationColumns
    {
        internal const string Organization = nameof(TenantScope.OrganizationId);
    }

    /// <summary>Adds the isolation column and its index to every tenant-owned entity.</summary>
    internal static void ApplyColumns(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes()
                     .Where(type => typeof(ITenantScoped).IsAssignableFrom(type.ClrType))
                     .ToList())
        {
            modelBuilder.Entity(entityType.ClrType)
                .Property<Guid>(IsolationColumns.Organization)
                .IsRequired();

            modelBuilder.Entity(entityType.ClrType)
                .HasIndex(IsolationColumns.Organization);
        }
    }

    /// <summary>
    /// Builds the visibility predicate for one row parameter against the current session's scope.
    /// </summary>
    /// <param name="parameter">Row parameter of the query.</param>
    /// <param name="context">Context supplying the caller's ambient scope.</param>
    /// <returns>
    /// A predicate that is always true when the session has no resolved organization, and otherwise
    /// restricts the row to the caller's own organization.
    /// </returns>
    internal static Expression BuildVisibility(
        ParameterExpression parameter,
        NegarAzinFadakDbContext context)
    {
        ArgumentNullException.ThrowIfNull(parameter);
        ArgumentNullException.ThrowIfNull(context);

        var callerOrganization = Expression.Property(
            Expression.Property(Expression.Constant(context), nameof(NegarAzinFadakDbContext.Scope)),
            nameof(TenantScope.OrganizationId));

        // An unresolved session is a platform-level background job, which is deliberately cross-tenant.
        var isUnresolved = Expression.Equal(callerOrganization, Expression.Constant(Guid.Empty));

        var matches = Expression.Equal(RowOrganization(parameter), callerOrganization);

        return Expression.OrElse(isUnresolved, matches);
    }

    private static Expression RowOrganization(ParameterExpression parameter)
        => Expression.Call(
            typeof(EF).GetMethod(nameof(EF.Property), System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static)!
                .MakeGenericMethod(typeof(Guid)),
            parameter,
            Expression.Constant(IsolationColumns.Organization));
}
