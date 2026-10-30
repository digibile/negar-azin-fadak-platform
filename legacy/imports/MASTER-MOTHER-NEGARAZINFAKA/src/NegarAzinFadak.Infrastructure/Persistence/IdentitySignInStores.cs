using Microsoft.EntityFrameworkCore;
using NegarAzinFadak.Application.Identity;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Identity.Domain.Users;
using NegarAzinFadak.Organization.Domain.Roles;

namespace NegarAzinFadak.Infrastructure.Persistence;

/// <summary>Read side of the two lookups sign-in performs before a tenant is known.</summary>
/// <remarks>
/// The global query filter treats an unresolved session as a platform-level operation and lets it see every
/// tenant, which is the correct behaviour for authentication: the caller has not yet proved which
/// organization they belong to. Both queries therefore narrow explicitly rather than relying on that
/// default — by a globally unique mobile number, and by an organization identifier the identity itself
/// carries — so the permissiveness of an anonymous session is never the thing that limits the result.
/// </remarks>
public sealed class EfCoreIdentitySignInDirectory(NegarAzinFadakDbContext context) : IIdentitySignInDirectory
{
    private readonly NegarAzinFadakDbContext _context = Guard.AgainstNull(context);

    /// <inheritdoc />
    public Task<User?> FindByMobileAsync(string mobile, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(mobile);

        // Compared as the mapped type rather than through a string-typed shadow property. The column holds the
        // normalized form of the value object, and letting the value converter run on both sides of the
        // comparison is what makes this an indexable equality against the stored mobile number. Reaching for
        // the raw string instead hands the converter a value of the wrong type and fails at execution.
        return _context.Users
            .IgnoreQueryFilters()
            .Include(user => user.Roles)
            .Include(user => user.Profile)
            .FirstOrDefaultAsync(
                user => user.Mobile == MobileNumber.Create(mobile),
                cancellationToken);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<Role>> ListOrganizationRolesAsync(
        TenantScope organizationScope,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(organizationScope);

        if (organizationScope.IsEmpty)
        {
            return [];
        }

        return await _context.Roles
            .IgnoreQueryFilters()
            .Include(role => role.Permissions)
            .Where(role => EF.Property<Guid>(
                role,
                NegarAzinFadakDbContext.OrganizationIdColumn) == organizationScope.OrganizationId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
    }
}
