namespace InnoTrack.Application.DTOs.Dashboard
{
    public record GlobalDashboardStatsDto(
        int TotalProjects,
        int CompletedThisYear,
        int InProgressCount,
        IReadOnlyList<TechStatDto> TopTechnologies
    );

    public record TechStatDto(string Name, int Count);
}