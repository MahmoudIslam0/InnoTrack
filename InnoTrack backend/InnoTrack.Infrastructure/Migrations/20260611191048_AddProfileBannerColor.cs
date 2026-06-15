using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InnoTrack.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProfileBannerColor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProfileBannerColor",
                table: "Users",
                type: "nvarchar(7)",
                maxLength: 7,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProfileBannerColor",
                table: "Users");
        }
    }
}
