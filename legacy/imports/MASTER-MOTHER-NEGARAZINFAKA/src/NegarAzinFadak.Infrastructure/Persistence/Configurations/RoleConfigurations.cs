using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NegarAzinFadak.Organization.Domain.Roles;

namespace NegarAzinFadak.Infrastructure.Persistence.Configurations;

internal sealed class RoleConfiguration : IEntityTypeConfiguration<Role>
{
    public void Configure(EntityTypeBuilder<Role> builder)
    {
        builder.ToTable("Roles");
        builder.HasKey(role => role.Id);
        builder.Property(role => role.Code).HasMaxLength(64).IsRequired();
        builder.Property(role => role.Name).HasMaxLength(256).IsRequired();
        builder.Property(role => role.Description).HasMaxLength(1024);
        builder.Property(role => role.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(role => role.ConcurrencyStamp).HasMaxLength(64).IsRequired();
        builder.Property(role => role.Scope).IsRequired();

        // Uniqueness is per tenant, not global: two organizations may both define "seller_manager" with
        // different permission sets, which is the whole point of a tenant-owned role.
        builder.HasIndex(role => new { role.Code, role.Scope }).IsUnique();
        builder.HasIndex(role => new { role.Scope, role.Status });

        builder.HasMany(role => role.Permissions)
            .WithOne()
            .HasForeignKey(permission => permission.RoleId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class RolePermissionConfiguration : IEntityTypeConfiguration<RolePermission>
{
    public void Configure(EntityTypeBuilder<RolePermission> builder)
    {
        builder.ToTable("RolePermissions");
        builder.HasKey(permission => permission.Id);
        builder.Property(permission => permission.PermissionCode).HasMaxLength(128).IsRequired();
        builder.Property(permission => permission.Scope).IsRequired();

        // A revoked grant is kept, so the pair must stay unique across all grants of a role: re-granting a
        // permission after revoking it is refused by the domain, not silently absorbed here.
        builder.HasIndex(permission => new { permission.RoleId, permission.PermissionCode }).IsUnique();
        builder.HasIndex(permission => new { permission.PermissionCode, permission.IsRevoked });
    }
}

/// <summary>
/// The permission catalog is platform-wide and deliberately carries no tenant column.
/// </summary>
/// <remarks>
/// A permission means the same thing in every organization. If the rows were tenant-owned, a token minted
/// in one organization could not be interpreted in another, and the authorization check would silently
/// depend on which tenant issued the caller — a class of bug that only appears in production, in the
/// organization nobody tested with.
/// </remarks>
internal sealed class PermissionConfiguration : IEntityTypeConfiguration<Permission>
{
    public void Configure(EntityTypeBuilder<Permission> builder)
    {
        builder.ToTable("Permissions");
        builder.HasKey(permission => permission.Id);
        builder.Property(permission => permission.Code).HasMaxLength(128).IsRequired();
        builder.Property(permission => permission.Category).HasMaxLength(64).IsRequired();
        builder.Property(permission => permission.Title).HasMaxLength(256).IsRequired();
        builder.Property(permission => permission.Description).HasMaxLength(1024);

        builder.HasIndex(permission => permission.Code).IsUnique();
        builder.HasIndex(permission => new { permission.Category, permission.IsActive });
    }
}
