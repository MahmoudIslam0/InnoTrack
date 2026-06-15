using InnoTrack.Application.DTOs.Projects;

namespace InnoTrack.Application.Interfaces
{
    public interface IProjectService
    {
        Task VerifyProjectForSubmissionAsync(int projectId, int userId, SubmitProjectRequestDto dto);
        Task<List<ProjectActivityLogDto>> GetProjectLogsAsync(int projectId);
        Task ToggleProjectMuteAsync(int userId, int projectId);
    }
}
