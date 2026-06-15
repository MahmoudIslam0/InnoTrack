using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InnoTrack.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPublicShowcaseToProject : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MaxTeamLoad",
                table: "Users",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPublicShowcase",
                table: "Projects",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxTeamLoad",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IsPublicShowcase",
                table: "Projects");
        }
    }
}
