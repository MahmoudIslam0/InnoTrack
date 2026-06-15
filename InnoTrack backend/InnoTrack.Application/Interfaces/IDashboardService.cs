using InnoTrack.Application.DTOs.Dashboard;

namespace InnoTrack.Application.Interfaces
{
    public interface IDashboardService
    {
        Task<GlobalDashboardStatsDto> GetGlobalDashboardStatsAsync();
        Task<IReadOnlyList<PopularProjectDto>> GetPopularProjectsAsync(int limit);
        Task<IReadOnlyList<TrendingTechnologyDto>> GetTrendingTechnologiesAsync();
        Task<CurrentOriginalityWidgetDto> GetCurrentOriginalityWidget(int userId);
        Task<ProjectStatusWidgetDto> GetProjectStatusWidget(int userId);
        Task<IReadOnlyList<MostOriginalProjectCardDto>> GetMostOriginalProjectsAsync(bool thisYearOnly, int limit = 4);
    }
}