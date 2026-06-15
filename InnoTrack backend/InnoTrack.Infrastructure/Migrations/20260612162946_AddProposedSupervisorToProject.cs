using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InnoTrack.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProposedSupervisorToProject : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ProposedSupervisorId",
                table: "Projects",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Projects_ProposedSupervisorId",
                table: "Projects",
                column: "ProposedSupervisorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Projects_Users_ProposedSupervisorId",
                table: "Projects",
                column: "ProposedSupervisorId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Projects_Users_ProposedSupervisorId",
                table: "Projects");

            migrationBuilder.DropIndex(
                name: "IX_Projects_ProposedSupervisorId",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "ProposedSupervisorId",
                table: "Projects");
        }
    }
}
