using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Auditing;

namespace NegarAzinFadak.Organization.Domain.Roles;

/// <summary>
/// One entry of the platform's permission catalog.
/// </summary>
/// <remarks>
/// Permissions are data, not behaviour. An endpoint names a code and authorization resolves it, so adding
/// a capability means adding a catalog row, never editing an <c>if</c> statement. The catalog is
/// platform-level and deliberately not tenant-owned: a permission must mean the same thing in every
/// tenant, otherwise a token minted in one organization could not be understood in another, and the
/// authorization check would silently depend on which tenant issued the caller.
/// <para>
/// Tenants do not invent codes. They compose the catalog into their own <see cref="Role"/>s, which is what
/// keeps a typo in a code a denial rather than a privilege escalation.
/// </para>
/// </remarks>
public sealed class Permission : IAuditable
{
    private Permission()
    {
        Code = string.Empty;
        Category = string.Empty;
        Title = string.Empty;
    }

    /// <summary>Registers a permission in the catalog.</summary>
    public Permission(string code, string category, string title, string? description = null)
    {
        // Assigned here rather than left to the store. An unset key would be Guid.Empty for every catalog
        // entry, and a catalog that can hold one row is a catalog that cannot describe a platform.
        Id = Guid.NewGuid();
        Code = Normalize(code);
        Category = Guard.AgainstNullOrWhiteSpace(category).Trim().ToLowerInvariant();
        Title = Guard.AgainstNullOrWhiteSpace(title).Trim();
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        IsActive = true;
    }

    /// <summary>Identifier of the catalog entry.</summary>
    public Guid Id { get; private set; }

    /// <summary>
    /// Stable, dotted permission code, e.g. <c>seller.catalog.product.write</c>. Stored lower-case so
    /// that authorization can compare codes without casing rules scattered through the system.
    /// </summary>
    public string Code { get; private set; }

    /// <summary>Grouping used by administration screens and permission pickers, e.g. <c>catalog</c>.</summary>
    public string Category { get; private set; }

    /// <summary>Short human-readable label.</summary>
    public string Title { get; private set; }

    public string? Description { get; private set; }

    /// <summary>
    /// False for a permission that must no longer be granted. A deactivated code is kept rather than
    /// deleted: roles and historical tokens still reference it, and deleting it would turn a readable
    /// "this capability was withdrawn" into an unexplained denial.
    /// </summary>
    public bool IsActive { get; private set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTimeOffset? ModifiedAt { get; set; }

    public Guid? ModifiedBy { get; set; }

    /// <summary>Deactivates the permission, or reactivates it.</summary>
    public void SetActive(bool isActive) => IsActive = isActive;

    private static string Normalize(string code)
    {
        var trimmed = Guard.AgainstNullOrWhiteSpace(code).Trim().ToLowerInvariant();
        if (trimmed.Length > 128)
        {
            throw new ArgumentException("A permission code must not exceed 128 characters.", nameof(code));
        }

        return trimmed;
    }
}
