using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InnoTrack.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAcademicYearScoping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AcademicYears",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AcademicYears", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AcademicYears_IsActive",
                table: "AcademicYears",
                column: "IsActive");

            migrationBuilder.Sql("INSERT INTO AcademicYears (Name, StartDate, EndDate, IsActive) VALUES ('2025/2026', GETDATE(), DATEADD(year, 1, GETDATE()), 1)");

            migrationBuilder.AddColumn<int>(
                name: "AcademicYearId",
                table: "Projects",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateIndex(
                name: "IX_Projects_AcademicYearId",
                table: "Projects",
                column: "AcademicYearId");

            migrationBuilder.AddForeignKey(
                name: "FK_Projects_AcademicYears_AcademicYearId",
                table: "Projects",
                column: "AcademicYearId",
                principalTable: "AcademicYears",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Projects_AcademicYears_AcademicYearId",
                table: "Projects");

            migrationBuilder.DropTable(
                name: "AcademicYears");

            migrationBuilder.DropIndex(
                name: "IX_Projects_AcademicYearId",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "AcademicYearId",
                table: "Projects");
        }
    }
}
