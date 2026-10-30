using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Identity.Domain.Users;
using NegarAzinFadak.Organization.Domain.Roles;

namespace NegarAzinFadak.Application.Identity;

/// <summary>
/// The two lookups sign-in needs, which exist because <see cref="Core.Persistence.IRepository{TAggregate}"/>
/// deliberately exposes only identifier-based access.
/// </summary>
/// <remarks>
/// <para>
/// Sign-in is the one operation that runs before a tenant is known. The caller presents a mobile number
/// and nothing else, so there is no organization to filter by, and a repository scoped to the caller's
/// tenant could not answer the question. The isolation filter treats an unresolved session as a
/// platform-level operation, which is exactly the honest description of authentication, and the mobile
/// number is unique across the platform, so the lookup returns at most one identity.
/// </para>
/// <para>
/// Because this port reads across tenants, it must never grow a method that returns a collection of
/// identities. It resolves one identity by a credential, and roles for a scope the identity already
/// belongs to.
/// </para>
/// </remarks>
public interface IIdentitySignInDirectory
{
    /// <summary>Resolves the single identity registered with this mobile number, or <see langword="null"/>.</summary>
    Task<User?> FindByMobileAsync(string mobile, CancellationToken cancellationToken = default);

    /// <summary>Every role defined inside an organization, active or retired.</summary>
    Task<IReadOnlyList<Role>> ListOrganizationRolesAsync(
        TenantScope organizationScope,
        CancellationToken cancellationToken = default);
}
