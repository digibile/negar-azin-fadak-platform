using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NegarAzinFadak.Organization.Domain.Menus;

namespace NegarAzinFadak.Infrastructure.Persistence.Configurations;

internal sealed class MenuConfiguration : IEntityTypeConfiguration<Menu>
{
    public void Configure(EntityTypeBuilder<Menu> builder)
    {
        builder.ToTable("Menus");
        builder.HasKey(menu => menu.Id);
        builder.Property(menu => menu.Code).HasMaxLength(64).IsRequired();
        builder.Property(menu => menu.Title).HasMaxLength(256).IsRequired();
        builder.Property(menu => menu.EnglishTitle).HasMaxLength(256);
        builder.Property(menu => menu.Level).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(menu => menu.ConcurrencyStamp).HasMaxLength(64).IsRequired();
        builder.Property(menu => menu.Scope).IsRequired();

        // Uniqueness is per scope, not global: two companies may both define a "master" menu for their own
        // operators, and the level is part of the scope, so a tenant, a company and a brand can each hold one.
        builder.HasIndex(menu => new { menu.Code, menu.Scope }).IsUnique();
        builder.HasIndex(menu => new { menu.Scope, menu.Level, menu.IsActive });

        builder.HasMany(menu => menu.Items)
            .WithOne()
            .HasForeignKey(item => item.MenuId)
            .OnDelete(DeleteBehavior.Cascade);

        // The aggregate exposes its items read-only, because callers are not allowed to attach one behind the
        // aggregate's back. The backing field is named so the mapping stays possible without widening it.
        builder.Metadata
            .FindNavigation(nameof(Menu.Items))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);
    }
}

internal sealed class MenuItemConfiguration : IEntityTypeConfiguration<MenuItem>
{
    public void Configure(EntityTypeBuilder<MenuItem> builder)
    {
        builder.ToTable("MenuItems");
        builder.HasKey(item => item.Id);
        builder.Property(item => item.Code).HasMaxLength(64).IsRequired();
        builder.Property(item => item.Title).HasMaxLength(256).IsRequired();
        builder.Property(item => item.EnglishTitle).HasMaxLength(256);
        builder.Property(item => item.Icon).HasMaxLength(64);
        builder.Property(item => item.Route).HasMaxLength(256);
        builder.Property(item => item.Module).HasMaxLength(64).IsRequired();
        builder.Property(item => item.RequiredPermissionCode).HasMaxLength(128);
        builder.Property(item => item.ParentId).IsRequired();
        builder.Property(item => item.Scope).IsRequired();

        // Sibling uniqueness is the rule the aggregate enforces in memory. It is repeated here because the
        // aggregate's copy only holds the menu it was loaded with: two sessions editing the same menu
        // concurrently would each accept the same code, and only the database can refuse the second commit.
        //
        // ParentId is the Guid.Empty sentinel rather than a nullable column, and that is deliberate. A
        // nullable parent would make the root of a tree NULL in the index, and every provider disagrees on
        // how NULLs compare inside a unique index — PostgreSQL and SQLite both treat them as distinct, so two
        // top-level sections could both take the same code. Guid.Empty is an ordinary value that compares
        // the same way everywhere, and the API projects it back to null.
        builder.HasIndex(item => new { item.MenuId, item.ParentId, item.Code }).IsUnique();
        builder.HasIndex(item => new { item.MenuId, item.ParentId, item.SortOrder });
        builder.HasIndex(item => new { item.RequiredPermissionCode, item.IsActive });
    }
}
