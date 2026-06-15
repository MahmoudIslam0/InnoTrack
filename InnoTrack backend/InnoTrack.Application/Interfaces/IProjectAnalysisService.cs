using InnoTrack.Application.DTOs.AI;

namespace InnoTrack.Application.Interfaces
{
    public interface IProjectAnalysisService
    {
        Task ProcessProjectAiReportAsync(int projectId);
        Task<OriginalityReportDto> GetOriginalityReportAsync(int projectId, int userId, string role);
    }
}
