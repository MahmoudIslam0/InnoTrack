using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InnoTrack.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SyncWithAzureDb : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('SimilarProjects', 'ProjectId') IS NULL
                    ALTER TABLE [SimilarProjects] ADD [ProjectId] int NULL;
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('Projects', 'StudentNames') IS NULL
                    ALTER TABLE [Projects] ADD [StudentNames] nvarchar(max) NULL;
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('Projects', 'Year') IS NULL
                    ALTER TABLE [Projects] ADD [Year] int NULL;
                """);

            migrationBuilder.Sql("""
                IF NOT EXISTS (
                    SELECT 1
                    FROM sys.indexes
                    WHERE [name] = N'IX_SimilarProjects_ProjectId'
                        AND [object_id] = OBJECT_ID(N'[SimilarProjects]')
                )
                    CREATE INDEX [IX_SimilarProjects_ProjectId] ON [SimilarProjects] ([ProjectId]);
                """);

            migrationBuilder.Sql("""
                IF NOT EXISTS (
                    SELECT 1
                    FROM sys.foreign_keys
                    WHERE [name] = N'FK_SimilarProjects_Projects_ProjectId'
                )
                    ALTER TABLE [SimilarProjects]
                    ADD CONSTRAINT [FK_SimilarProjects_Projects_ProjectId]
                    FOREIGN KEY ([ProjectId]) REFERENCES [Projects] ([Id]);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF EXISTS (
                    SELECT 1
                    FROM sys.foreign_keys
                    WHERE [name] = N'FK_SimilarProjects_Projects_ProjectId'
                )
                    ALTER TABLE [SimilarProjects] DROP CONSTRAINT [FK_SimilarProjects_Projects_ProjectId];
                """);

            migrationBuilder.Sql("""
                IF EXISTS (
                    SELECT 1
                    FROM sys.indexes
                    WHERE [name] = N'IX_SimilarProjects_ProjectId'
                        AND [object_id] = OBJECT_ID(N'[SimilarProjects]')
                )
                    DROP INDEX [IX_SimilarProjects_ProjectId] ON [SimilarProjects];
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('SimilarProjects', 'ProjectId') IS NOT NULL
                    ALTER TABLE [SimilarProjects] DROP COLUMN [ProjectId];
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('Projects', 'StudentNames') IS NOT NULL
                    ALTER TABLE [Projects] DROP COLUMN [StudentNames];
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('Projects', 'Year') IS NOT NULL
                    ALTER TABLE [Projects] DROP COLUMN [Year];
                """);
        }
    }
}
