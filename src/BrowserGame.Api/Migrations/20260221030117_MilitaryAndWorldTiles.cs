using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class MilitaryAndWorldTiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Spearmen",
                table: "Villages",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Swordsmen",
                table: "Villages",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "TroopMovements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceVillageId = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetVillageId = table.Column<Guid>(type: "uuid", nullable: false),
                    UnitType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    UnitCount = table.Column<int>(type: "integer", nullable: false),
                    Mission = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    DepartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ArrivesAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TroopMovements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TroopMovements_Villages_SourceVillageId",
                        column: x => x.SourceVillageId,
                        principalTable: "Villages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TroopMovements_Villages_TargetVillageId",
                        column: x => x.TargetVillageId,
                        principalTable: "Villages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WorldTiles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    X = table.Column<int>(type: "integer", nullable: false),
                    Y = table.Column<int>(type: "integer", nullable: false),
                    Terrain = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorldTiles", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TroopMovements_ArrivesAt",
                table: "TroopMovements",
                column: "ArrivesAt");

            migrationBuilder.CreateIndex(
                name: "IX_TroopMovements_SourceVillageId",
                table: "TroopMovements",
                column: "SourceVillageId");

            migrationBuilder.CreateIndex(
                name: "IX_TroopMovements_TargetVillageId",
                table: "TroopMovements",
                column: "TargetVillageId");

            migrationBuilder.CreateIndex(
                name: "IX_WorldTiles_X_Y",
                table: "WorldTiles",
                columns: new[] { "X", "Y" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TroopMovements");

            migrationBuilder.DropTable(
                name: "WorldTiles");

            migrationBuilder.DropColumn(
                name: "Spearmen",
                table: "Villages");

            migrationBuilder.DropColumn(
                name: "Swordsmen",
                table: "Villages");
        }
    }
}
