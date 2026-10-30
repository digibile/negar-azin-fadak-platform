using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NegarAzinFadak.Migrations.PostgreSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddNavigationMenus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Menus",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Scope = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Level = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    EnglishTitle = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsPlatformDefined = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ModifiedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Menus", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MenuItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MenuId = table.Column<Guid>(type: "uuid", nullable: false),
                    ParentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    EnglishTitle = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Icon = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Route = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    RequiredPermissionCode = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Module = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Depth = table.Column<int>(type: "integer", nullable: false),
                    IsPlatformDefined = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Scope = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ModifiedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MenuItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MenuItems_Menus_MenuId",
                        column: x => x.MenuId,
                        principalTable: "Menus",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MenuItems_MenuId_ParentId_Code",
                table: "MenuItems",
                columns: new[] { "MenuId", "ParentId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MenuItems_MenuId_ParentId_SortOrder",
                table: "MenuItems",
                columns: new[] { "MenuId", "ParentId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_MenuItems_OrganizationId",
                table: "MenuItems",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_MenuItems_RequiredPermissionCode_IsActive",
                table: "MenuItems",
                columns: new[] { "RequiredPermissionCode", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_Menus_Code_Scope",
                table: "Menus",
                columns: new[] { "Code", "Scope" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Menus_OrganizationId",
                table: "Menus",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_Menus_Scope_Level_IsActive",
                table: "Menus",
                columns: new[] { "Scope", "Level", "IsActive" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MenuItems");

            migrationBuilder.DropTable(
                name: "Menus");
        }
    }
}
