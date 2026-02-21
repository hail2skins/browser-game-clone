using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class VillageGameState : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Clay",
                table: "Villages",
                type: "integer",
                nullable: false,
                defaultValue: 500);

            migrationBuilder.AddColumn<int>(
                name: "ClayPitLevel",
                table: "Villages",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "Iron",
                table: "Villages",
                type: "integer",
                nullable: false,
                defaultValue: 500);

            migrationBuilder.AddColumn<int>(
                name: "IronMineLevel",
                table: "Villages",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastResourceTickAt",
                table: "Villages",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "MainBuildingLevel",
                table: "Villages",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "TimberCampLevel",
                table: "Villages",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "WarehouseLevel",
                table: "Villages",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "Wood",
                table: "Villages",
                type: "integer",
                nullable: false,
                defaultValue: 500);

            migrationBuilder.AddColumn<int>(
                name: "X",
                table: "Villages",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Y",
                table: "Villages",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Clay",
                table: "Villages");

            migrationBuilder.DropColumn(
                name: "ClayPitLevel",
                table: "Villages");

            migrationBuilder.DropColumn(
                name: "Iron",
                table: "Villages");

            migrationBuilder.DropColumn(
                name: "IronMineLevel",
                table: "Villages");

            migrationBuilder.DropColumn(
                name: "LastResourceTickAt",
                table: "Villages");

            migrationBuilder.DropColumn(
                name: "MainBuildingLevel",
                table: "Villages");

            migrationBuilder.DropColumn(
                name: "TimberCampLevel",
                table: "Villages");

            migrationBuilder.DropColumn(
                name: "WarehouseLevel",
                table: "Villages");

            migrationBuilder.DropColumn(
                name: "Wood",
                table: "Villages");

            migrationBuilder.DropColumn(
                name: "X",
                table: "Villages");

            migrationBuilder.DropColumn(
                name: "Y",
                table: "Villages");
        }
    }
}
