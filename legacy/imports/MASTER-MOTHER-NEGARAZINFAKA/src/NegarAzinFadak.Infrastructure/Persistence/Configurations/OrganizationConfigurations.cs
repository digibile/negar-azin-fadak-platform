using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrganizationDomain = NegarAzinFadak.Organization.Domain;

namespace NegarAzinFadak.Infrastructure.Persistence.Configurations;

internal sealed class OrganizationConfiguration : IEntityTypeConfiguration<OrganizationDomain.Organization>
{
    public void Configure(EntityTypeBuilder<OrganizationDomain.Organization> builder)
    {
        builder.ToTable("Organizations");
        builder.HasKey(organization => organization.Id);
        builder.Property(organization => organization.Code).HasMaxLength(64).IsRequired();
        builder.Property(organization => organization.Name).HasMaxLength(256).IsRequired();
        builder.Property(organization => organization.LegalName).HasMaxLength(256).IsRequired();
        builder.Property(organization => organization.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(organization => organization.EconomicCode).HasMaxLength(32);
        builder.Property(organization => organization.NationalRegistrationNumber).HasMaxLength(32);
        builder.Property(organization => organization.DefaultCurrencyCode).HasMaxLength(3).IsRequired();
        builder.Property(organization => organization.Description).HasMaxLength(1024);
        builder.Property(organization => organization.ConcurrencyStamp).HasMaxLength(64).IsRequired();
        builder.Property(organization => organization.Scope).IsRequired();
        builder.HasIndex(organization => organization.Code).IsUnique();
    }
}

internal sealed class CompanyConfiguration : IEntityTypeConfiguration<OrganizationDomain.Company>
{
    public void Configure(EntityTypeBuilder<OrganizationDomain.Company> builder)
    {
        builder.ToTable("Companies");
        builder.HasKey(company => company.Id);
        builder.Property(company => company.Code).HasMaxLength(64).IsRequired();
        builder.Property(company => company.Name).HasMaxLength(256).IsRequired();
        builder.Property(company => company.LegalName).HasMaxLength(256).IsRequired();
        builder.Property(company => company.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(company => company.DefaultCurrencyCode).HasMaxLength(3).IsRequired();
        builder.Property(company => company.Description).HasMaxLength(1024);
        builder.Property(company => company.ConcurrencyStamp).HasMaxLength(64).IsRequired();
        builder.Property(company => company.Scope).IsRequired();
        // "Code is unique among siblings" is the rule an operator means, and it can only be enforced in the
        // database when the parent is a real column next to the code.
        builder.HasIndex(company => new { company.ParentId, company.Code }).IsUnique();
        builder.HasIndex(company => company.ParentId);
    }
}

internal sealed class BrandConfiguration : IEntityTypeConfiguration<OrganizationDomain.Brand>
{
    public void Configure(EntityTypeBuilder<OrganizationDomain.Brand> builder)
    {
        builder.ToTable("Brands");
        builder.HasKey(brand => brand.Id);
        builder.Property(brand => brand.Code).HasMaxLength(64).IsRequired();
        builder.Property(brand => brand.Name).HasMaxLength(256).IsRequired();
        builder.Property(brand => brand.LegalName).HasMaxLength(256).IsRequired();
        builder.Property(brand => brand.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(brand => brand.Description).HasMaxLength(1024);
        builder.Property(brand => brand.ConcurrencyStamp).HasMaxLength(64).IsRequired();
        builder.Property(brand => brand.Scope).IsRequired();
        builder.HasIndex(brand => new { brand.ParentId, brand.Code }).IsUnique();
        builder.HasIndex(brand => brand.ParentId);
    }
}

internal sealed class BranchConfiguration : IEntityTypeConfiguration<OrganizationDomain.Branch>
{
    public void Configure(EntityTypeBuilder<OrganizationDomain.Branch> builder)
    {
        builder.ToTable("Branches");
        builder.HasKey(branch => branch.Id);
        builder.Property(branch => branch.Code).HasMaxLength(64).IsRequired();
        builder.Property(branch => branch.Name).HasMaxLength(256).IsRequired();
        builder.Property(branch => branch.LegalName).HasMaxLength(256).IsRequired();
        builder.Property(branch => branch.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(branch => branch.City).HasMaxLength(128);
        builder.Property(branch => branch.PhoneNumber).HasMaxLength(32);
        builder.Property(branch => branch.Description).HasMaxLength(1024);
        builder.Property(branch => branch.ConcurrencyStamp).HasMaxLength(64).IsRequired();
        builder.Property(branch => branch.Scope).IsRequired();
        builder.HasIndex(branch => new { branch.ParentId, branch.Code }).IsUnique();
        builder.HasIndex(branch => branch.ParentId);
    }
}

internal sealed class StoreConfiguration : IEntityTypeConfiguration<OrganizationDomain.Store>
{
    public void Configure(EntityTypeBuilder<OrganizationDomain.Store> builder)
    {
        builder.ToTable("Stores");
        builder.HasKey(store => store.Id);
        builder.Property(store => store.Code).HasMaxLength(64).IsRequired();
        builder.Property(store => store.Name).HasMaxLength(256).IsRequired();
        builder.Property(store => store.LegalName).HasMaxLength(256).IsRequired();
        builder.Property(store => store.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(store => store.Description).HasMaxLength(1024);
        builder.Property(store => store.ConcurrencyStamp).HasMaxLength(64).IsRequired();
        builder.Property(store => store.Scope).IsRequired();
        builder.HasIndex(store => new { store.ParentId, store.Code }).IsUnique();
        builder.HasIndex(store => store.ParentId);
    }
}
