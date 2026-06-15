using InnoTrack.Application.Common;
using InnoTrack.Application.DTOs.AI;
using InnoTrack.Application.DTOs.Projects;

namespace InnoTrack.Application.Interfaces
{
    public interface IProjectCatalogService
    {
        Task<PagedResult<ProjectCatalogItemDto>> GetProjectsAsync(
            ProjectCatalogFilterDto filter, int pageNumber, int pageSize);
        Task<CatalogTabsCountDto> GetCatalogTabsCountAsync();
        Task<ProjectCatalogDetailDto> GetProjectByIdAsync(int projectId, int? userId = null);
        Task<MyProjectResponseDto?> GetMyProjectAsync(int userId);
        Task<IReadOnlyList<ProjectDraftDto>> GetMyDraftsAsync(int userId);
        Task<ProjectDraftDto> GetDraftByIdAsync(int draftId, int userId);

        Task<IReadOnlyList<SupervisorDto>> GetSupervisorsAsync(int? departmentId = null);
        Task<SaveDraftResponseDto> SaveDraftAsync(int userId, SaveProjectDraftDto dto);
        Task<SaveDraftResponseDto> UpdateDraftAsync(int draftId, int userId, SaveProjectDraftDto dto);
        Task DeleteDraftAsync(int draftId, int userId);
        Task UpdateProjectDetailsAsync(int projectId, int userId, UpdateProjectDetailsDto dto);
        Task RecallSubmissionAsync(int projectId, int userId);
        Task<SimilarityCheckResponseDto> RunSimilarityCheckAsync(SimilarityCheckRequestDto dto);
        Task<string> GenerateAiAbstractAsync(int userId, GenerateAbstractRequestDto dto);
        Task AbandonProjectAsync(int projectId, int userId, string reason);
        Task<List<PublicShowcaseDto>> GetPublicShowcaseAsync();
    }
}
