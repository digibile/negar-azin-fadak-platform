using Microsoft.EntityFrameworkCore;
using NegarAzinFadak.Application.Identity;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Paging;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Identity.Domain.Users;

namespace NegarAzinFadak.Infrastructure.Persistence;

/// <summary>
/// Read side of the central identity directory, as an administrator's screens use it.
/// </summary>
/// <remarks>
/// <para>
/// The scope arrives as a parameter and is applied as an explicit predicate on the isolation column, in the
/// same way <see cref="EfCoreOrganizationDirectory"/> does for the organizational tree. Ignoring the global
/// filter is deliberate: the filter resolves against the ambient session, which is correct for an
/// accidental query and wrong for a port that was handed a specific scope to answer for. Writing the
/// organization into the <c>WHERE</c> clause means the answer to "this tenant's identities" does not change
/// because of what the ambient context happens to be, which is what makes the behaviour testable.
/// </para>
/// <para>
/// The mobile lookup is the deliberate exception and says so on <see cref="MobileExistsAsync"/>.
/// </para>
/// </remarks>
public sealed class EfCoreIdentityDirectory(NegarAzinFadakDbContext context) : IIdentityDirectory
{
    private readonly NegarAzinFadakDbContext _context = Guard.AgainstNull(context);

    /// <inheritdoc />
    public async Task<PagedResult<User>> ListAsync(
        TenantScope scope,
        IdentityQuery query,
        PageRequest page,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(query);
        ArgumentNullException.ThrowIfNull(page);

        var users = OfTenant(scope);

        if (query.Status is { } status)
        {
            users = users.Where(user => user.Status == status);
        }

        if (query.IsIdentityVerified is { } verified)
        {
            users = users.Where(user => user.IsIdentityVerified == verified);
        }

        if (!string.IsNullOrWhiteSpace(query.Mobile))
        {
            // Compared through the value object so the stored converter runs on both sides. A raw string
            // comparison against the shadow column would not be an equality on the normalized form, and the
            // same number typed two ways would come back as two different people.
            if (!MobileNumber.TryCreate(query.Mobile, out var mobile, out _))
            {
                return PagedResult<User>.Empty(page);
            }

            users = users.Where(user => user.Mobile == mobile!);
        }

        if (!string.IsNullOrWhiteSpace(query.Text))
        {
            var text = query.Text.Trim();
            users = users.Where(user =>
                EF.Functions.Like(user.DisplayName, $"%{text}%")
                || (user.Profile != null
                    && (EF.Functions.Like(user.Profile.FirstName!, $"%{text}%")
                        || EF.Functions.Like(user.Profile.LastName!, $"%{text}%"))));
        }

        var total = await users.LongCountAsync(cancellationToken).ConfigureAwait(false);
        var items = await users
            .AsNoTracking()
            .Include(user => user.Profile)
            .Include(user => user.Roles)
            // Newest first, then by identifier so that two identities registered in the same millisecond
            // still have one fixed order. A directory whose order changes between two identical requests
            // cannot be paged: a record on page two of one call is on page one of the next.
            .OrderByDescending(user => user.CreatedAt)
            .ThenBy(user => user.Id)
            .Skip(page.Skip)
            .Take(page.PageSize)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return new PagedResult<User>(items, page.PageNumber, page.PageSize, total);
    }

    /// <inheritdoc />
    public Task<User?> FindByIdAsync(TenantScope scope, Guid userId, CancellationToken cancellationToken = default)
        => Readable(OfTenant(scope).Where(user => user.Id == userId))
            .FirstOrDefaultAsync(cancellationToken);

    /// <inheritdoc />
    public Task<User?> FindTrackedByIdAsync(
        TenantScope scope,
        Guid userId,
        CancellationToken cancellationToken = default)
        => Readable(OfTenant(scope).Where(user => user.Id == userId))
            .FirstOrDefaultAsync(cancellationToken);

    /// <inheritdoc />
    public Task<bool> MobileExistsAsync(string mobile, CancellationToken cancellationToken = default)
    {
        if (!MobileNumber.TryCreate(mobile, out var parsed, out _))
        {
            // A number that cannot be normalized cannot match a stored one, and constructing the value
            // object to find out would throw in a query that only ever needed to answer "no".
            return Task.FromResult(false);
        }

        return _context.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .AnyAsync(user => user.Mobile == parsed, cancellationToken);
    }

    /// <summary>
    /// The identities of one organization.
    /// </summary>
    /// <remarks>
    /// Filtered on the shadow <c>OrganizationId</c> rather than on the converted <c>Scope</c> value object,
    /// for the structural reason <see cref="TenantIsolationFilter"/> documents: a member access on a
    /// converted object does not translate to SQL, and a real Guid column can be compared and indexed.
    /// </remarks>
    private IQueryable<User> OfTenant(TenantScope scope)
    {
        ArgumentNullException.ThrowIfNull(scope);

        if (scope.IsEmpty)
        {
            // A session with no organization has no identities. Answering with an always-empty query rather
            // than with an exception means a misresolved principal produces an empty directory rather than
            // a cross-tenant read. Expressed as an equality on the key rather than a bare constant so it
            // stays translatable and indexable.
            return _context.Users
                .IgnoreQueryFilters()
                .Where(user => user.Id == Guid.Empty);
        }

        return _context.Users
            .IgnoreQueryFilters()
            .Where(user => EF.Property<Guid>(user, NegarAzinFadakDbContext.OrganizationIdColumn) == scope.OrganizationId);
    }

    /// <summary>
    /// The navigations a directory read needs, and a mutation needs tracked.
    /// </summary>
    /// <remarks>
    /// They are included rather than left to lazy loading because the platform does not enable it: without
    /// these, a freshly registered identity would have no profile and no roles in memory, and a caller
    /// projecting the record would report an empty contact list rather than admitting it did not read one.
    /// </remarks>
    private static IQueryable<User> Readable(IQueryable<User> users) => users
        .Include(user => user.Profile)
        .Include(user => user.Roles)
        .Include(user => user.Contacts)
        .Include(user => user.Addresses);
}
