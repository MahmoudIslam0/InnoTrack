namespace InnoTrack.Application.DTOs.Analytics
{
    public record SystemAnalyticsDto
        (int TotalUsers, int TotalTeams, int TotalProjects, decimal AverageOriginalityScore);
}
