using InnoTrack.Application.Common;
using InnoTrack.Application.DTOs.Professors;
using InnoTrack.Application.DTOs.Projects;
using InnoTrack.Application.DTOs.Teams;
namespace InnoTrack.Application.Interfaces
{
    public interface IProfessorProjectService
    {
        Task<PagedResult<ProfessorPendingProjectDto>> GetPendingProjectsAsync(int professorId, int pageNumber, int pageSize);
        Task ReviewProjectAsync(int professorId, int projectId, bool approve);
        Task<IReadOnlyList<ProfessorSupervisedProjectDto>> GetSupervisedProjectsAsync(int professorId);
        Task<IReadOnlyList<ProfessorSupervisedTeamDto>> GetSupervisedTeamsAsync(int professorId);

        /// <summary>Full proposal detail for a single project, for informed review decisions.</summary>
        Task<ProfessorProjectDetailDto> GetProjectDetailAsync(int professorId, int projectId);

        /// <summary>
        /// Returns the project to Draft with a reason stored as feedback.
        /// Students may then revise and resubmit.
        /// </summary>
        Task RequestRevisionAsync(int professorId, int projectId, string reason);

        /// <summary>Aggregate workload overview for the professor's personal dashboard.</summary>
        Task<ProfessorDashboardDto> GetDashboardAsync(int professorId);

    }
}
