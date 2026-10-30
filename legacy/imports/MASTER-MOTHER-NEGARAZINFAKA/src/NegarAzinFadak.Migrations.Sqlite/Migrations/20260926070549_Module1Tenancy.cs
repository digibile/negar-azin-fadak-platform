using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NegarAzinFadak.Migrations.Sqlite.Migrations
{
    /// <inheritdoc />
    public partial class Module1Tenancy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Stores_Code_Scope",
                table: "Stores");

            migrationBuilder.DropIndex(
                name: "IX_Companies_Code_Scope",
                table: "Companies");

            migrationBuilder.DropIndex(
                name: "IX_Brands_Code_Scope",
                table: "Brands");

            migrationBuilder.DropIndex(
                name: "IX_Branches_Code_Scope",
                table: "Branches");

            migrationBuilder.AddColumn<Guid>(
                name: "ParentId",
                table: "Stores",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ParentId",
                table: "Organizations",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ParentId",
                table: "Companies",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ParentId",
                table: "Brands",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ParentId",
                table: "Branches",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AuditRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Action = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    ResourceType = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    ResourceId = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    Outcome = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    ActorUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Scope = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    OccurredAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CorrelationId = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    ReasonCode = table.Column<string>(type: "TEXT", maxLength: 128, nullable: true),
                    Attributes = table.Column<string>(type: "TEXT", maxLength: 4096, nullable: true),
                    OrganizationId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditRecords", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OrganizationalUnitStatusChange",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UnitId = table.Column<Guid>(type: "TEXT", nullable: false),
                    From = table.Column<int>(type: "INTEGER", nullable: false),
                    To = table.Column<int>(type: "INTEGER", nullable: false),
                    Reason = table.Column<string>(type: "TEXT", nullable: true),
                    ActorId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ChangedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Scope = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ModifiedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    BranchId = table.Column<Guid>(type: "TEXT", nullable: true),
                    BrandId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CompanyId = table.Column<Guid>(type: "TEXT", nullable: true),
                    OrganizationId = table.Column<Guid>(type: "TEXT", nullable: false),
                    StoreId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationalUnitStatusChange", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrganizationalUnitStatusChange_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_OrganizationalUnitStatusChange_Brands_BrandId",
                        column: x => x.BrandId,
                        principalTable: "Brands",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_OrganizationalUnitStatusChange_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_OrganizationalUnitStatusChange_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrganizationalUnitStatusChange_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Permissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    Category = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1024, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ModifiedBy = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Permissions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Scope = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1024, nullable: true),
                    IsBuiltIn = table.Column<bool>(type: "INTEGER", nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ModifiedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    OrganizationId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TenantConfigurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Scope = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ModifiedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    OrganizationId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantConfigurations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RolePermissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    RoleId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PermissionCode = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    GrantedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    GrantedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    RevokedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    RevokedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    IsRevoked = table.Column<bool>(type: "INTEGER", nullable: false),
                    Scope = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    OrganizationId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolePermissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RolePermissions_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TenantSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ConfigurationId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    Value = table.Column<string>(type: "TEXT", maxLength: 4096, nullable: false),
                    Kind = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    IsSensitive = table.Column<bool>(type: "INTEGER", nullable: false),
                    RangeMinimum = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    RangeMaximum = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    Scope = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    OrganizationId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TenantSettings_TenantConfigurations_ConfigurationId",
                        column: x => x.ConfigurationId,
                        principalTable: "TenantConfigurations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Stores_ParentId",
                table: "Stores",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_Stores_ParentId_Code",
                table: "Stores",
                columns: new[] { "ParentId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Companies_ParentId",
                table: "Companies",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_Companies_ParentId_Code",
                table: "Companies",
                columns: new[] { "ParentId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Brands_ParentId",
                table: "Brands",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_Brands_ParentId_Code",
                table: "Brands",
                columns: new[] { "ParentId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Branches_ParentId",
                table: "Branches",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_Branches_ParentId_Code",
                table: "Branches",
                columns: new[] { "ParentId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AuditRecords_ActorUserId_OccurredAt",
                table: "AuditRecords",
                columns: new[] { "ActorUserId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditRecords_OccurredAt",
                table: "AuditRecords",
                column: "OccurredAt");

            migrationBuilder.CreateIndex(
                name: "IX_AuditRecords_OrganizationId",
                table: "AuditRecords",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditRecords_ResourceType_ResourceId_OccurredAt",
                table: "AuditRecords",
                columns: new[] { "ResourceType", "ResourceId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationalUnitStatusChange_BranchId",
                table: "OrganizationalUnitStatusChange",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationalUnitStatusChange_BrandId",
                table: "OrganizationalUnitStatusChange",
                column: "BrandId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationalUnitStatusChange_CompanyId",
                table: "OrganizationalUnitStatusChange",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationalUnitStatusChange_OrganizationId",
                table: "OrganizationalUnitStatusChange",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationalUnitStatusChange_StoreId",
                table: "OrganizationalUnitStatusChange",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_Permissions_Category_IsActive",
                table: "Permissions",
                columns: new[] { "Category", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_Permissions_Code",
                table: "Permissions",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RolePermissions_OrganizationId",
                table: "RolePermissions",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_RolePermissions_PermissionCode_IsRevoked",
                table: "RolePermissions",
                columns: new[] { "PermissionCode", "IsRevoked" });

            migrationBuilder.CreateIndex(
                name: "IX_RolePermissions_RoleId_PermissionCode",
                table: "RolePermissions",
                columns: new[] { "RoleId", "PermissionCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Roles_Code_Scope",
                table: "Roles",
                columns: new[] { "Code", "Scope" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Roles_OrganizationId",
                table: "Roles",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_Roles_Scope_Status",
                table: "Roles",
                columns: new[] { "Scope", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_TenantConfigurations_OrganizationId",
                table: "TenantConfigurations",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_TenantConfigurations_Scope",
                table: "TenantConfigurations",
                column: "Scope",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TenantSettings_ConfigurationId_Code",
                table: "TenantSettings",
                columns: new[] { "ConfigurationId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TenantSettings_OrganizationId",
                table: "TenantSettings",
                column: "OrganizationId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditRecords");

            migrationBuilder.DropTable(
                name: "OrganizationalUnitStatusChange");

            migrationBuilder.DropTable(
                name: "Permissions");

            migrationBuilder.DropTable(
                name: "RolePermissions");

            migrationBuilder.DropTable(
                name: "TenantSettings");

            migrationBuilder.DropTable(
                name: "Roles");

            migrationBuilder.DropTable(
                name: "TenantConfigurations");

            migrationBuilder.DropIndex(
                name: "IX_Stores_ParentId",
                table: "Stores");

            migrationBuilder.DropIndex(
                name: "IX_Stores_ParentId_Code",
                table: "Stores");

            migrationBuilder.DropIndex(
                name: "IX_Companies_ParentId",
                table: "Companies");

            migrationBuilder.DropIndex(
                name: "IX_Companies_ParentId_Code",
                table: "Companies");

            migrationBuilder.DropIndex(
                name: "IX_Brands_ParentId",
                table: "Brands");

            migrationBuilder.DropIndex(
                name: "IX_Brands_ParentId_Code",
                table: "Brands");

            migrationBuilder.DropIndex(
                name: "IX_Branches_ParentId",
                table: "Branches");

            migrationBuilder.DropIndex(
                name: "IX_Branches_ParentId_Code",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "ParentId",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "ParentId",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "ParentId",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "ParentId",
                table: "Brands");

            migrationBuilder.DropColumn(
                name: "ParentId",
                table: "Branches");

            migrationBuilder.CreateIndex(
                name: "IX_Stores_Code_Scope",
                table: "Stores",
                columns: new[] { "Code", "Scope" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Companies_Code_Scope",
                table: "Companies",
                columns: new[] { "Code", "Scope" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Brands_Code_Scope",
                table: "Brands",
                columns: new[] { "Code", "Scope" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Branches_Code_Scope",
                table: "Branches",
                columns: new[] { "Code", "Scope" },
                unique: true);
        }
    }
}
