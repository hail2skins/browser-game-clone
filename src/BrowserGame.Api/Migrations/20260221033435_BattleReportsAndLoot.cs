using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class BattleReportsAndLoot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LootClay",
                table: "TroopMovements",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "LootIron",
                table: "TroopMovements",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "LootWood",
                table: "TroopMovements",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "BattleReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AttackerUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    DefenderUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AttackerVillageName = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    DefenderVillageName = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    UnitType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    AttackerSent = table.Column<int>(type: "integer", nullable: false),
                    AttackerSurvivors = table.Column<int>(type: "integer", nullable: false),
                    DefenderSurvivors = table.Column<int>(type: "integer", nullable: false),
                    LootWood = table.Column<int>(type: "integer", nullable: false),
                    LootClay = table.Column<int>(type: "integer", nullable: false),
                    LootIron = table.Column<int>(type: "integer", nullable: false),
                    Outcome = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BattleReports", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BattleReports_AttackerUserId_CreatedAt",
                table: "BattleReports",
                columns: new[] { "AttackerUserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_BattleReports_DefenderUserId_CreatedAt",
                table: "BattleReports",
                columns: new[] { "DefenderUserId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BattleReports");

            migrationBuilder.DropColumn(
                name: "LootClay",
                table: "TroopMovements");

            migrationBuilder.DropColumn(
                name: "LootIron",
                table: "TroopMovements");

            migrationBuilder.DropColumn(
                name: "LootWood",
                table: "TroopMovements");
        }
    }
}
