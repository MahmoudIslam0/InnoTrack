using InnoTrack.Application.DTOs.Projects;

namespace InnoTrack.Application.DTOs.AI
{
    public record OriginalityReportDto(
            int ProjectId,
            string ProjectTitle,
            string TeamName,
            string? SupervisorName,
            decimal OverallScore,
            string Summary,
            DateTime GeneratedAt,
            IReadOnlyList<SimilarProjectResultDto> SimilarProjects
        );
}
