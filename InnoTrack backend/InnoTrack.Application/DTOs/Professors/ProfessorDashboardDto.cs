using InnoTrack.Application.DTOs.Teams;

namespace InnoTrack.Application.DTOs.Professors
{
    public record ProfessorDashboardDto(
        int TotalSupervisedTeams,
        int PendingReviewCount,
        int ActiveProjectCount,
        int ApprovedCount,
        int RejectedCount,
        decimal? AverageOriginalityScore,
        IReadOnlyList<ProfessorSupervisedTeamDto> RecentTeams
    );
}