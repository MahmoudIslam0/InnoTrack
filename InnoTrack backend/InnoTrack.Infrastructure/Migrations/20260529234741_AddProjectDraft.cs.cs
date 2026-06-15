using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InnoTrack.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectDraftcs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SimilarProjects_Projects_ProjectId",
                table: "SimilarProjects");

            migrationBuilder.DropIndex(
                name: "IX_SimilarProjects_ProjectId",
                table: "SimilarProjects");

            migrationBuilder.DropColumn(
                name: "ProjectId",
                table: "SimilarProjects");

            migrationBuilder.CreateTable(
                name: "ProjectDrafts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Abstract = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    StudentNames = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OriginalityScore = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TeamId = table.Column<int>(type: "int", nullable: false),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    DomainId = table.Column<int>(type: "int", nullable: false),
                    ProblemStatement = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProposedSolution = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Objectives = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectDrafts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectDrafts_Domains_DomainId",
                        column: x => x.DomainId,
                        principalTable: "Domains",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProjectDrafts_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectDrafts_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProjectDraftTechnologies",
                columns: table => new
                {
                    ProjectDraftId = table.Column<int>(type: "int", nullable: false),
                    TechnologyId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectDraftTechnologies", x => new { x.ProjectDraftId, x.TechnologyId });
                    table.ForeignKey(
                        name: "FK_ProjectDraftTechnologies_ProjectDrafts_ProjectDraftId",
                        column: x => x.ProjectDraftId,
                        principalTable: "ProjectDrafts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectDraftTechnologies_Technologies_TechnologyId",
                        column: x => x.TechnologyId,
                        principalTable: "Technologies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectDrafts_CreatedByUserId",
                table: "ProjectDrafts",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectDrafts_DomainId",
                table: "ProjectDrafts",
                column: "DomainId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectDrafts_TeamId",
                table: "ProjectDrafts",
                column: "TeamId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectDraftTechnologies_TechnologyId",
                table: "ProjectDraftTechnologies",
                column: "TechnologyId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProjectDraftTechnologies");

            migrationBuilder.DropTable(
                name: "ProjectDrafts");

            migrationBuilder.AddColumn<int>(
                name: "ProjectId",
                table: "SimilarProjects",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SimilarProjects_ProjectId",
                table: "SimilarProjects",
                column: "ProjectId");

            migrationBuilder.AddForeignKey(
                name: "FK_SimilarProjects_Projects_ProjectId",
                table: "SimilarProjects",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "Id");
        }
    }
}
