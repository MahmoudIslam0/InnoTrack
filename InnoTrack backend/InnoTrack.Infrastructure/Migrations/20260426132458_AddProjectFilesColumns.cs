using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InnoTrack.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectFilesColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "UploadedAt",
                table: "ProjectAttachments",
                newName: "UploadDate");

            migrationBuilder.RenameColumn(
                name: "FileUrl",
                table: "ProjectAttachments",
                newName: "FilePath");

            migrationBuilder.RenameColumn(
                name: "FileType",
                table: "ProjectAttachments",
                newName: "ContentType");

            migrationBuilder.AlterColumn<string>(
                name: "JoinCode",
                table: "Teams",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20);

            migrationBuilder.AddColumn<string>(
                name: "OriginalName",
                table: "ProjectAttachments",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OriginalName",
                table: "ProjectAttachments");

            migrationBuilder.RenameColumn(
                name: "UploadDate",
                table: "ProjectAttachments",
                newName: "UploadedAt");

            migrationBuilder.RenameColumn(
                name: "FilePath",
                table: "ProjectAttachments",
                newName: "FileUrl");

            migrationBuilder.RenameColumn(
                name: "ContentType",
                table: "ProjectAttachments",
                newName: "FileType");

            migrationBuilder.AlterColumn<string>(
                name: "JoinCode",
                table: "Teams",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30);
        }
    }
}
