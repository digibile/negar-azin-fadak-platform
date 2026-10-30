using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NegarAzinFadak.Organization.Domain.Configuration;

namespace NegarAzinFadak.Infrastructure.Persistence.Configurations;

internal sealed class TenantConfigurationConfiguration : IEntityTypeConfiguration<TenantConfiguration>
{
    public void Configure(EntityTypeBuilder<TenantConfiguration> builder)
    {
        builder.ToTable("TenantConfigurations");
        builder.HasKey(configuration => configuration.Id);
        builder.Property(configuration => configuration.ConcurrencyStamp).HasMaxLength(64).IsRequired();
        builder.Property(configuration => configuration.Scope).IsRequired();

        // Exactly one configuration document per tenant. The tenant is identified by its scope, and the
        // uniqueness is what lets "read the configuration" be a lookup rather than a scan.
        builder.HasIndex(configuration => configuration.Scope).IsUnique();

        builder.HasMany(configuration => configuration.Settings)
            .WithOne()
            .HasForeignKey(setting => setting.ConfigurationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class TenantSettingConfiguration : IEntityTypeConfiguration<TenantSetting>
{
    public void Configure(EntityTypeBuilder<TenantSetting> builder)
    {
        builder.ToTable("TenantSettings");
        builder.HasKey(setting => setting.Id);
        builder.Property(setting => setting.Code).HasMaxLength(128).IsRequired();
        builder.Property(setting => setting.Value).HasMaxLength(4096).IsRequired();
        builder.Property(setting => setting.Kind).HasConversion<string>().HasMaxLength(16).IsRequired();

        // The declared range is a read-time guard, not a constraint EF can express, so it is stored as two
        // columns. Keeping it in the row means the rule travels with the value and a later validation change
        // does not have to guess what the bound used to be.
        builder.Property(setting => setting.RangeMinimum).HasPrecision(18, 4);
        builder.Property(setting => setting.RangeMaximum).HasPrecision(18, 4);

        // A code is unique inside one configuration document, not across the platform. Every tenant is
        // expected to define "credit.default.down_payment" for itself, so a global index would stop the
        // second customer from being configured at all.
        builder.HasIndex(setting => new { setting.ConfigurationId, setting.Code }).IsUnique();
    }
}
