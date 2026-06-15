using InnoTrack.Application.DTOs.Analytics;

namespace InnoTrack.Application.Interfaces
{
    public interface IAnalyticsService
    {
        Task<SystemAnalyticsDto> GetSystemAnalyticsAsync();
    }
}
