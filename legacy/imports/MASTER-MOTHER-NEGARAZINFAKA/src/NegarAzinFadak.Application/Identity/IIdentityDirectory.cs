using NegarAzinFadak.Core.Paging;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Identity.Domain.Users;

namespace NegarAzinFadak.Application.Identity;

/// <summary>
/// Optional filters accepted by the central identity directory.
/// </summary>
/// <remarks>
/// There is deliberately no filter for the tenant. A caller may narrow by status, by mobile or by name,
/// but never widen: which identities exist for a session is decided by the organization the session
/// belongs to, and a filter that could widen it would turn a query string into a tenant selector.
/// </remarks>
/// <param name="Status">Restrict to one lifecycle status.</param>
/// <param name="IsIdentityVerified">Restrict to identities whose strong verification has completed.</param>
/// <param name="Mobile">Restrict to one anchor mobile number, in any accepted spelling.</param>
/// <param name="Text">Free text matched against the display name and the confirmed profile name.</param>
public sealed record IdentityQuery(
    UserStatus? Status = null,
    bool? IsIdentityVerified = null,
    string? Mobile = null,
    string? Text = null)
{
    /// <summary>A query with no restrictions, listing every identity of the caller's tenant.</summary>
    public static IdentityQuery All { get; } = new();

    /// <summary>True when no filter is set, so a caller can report a full listing as such.</summary>
    public bool IsUnfiltered =>
        Status is null && IsIdentityVerified is null
        && string.IsNullOrWhiteSpace(Mobile) && string.IsNullOrWhiteSpace(Text);
}

/// <summary>
/// Read side of the central identity registry, as an administrator's directory uses it.
/// </summary>
/// <remarks>
/// <para>
/// This port exists beside <see cref="IIdentitySignInDirectory"/> because the two questions are genuinely
/// different and have opposite scoping rules. Sign-in asks "which identity presents this credential"
/// before any tenant is known and may cross organizations, which is why the mobile number is unique across
/// the platform. A directory asks "which identities does my tenant administer", and every method here is
/// scoped: it takes the caller's <see cref="TenantScope"/> as a parameter rather than reading an ambient
/// one, so a use case cannot forget to apply it.
/// </para>
/// <para>
/// The single exception is <see cref="MobileExistsAsync"/>, which is cross-tenant by necessity. Registering
/// a mobile number that another tenant already registered would create a second central identity for one
/// human, which is the exact defect the central-identity rule exists to prevent, and the unique index on
/// the column would refuse it anyway. It answers a yes/no question and nothing more, so it cannot become
/// the way a tenant enumerates another tenant's customers.
/// </para>
/// </remarks>
public interface IIdentityDirectory
{
    /// <summary>One page of the identities of a tenant, narrowed by <paramref name="query"/>.</summary>
    Task<PagedResult<User>> ListAsync(
        TenantScope scope,
        IdentityQuery query,
        PageRequest page,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// The identity of a tenant together with its profile, contacts, addresses and role assignments,
    /// untracked. Returns <see langword="null"/> when the identity is not in <paramref name="scope"/>.
    /// </summary>
    Task<User?> FindByIdAsync(TenantScope scope, Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// The same identity, tracked, for a use case that is about to change it. A tracked read is required
    /// rather than convenient: the aggregate decides what a change means, and it can only do that on an
    /// instance the persistence layer will save.
    /// </summary>
    Task<User?> FindTrackedByIdAsync(TenantScope scope, Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// True when the mobile number already belongs to some central identity, in any organization.
    /// </summary>
    /// <remarks>
    /// Cross-tenant on purpose, as the remarks on this interface explain. The answer is a boolean, so it
    /// cannot be used to learn who the identity belongs to; the caller reports a conflict without naming
    /// the owning tenant.
    /// </remarks>
    Task<bool> MobileExistsAsync(string mobile, CancellationToken cancellationToken = default);
}
