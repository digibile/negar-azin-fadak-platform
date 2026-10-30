using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NegarAzinFadak.Migrations.Sqlite.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Branches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    City = table.Column<string>(type: "TEXT", maxLength: 128, nullable: true),
                    PhoneNumber = table.Column<string>(type: "TEXT", maxLength: 32, nullable: true),
                    OrganizationId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Scope = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    LegalName = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1024, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ModifiedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Branches", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Brands",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Scope = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    LegalName = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1024, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ModifiedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Brands", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Companies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    DefaultCurrencyCode = table.Column<string>(type: "TEXT", maxLength: 3, nullable: false),
                    OrganizationId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Scope = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    LegalName = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1024, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ModifiedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Companies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DigitalFolders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Scope = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    CreatedAtValue = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ModifiedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    OrganizationId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DigitalFolders", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DocumentTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    TitlePersian = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    Category = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    RequiresBackSide = table.Column<bool>(type: "INTEGER", nullable: false),
                    DefaultValidityDays = table.Column<int>(type: "INTEGER", nullable: true),
                    IsIdentityDocument = table.Column<bool>(type: "INTEGER", nullable: false),
                    ProviderTemplate = table.Column<string>(type: "TEXT", maxLength: 128, nullable: true),
                    MaxPages = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ModifiedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Organizations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    EconomicCode = table.Column<string>(type: "TEXT", maxLength: 32, nullable: true),
                    NationalRegistrationNumber = table.Column<string>(type: "TEXT", maxLength: 32, nullable: true),
                    DefaultCurrencyCode = table.Column<string>(type: "TEXT", maxLength: 3, nullable: false),
                    OrganizationId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Scope = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    LegalName = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1024, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ModifiedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Organizations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OtpChallenges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Target = table.Column<string>(type: "TEXT", nullable: false),
                    Purpose = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    CodeDigest = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    Policy = table.Column<string>(type: "TEXT", nullable: false),
                    IssuedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ConsumedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    FailedAttempts = table.Column<int>(type: "INTEGER", nullable: false),
                    DeliveryCount = table.Column<int>(type: "INTEGER", nullable: false),
                    NextDeliveryAllowedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DeliveredVia = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true),
                    RequestedFrom = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    RequestedBy = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OtpChallenges", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OutboxMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    EventId = table.Column<Guid>(type: "TEXT", nullable: false),
                    EventType = table.Column<string>(type: "TEXT", maxLength: 512, nullable: false),
                    Payload = table.Column<string>(type: "TEXT", nullable: false),
                    Scope = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    OccurredAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DispatchedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    NextAttemptAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Attempts = table.Column<int>(type: "INTEGER", nullable: false),
                    LastError = table.Column<string>(type: "TEXT", maxLength: 1024, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OutboxMessages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RateLimitCounters",
                columns: table => new
                {
                    Key = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    Count = table.Column<int>(type: "INTEGER", nullable: false),
                    WindowStartedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RateLimitCounters", x => x.Key);
                });

            migrationBuilder.CreateTable(
                name: "Stores",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    IsRetail = table.Column<bool>(type: "INTEGER", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Scope = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    LegalName = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1024, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ModifiedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Stores", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Scope = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    TypeCode = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    Category = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 512, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1024, nullable: true),
                    SourceModule = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    OccurredAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ActorUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CorrelationId = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true),
                    Metadata = table.Column<string>(type: "TEXT", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserEvents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserEventTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    Category = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    TitlePersian = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    Icon = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserEventTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Scope = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Mobile = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    MobileVerifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    Source = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    DisplayName = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    PreferredLocale = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    IsIdentityVerified = table.Column<bool>(type: "INTEGER", nullable: false),
                    IdentityVerifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LastLoginAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    FailedLoginAttempts = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ModifiedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    OrganizationId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "IdentityDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    DocumentTypeId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Scope = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    ReferenceNumber = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true),
                    Status = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    Version = table.Column<int>(type: "INTEGER", nullable: false),
                    SupersededByDocumentId = table.Column<Guid>(type: "TEXT", nullable: true),
                    IssuedOn = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    ExpiresOn = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    VerifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    VerifiedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    VerificationMethod = table.Column<string>(type: "TEXT", maxLength: 48, nullable: true),
                    NormalizedFields = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ModifiedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    OrganizationId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IdentityDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IdentityDocuments_DocumentTypes_DocumentTypeId",
                        column: x => x.DocumentTypeId,
                        principalTable: "DocumentTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BankAccounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    BankCode = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    AccountNumber = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Iban = table.Column<string>(type: "TEXT", fixedLength: true, maxLength: 26, nullable: false),
                    CardNumber = table.Column<string>(type: "TEXT", fixedLength: true, maxLength: 16, nullable: true),
                    BankName = table.Column<string>(type: "TEXT", maxLength: 128, nullable: true),
                    Ownership = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    VerifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    VerificationMethod = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ModifiedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BankAccounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BankAccounts_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IdentityProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    FirstName = table.Column<string>(type: "TEXT", maxLength: 128, nullable: true),
                    LastName = table.Column<string>(type: "TEXT", maxLength: 128, nullable: true),
                    FatherName = table.Column<string>(type: "TEXT", maxLength: 128, nullable: true),
                    MotherName = table.Column<string>(type: "TEXT", maxLength: 128, nullable: true),
                    NationalId = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true),
                    DateOfBirth = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    Gender = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    PlaceOfBirth = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    Occupation = table.Column<string>(type: "TEXT", maxLength: 128, nullable: true),
                    MaritalStatus = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true),
                    NationalityCode = table.Column<string>(type: "TEXT", maxLength: 8, nullable: true),
                    VerificationStatus = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    VerifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    VerifiedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    VerificationMethod = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ModifiedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    LastCrossCheckAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LastCrossCheckDetail = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IdentityProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IdentityProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserAddresses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Kind = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    CountryCode = table.Column<string>(type: "TEXT", fixedLength: true, maxLength: 2, nullable: false),
                    Province = table.Column<string>(type: "TEXT", maxLength: 128, nullable: true),
                    City = table.Column<string>(type: "TEXT", maxLength: 128, nullable: true),
                    PostalCode = table.Column<string>(type: "TEXT", maxLength: 16, nullable: true),
                    Line1 = table.Column<string>(type: "TEXT", maxLength: 512, nullable: true),
                    Line2 = table.Column<string>(type: "TEXT", maxLength: 512, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserAddresses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserAddresses_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserContacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Kind = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    Value = table.Column<string>(type: "TEXT", maxLength: 320, nullable: false),
                    IsPrimary = table.Column<bool>(type: "INTEGER", nullable: false),
                    VerifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    VerificationMethod = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserContacts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserContacts_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserProfileChangeRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Field = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    NewValue = table.Column<string>(type: "TEXT", maxLength: 512, nullable: true),
                    Reason = table.Column<string>(type: "TEXT", maxLength: 1024, nullable: false),
                    RequestedBy = table.Column<Guid>(type: "TEXT", nullable: false),
                    RequestedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    ReviewedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ReviewNote = table.Column<string>(type: "TEXT", maxLength: 1024, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserProfileChangeRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserProfileChangeRequests_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserRoleAssignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    RoleCode = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Scope = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    GrantedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    RevokedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    OrganizationId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRoleAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserRoleAssignments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DigitalDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    FolderId = table.Column<Guid>(type: "TEXT", nullable: false),
                    IdentityDocumentId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Category = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1024, nullable: true),
                    Version = table.Column<int>(type: "INTEGER", nullable: false),
                    PreviousVersionId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ReviewStatus = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    ReviewedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ReviewedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ReviewNotes = table.Column<string>(type: "TEXT", maxLength: 1024, nullable: true),
                    CreatedAtValue = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ModifiedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DigitalDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DigitalDocuments_DigitalFolders_FolderId",
                        column: x => x.FolderId,
                        principalTable: "DigitalFolders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DigitalDocuments_IdentityDocuments_IdentityDocumentId",
                        column: x => x.IdentityDocumentId,
                        principalTable: "IdentityDocuments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "DocumentExtractions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    DocumentId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PageId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Provider = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Template = table.Column<string>(type: "TEXT", maxLength: 128, nullable: true),
                    RawText = table.Column<string>(type: "TEXT", nullable: false),
                    RawFields = table.Column<string>(type: "TEXT", nullable: false),
                    ExtractedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Confidence = table.Column<decimal>(type: "TEXT", precision: 4, scale: 3, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentExtractions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DocumentExtractions_IdentityDocuments_DocumentId",
                        column: x => x.DocumentId,
                        principalTable: "IdentityDocuments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DocumentPages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    DocumentId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PageNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    Side = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    StorageKey = table.Column<string>(type: "TEXT", maxLength: 512, nullable: false),
                    ContentType = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    SizeInBytes = table.Column<long>(type: "INTEGER", nullable: false),
                    Sha256Hash = table.Column<string>(type: "TEXT", fixedLength: true, maxLength: 64, nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Quality = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentPages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DocumentPages_IdentityDocuments_DocumentId",
                        column: x => x.DocumentId,
                        principalTable: "IdentityDocuments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DocumentVerifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    DocumentId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Decision = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    Method = table.Column<string>(type: "TEXT", maxLength: 48, nullable: false),
                    ReviewerId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 1024, nullable: true),
                    DecidedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Confidence = table.Column<decimal>(type: "TEXT", precision: 4, scale: 3, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ModifiedBy = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentVerifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DocumentVerifications_IdentityDocuments_DocumentId",
                        column: x => x.DocumentId,
                        principalTable: "IdentityDocuments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IdentityAttributeChanges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Field = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    PreviousValue = table.Column<string>(type: "TEXT", maxLength: 512, nullable: true),
                    NewValue = table.Column<string>(type: "TEXT", maxLength: 512, nullable: true),
                    ChangedBy = table.Column<Guid>(type: "TEXT", nullable: false),
                    ChangedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IdentityAttributeChanges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IdentityAttributeChanges_IdentityProfiles_ProfileId",
                        column: x => x.ProfileId,
                        principalTable: "IdentityProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BankAccounts_Iban",
                table: "BankAccounts",
                column: "Iban",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BankAccounts_UserId",
                table: "BankAccounts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Branches_Code_Scope",
                table: "Branches",
                columns: new[] { "Code", "Scope" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Branches_OrganizationId",
                table: "Branches",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_Brands_Code_Scope",
                table: "Brands",
                columns: new[] { "Code", "Scope" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Brands_OrganizationId",
                table: "Brands",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_Companies_Code_Scope",
                table: "Companies",
                columns: new[] { "Code", "Scope" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Companies_OrganizationId",
                table: "Companies",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_DigitalDocuments_FolderId_Category",
                table: "DigitalDocuments",
                columns: new[] { "FolderId", "Category" });

            migrationBuilder.CreateIndex(
                name: "IX_DigitalDocuments_IdentityDocumentId",
                table: "DigitalDocuments",
                column: "IdentityDocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_DigitalFolders_OrganizationId",
                table: "DigitalFolders",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_DigitalFolders_UserId",
                table: "DigitalFolders",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DocumentExtractions_DocumentId",
                table: "DocumentExtractions",
                column: "DocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentPages_DocumentId_PageNumber",
                table: "DocumentPages",
                columns: new[] { "DocumentId", "PageNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DocumentPages_Sha256Hash",
                table: "DocumentPages",
                column: "Sha256Hash");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentTypes_Code",
                table: "DocumentTypes",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DocumentVerifications_DocumentId_DecidedAt",
                table: "DocumentVerifications",
                columns: new[] { "DocumentId", "DecidedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_IdentityAttributeChanges_ProfileId_ChangedAt",
                table: "IdentityAttributeChanges",
                columns: new[] { "ProfileId", "ChangedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_IdentityDocuments_DocumentTypeId",
                table: "IdentityDocuments",
                column: "DocumentTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_IdentityDocuments_OrganizationId",
                table: "IdentityDocuments",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_IdentityDocuments_Status_ExpiresOn",
                table: "IdentityDocuments",
                columns: new[] { "Status", "ExpiresOn" });

            migrationBuilder.CreateIndex(
                name: "IX_IdentityDocuments_UserId_DocumentTypeId_Status",
                table: "IdentityDocuments",
                columns: new[] { "UserId", "DocumentTypeId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_IdentityProfiles_NationalId",
                table: "IdentityProfiles",
                column: "NationalId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IdentityProfiles_UserId",
                table: "IdentityProfiles",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Organizations_Code",
                table: "Organizations",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Organizations_OrganizationId",
                table: "Organizations",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_OtpChallenges_ExpiresAt",
                table: "OtpChallenges",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_OtpChallenges_Target_Purpose_Status",
                table: "OtpChallenges",
                columns: new[] { "Target", "Purpose", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_DispatchedAt_NextAttemptAt",
                table: "OutboxMessages",
                columns: new[] { "DispatchedAt", "NextAttemptAt" });

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_EventId",
                table: "OutboxMessages",
                column: "EventId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RateLimitCounters_WindowStartedAt",
                table: "RateLimitCounters",
                column: "WindowStartedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Stores_Code_Scope",
                table: "Stores",
                columns: new[] { "Code", "Scope" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Stores_OrganizationId",
                table: "Stores",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_UserAddresses_UserId",
                table: "UserAddresses",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserContacts_UserId_Kind_Value",
                table: "UserContacts",
                columns: new[] { "UserId", "Kind", "Value" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserEvents_OrganizationId",
                table: "UserEvents",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_UserEvents_UserId_Category",
                table: "UserEvents",
                columns: new[] { "UserId", "Category" });

            migrationBuilder.CreateIndex(
                name: "IX_UserEvents_UserId_OccurredAt",
                table: "UserEvents",
                columns: new[] { "UserId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_UserEventTypes_Code",
                table: "UserEventTypes",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserProfileChangeRequests_UserId_Status",
                table: "UserProfileChangeRequests",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_UserRoleAssignments_OrganizationId",
                table: "UserRoleAssignments",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_UserRoleAssignments_UserId_RoleCode",
                table: "UserRoleAssignments",
                columns: new[] { "UserId", "RoleCode" });

            migrationBuilder.CreateIndex(
                name: "IX_Users_Mobile",
                table: "Users",
                column: "Mobile",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_OrganizationId",
                table: "Users",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Scope",
                table: "Users",
                column: "Scope");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Status_MobileVerifiedAt",
                table: "Users",
                columns: new[] { "Status", "MobileVerifiedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BankAccounts");

            migrationBuilder.DropTable(
                name: "Branches");

            migrationBuilder.DropTable(
                name: "Brands");

            migrationBuilder.DropTable(
                name: "Companies");

            migrationBuilder.DropTable(
                name: "DigitalDocuments");

            migrationBuilder.DropTable(
                name: "DocumentExtractions");

            migrationBuilder.DropTable(
                name: "DocumentPages");

            migrationBuilder.DropTable(
                name: "DocumentVerifications");

            migrationBuilder.DropTable(
                name: "IdentityAttributeChanges");

            migrationBuilder.DropTable(
                name: "Organizations");

            migrationBuilder.DropTable(
                name: "OtpChallenges");

            migrationBuilder.DropTable(
                name: "OutboxMessages");

            migrationBuilder.DropTable(
                name: "RateLimitCounters");

            migrationBuilder.DropTable(
                name: "Stores");

            migrationBuilder.DropTable(
                name: "UserAddresses");

            migrationBuilder.DropTable(
                name: "UserContacts");

            migrationBuilder.DropTable(
                name: "UserEvents");

            migrationBuilder.DropTable(
                name: "UserEventTypes");

            migrationBuilder.DropTable(
                name: "UserProfileChangeRequests");

            migrationBuilder.DropTable(
                name: "UserRoleAssignments");

            migrationBuilder.DropTable(
                name: "DigitalFolders");

            migrationBuilder.DropTable(
                name: "IdentityDocuments");

            migrationBuilder.DropTable(
                name: "IdentityProfiles");

            migrationBuilder.DropTable(
                name: "DocumentTypes");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
