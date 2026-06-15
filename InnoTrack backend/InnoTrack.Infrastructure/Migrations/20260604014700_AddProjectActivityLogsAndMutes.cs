using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InnoTrack.Infrastructure.Migrations
{
    public partial class AddProjectActivityLogsAndMutes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Empty to bypass duplicate table error
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProjectActivityLogs");

            migrationBuilder.DropTable(
                name: "ProjectNotificationPreferences");
        }
    }
}
