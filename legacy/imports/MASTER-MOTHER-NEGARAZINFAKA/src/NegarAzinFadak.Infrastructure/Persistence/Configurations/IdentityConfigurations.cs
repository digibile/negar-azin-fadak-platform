using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Identity.Domain.Activities;
using NegarAzinFadak.Identity.Domain.Authentication;
using NegarAzinFadak.Identity.Domain.Documents;
using NegarAzinFadak.Identity.Domain.Folders;
using NegarAzinFadak.Identity.Domain.Users;

namespace NegarAzinFadak.Infrastructure.Persistence.Configurations;

internal sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");
        builder.HasKey(user => user.Id);

        builder.Property(user => user.Mobile).HasMaxLength(20).IsRequired();
        builder.HasIndex(user => user.Mobile).IsUnique().HasFilter(null);
        builder.Property(user => user.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(user => user.Source).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(user => user.PreferredLocale).HasMaxLength(16);
        builder.Property(user => user.DisplayName).HasMaxLength(256);
        builder.Property(user => user.ConcurrencyStamp).HasMaxLength(64).IsRequired();
        builder.Property(user => user.Scope).IsRequired();

        // Nullable: an identity registered by one-time code has no password credential. The value is a
        // PBKDF2 hash, never a plain password, and the column is sized for the algorithm, version, work
        // factor, salt and key that the hash string carries.
        builder.Property(user => user.PasswordHash).HasMaxLength(256);

        builder.HasIndex(user => user.Scope);
        builder.HasIndex(user => new { user.Status, user.MobileVerifiedAt });

        builder.HasOne(user => user.Profile)
            .WithOne()
            .HasForeignKey<IdentityProfile>(profile => profile.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(user => user.Contacts)
            .WithOne()
            .HasForeignKey(contact => contact.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(user => user.Addresses)
            .WithOne()
            .HasForeignKey(address => address.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(user => user.BankAccounts)
            .WithOne()
            .HasForeignKey(account => account.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(user => user.Roles)
            .WithOne()
            .HasForeignKey(role => role.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(user => user.PendingChanges)
            .WithOne()
            .HasForeignKey(change => change.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(user => user.Profile).UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

internal sealed class UserRoleAssignmentConfiguration : IEntityTypeConfiguration<UserRoleAssignment>
{
    public void Configure(EntityTypeBuilder<UserRoleAssignment> builder)
    {
        builder.ToTable("UserRoleAssignments");
        builder.HasKey(role => role.Id);
        builder.Property(role => role.RoleCode).HasMaxLength(64).IsRequired();
        builder.Property(role => role.Scope).HasMaxLength(80).IsRequired();
        builder.HasIndex(role => new { role.UserId, role.RoleCode });
    }
}

internal sealed class IdentityProfileConfiguration : IEntityTypeConfiguration<IdentityProfile>
{
    public void Configure(EntityTypeBuilder<IdentityProfile> builder)
    {
        builder.ToTable("IdentityProfiles");
        builder.HasKey(profile => profile.Id);
        builder.Property(profile => profile.FirstName).HasMaxLength(128);
        builder.Property(profile => profile.LastName).HasMaxLength(128);
        builder.Property(profile => profile.FatherName).HasMaxLength(128);
        builder.Property(profile => profile.MotherName).HasMaxLength(128);
        builder.Property(profile => profile.NationalId).HasMaxLength(20);
        builder.Property(profile => profile.PlaceOfBirth).HasMaxLength(256);
        builder.Property(profile => profile.Occupation).HasMaxLength(128);
        builder.Property(profile => profile.MaritalStatus).HasMaxLength(64);
        builder.Property(profile => profile.NationalityCode).HasMaxLength(8);
        builder.Property(profile => profile.VerificationStatus).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(profile => profile.VerificationMethod).HasMaxLength(64);
        builder.Property(profile => profile.ConcurrencyStamp).HasMaxLength(64).IsRequired();
        builder.Property(profile => profile.Gender).HasConversion<string>().HasMaxLength(16);

        // Uniqueness of a national ID is the platform's main defence against duplicate identities.
        builder.HasIndex(profile => profile.NationalId)
            .IsUnique()
            .HasFilter(null)
            .HasDatabaseName("IX_IdentityProfiles_NationalId");

        builder.HasMany(profile => profile.History)
            .WithOne()
            .HasForeignKey(change => change.ProfileId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class IdentityAttributeChangeConfiguration : IEntityTypeConfiguration<IdentityAttributeChange>
{
    public void Configure(EntityTypeBuilder<IdentityAttributeChange> builder)
    {
        builder.ToTable("IdentityAttributeChanges");
        builder.HasKey(change => change.Id);
        builder.Property(change => change.Field).HasConversion<string>().HasMaxLength(32);
        builder.Property(change => change.PreviousValue).HasMaxLength(512);
        builder.Property(change => change.NewValue).HasMaxLength(512);
        builder.HasIndex(change => new { change.ProfileId, change.ChangedAt });
    }
}

internal sealed class UserProfileChangeRequestConfiguration : IEntityTypeConfiguration<UserProfileChangeRequest>
{
    public void Configure(EntityTypeBuilder<UserProfileChangeRequest> builder)
    {
        builder.ToTable("UserProfileChangeRequests");
        builder.HasKey(request => request.Id);
        builder.Property(request => request.Field).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(request => request.NewValue).HasMaxLength(512);
        builder.Property(request => request.Reason).HasMaxLength(1024).IsRequired();
        builder.Property(request => request.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(request => request.ReviewNote).HasMaxLength(1024);
        builder.HasIndex(request => new { request.UserId, request.Status });
    }
}

internal sealed class UserContactConfiguration : IEntityTypeConfiguration<UserContact>
{
    public void Configure(EntityTypeBuilder<UserContact> builder)
    {
        builder.ToTable("UserContacts");
        builder.HasKey(contact => contact.Id);
        builder.Property(contact => contact.Kind).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(contact => contact.Value).HasMaxLength(320).IsRequired();
        builder.Property(contact => contact.VerificationMethod).HasMaxLength(64);
        builder.HasIndex(contact => new { contact.UserId, contact.Kind, contact.Value }).IsUnique();
    }
}

internal sealed class UserAddressConfiguration : IEntityTypeConfiguration<UserAddress>
{
    public void Configure(EntityTypeBuilder<UserAddress> builder)
    {
        builder.ToTable("UserAddresses");
        builder.HasKey(address => address.Id);
        builder.Property(address => address.Kind).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(address => address.CountryCode).HasMaxLength(2).IsFixedLength().IsRequired();
        builder.Property(address => address.Province).HasMaxLength(128);
        builder.Property(address => address.City).HasMaxLength(128);
        builder.Property(address => address.PostalCode).HasMaxLength(16);
        builder.Property(address => address.Line1).HasMaxLength(512);
        builder.Property(address => address.Line2).HasMaxLength(512);
    }
}

internal sealed class BankAccountConfiguration : IEntityTypeConfiguration<BankAccount>
{
    public void Configure(EntityTypeBuilder<BankAccount> builder)
    {
        builder.ToTable("BankAccounts");
        builder.HasKey(account => account.Id);
        builder.Property(account => account.BankCode).HasMaxLength(16).IsRequired();
        builder.Property(account => account.AccountNumber).HasMaxLength(64).IsRequired();
        builder.Property(account => account.Iban).HasMaxLength(26).IsFixedLength().IsRequired();
        builder.Property(account => account.CardNumber).HasMaxLength(16).IsFixedLength();
        builder.Property(account => account.BankName).HasMaxLength(128);
        builder.Property(account => account.Ownership).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(account => account.VerificationMethod).HasMaxLength(64);
        builder.Property(account => account.ConcurrencyStamp).HasMaxLength(64).IsRequired();

        builder.HasIndex(account => account.Iban).IsUnique();
    }
}

internal sealed class DocumentTypeConfiguration : IEntityTypeConfiguration<DocumentType>
{
    public void Configure(EntityTypeBuilder<DocumentType> builder)
    {
        builder.ToTable("DocumentTypes");
        builder.HasKey(type => type.Id);
        builder.Property(type => type.Code).HasMaxLength(64).IsRequired();
        builder.Property(type => type.Title).HasMaxLength(256).IsRequired();
        builder.Property(type => type.TitlePersian).HasMaxLength(256).IsRequired();
        builder.Property(type => type.Category).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(type => type.ProviderTemplate).HasMaxLength(128);
        builder.Property(type => type.ConcurrencyStamp).HasMaxLength(64).IsRequired();
        builder.HasIndex(type => type.Code).IsUnique();
    }
}

internal sealed class IdentityDocumentConfiguration : IEntityTypeConfiguration<IdentityDocument>
{
    public void Configure(EntityTypeBuilder<IdentityDocument> builder)
    {
        builder.ToTable("IdentityDocuments");
        builder.HasKey(document => document.Id);
        builder.Property(document => document.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(document => document.VerificationMethod).HasConversion<string>().HasMaxLength(48);
        builder.Property(document => document.ReferenceNumber).HasMaxLength(64);
        builder.Property(document => document.ConcurrencyStamp).HasMaxLength(64).IsRequired();
        builder.Property(document => document.Scope).IsRequired();

        builder.HasIndex(document => new { document.UserId, document.DocumentTypeId, document.Status });
        builder.HasIndex(document => new { document.Status, document.ExpiresOn });

        builder.HasOne<DocumentType>()
            .WithMany()
            .HasForeignKey(document => document.DocumentTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(document => document.Pages)
            .WithOne()
            .HasForeignKey(page => page.DocumentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(document => document.Extractions)
            .WithOne()
            .HasForeignKey(extraction => extraction.DocumentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(document => document.Verifications)
            .WithOne()
            .HasForeignKey(verification => verification.DocumentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Normalised fields are a read-only projection over a private map that the aggregate mutates in
        // place, so EF must write through the backing field.
        builder.Property(document => document.NormalizedFields)
            .HasField("_normalizedFields")
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

internal sealed class DocumentPageConfiguration : IEntityTypeConfiguration<DocumentPage>
{
    public void Configure(EntityTypeBuilder<DocumentPage> builder)
    {
        builder.ToTable("DocumentPages");
        builder.HasKey(page => page.Id);
        builder.Property(page => page.Side).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(page => page.StorageKey).HasMaxLength(512).IsRequired();
        builder.Property(page => page.ContentType).HasMaxLength(128).IsRequired();
        builder.Property(page => page.Sha256Hash).HasMaxLength(64).IsFixedLength().IsRequired();

        builder.HasIndex(page => new { page.DocumentId, page.PageNumber }).IsUnique();
        builder.HasIndex(page => page.Sha256Hash);
    }
}

internal sealed class DocumentExtractionConfiguration : IEntityTypeConfiguration<DocumentExtraction>
{
    public void Configure(EntityTypeBuilder<DocumentExtraction> builder)
    {
        builder.ToTable("DocumentExtractions");
        builder.HasKey(extraction => extraction.Id);
        builder.Property(extraction => extraction.Provider).HasMaxLength(64).IsRequired();
        builder.Property(extraction => extraction.Template).HasMaxLength(128);
        builder.Property(extraction => extraction.Confidence).HasPrecision(4, 3);
        builder.HasIndex(extraction => extraction.DocumentId);
    }
}

internal sealed class DocumentVerificationConfiguration : IEntityTypeConfiguration<DocumentVerification>
{
    public void Configure(EntityTypeBuilder<DocumentVerification> builder)
    {
        builder.ToTable("DocumentVerifications");
        builder.HasKey(verification => verification.Id);
        builder.Property(verification => verification.Decision).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(verification => verification.Method).HasConversion<string>().HasMaxLength(48).IsRequired();
        builder.Property(verification => verification.Notes).HasMaxLength(1024);
        builder.Property(verification => verification.Confidence).HasPrecision(4, 3);
        builder.HasIndex(verification => new { verification.DocumentId, verification.DecidedAt });
    }
}

internal sealed class DigitalFolderConfiguration : IEntityTypeConfiguration<DigitalFolder>
{
    public void Configure(EntityTypeBuilder<DigitalFolder> builder)
    {
        builder.ToTable("DigitalFolders");
        builder.HasKey(folder => folder.Id);
        builder.Property(folder => folder.ConcurrencyStamp).HasMaxLength(64).IsRequired();
        builder.Property(folder => folder.Scope).IsRequired();
        builder.HasIndex(folder => folder.UserId).IsUnique();

        builder.HasMany(folder => folder.Documents)
            .WithOne()
            .HasForeignKey(document => document.FolderId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class DigitalDocumentConfiguration : IEntityTypeConfiguration<DigitalDocument>
{
    public void Configure(EntityTypeBuilder<DigitalDocument> builder)
    {
        builder.ToTable("DigitalDocuments");
        builder.HasKey(document => document.Id);
        builder.Property(document => document.Category).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(document => document.Title).HasMaxLength(256).IsRequired();
        builder.Property(document => document.Description).HasMaxLength(1024);
        builder.Property(document => document.ReviewStatus).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(document => document.ReviewNotes).HasMaxLength(1024);
        builder.Property(document => document.ConcurrencyStamp).HasMaxLength(64).IsRequired();

        builder.HasIndex(document => new { document.FolderId, document.Category });
        builder.HasIndex(document => document.IdentityDocumentId);

        builder.HasOne<IdentityDocument>()
            .WithMany()
            .HasForeignKey(document => document.IdentityDocumentId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

internal sealed class OtpChallengeConfiguration : IEntityTypeConfiguration<OtpChallenge>
{
    public void Configure(EntityTypeBuilder<OtpChallenge> builder)
    {
        builder.ToTable("OtpChallenges");
        builder.HasKey(challenge => challenge.Id);
        builder.Property(challenge => challenge.Purpose).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(challenge => challenge.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(challenge => challenge.CodeDigest).HasMaxLength(128).IsRequired();
        builder.Property(challenge => challenge.DeliveredVia).HasMaxLength(64);
        builder.Property(challenge => challenge.RequestedFrom).HasMaxLength(256);

        builder.HasIndex(challenge => new { challenge.Target, challenge.Purpose, challenge.Status });
        builder.HasIndex(challenge => challenge.ExpiresAt);
    }
}

internal sealed class UserEventConfiguration : IEntityTypeConfiguration<UserEvent>
{
    public void Configure(EntityTypeBuilder<UserEvent> builder)
    {
        builder.ToTable("UserEvents");
        builder.HasKey(@event => @event.Id);
        builder.Property(@event => @event.TypeCode).HasMaxLength(128).IsRequired();
        builder.Property(@event => @event.Category).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(@event => @event.Title).HasMaxLength(512).IsRequired();
        builder.Property(@event => @event.Description).HasMaxLength(1024);
        builder.Property(@event => @event.SourceModule).HasMaxLength(64).IsRequired();
        builder.Property(@event => @event.CorrelationId).HasMaxLength(64);
        builder.Property(@event => @event.Scope).IsRequired();

        builder.HasIndex(@event => new { @event.UserId, @event.OccurredAt });
        builder.HasIndex(@event => new { @event.UserId, @event.Category });
    }
}

internal sealed class UserEventTypeConfiguration : IEntityTypeConfiguration<UserEventType>
{
    public void Configure(EntityTypeBuilder<UserEventType> builder)
    {
        builder.ToTable("UserEventTypes");
        builder.HasKey(type => type.Id);
        builder.Property(type => type.Code).HasMaxLength(128).IsRequired();
        builder.Property(type => type.TitlePersian).HasMaxLength(256).IsRequired();
        builder.Property(type => type.Category).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(type => type.Icon).HasMaxLength(64);
        builder.HasIndex(type => type.Code).IsUnique();
    }
}
