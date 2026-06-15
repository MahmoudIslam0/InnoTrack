using InnoTrack.Application.Common;
using InnoTrack.Application.DTOs.Admin;
using InnoTrack.Domain.Entities.Enums;

namespace InnoTrack.Application.Interfaces
{
    public interface IAdminService
    {
        // ── Dashboard ────────────────────────────────────────────────────────────
        Task<AdminDashboardDto> GetDashboardAsync();

        // ── Student Management ───────────────────────────────────────────────────
        Task<PagedResult<StudentAdminViewDto>> SearchStudentsAsync(
            string? search, int? departmentId, bool? hasTeam, bool? isActive,
            int pageNumber, int pageSize);

        Task<StudentDetailForAdminDto> GetStudentDetailAsync(int studentId);
        Task SetStudentActiveStatusAsync(int studentId, bool isActive);
        Task ResetStudentPasswordAsync(int studentId, string newPassword);

        /// <summary>
        /// Soft-deletes a student account (IsDeleted = true).
        /// Blocked if the student is a team leader with an active project.
        /// </summary>
        Task SoftDeleteStudentAsync(int adminId, int studentId);

        // ── Team Management ──────────────────────────────────────────────────────
        Task<PagedResult<AdminTeamListItemDto>> GetAllTeamsAsync(
            string? search, bool? hasSupervisor, string? projectStatus,
            int pageNumber, int pageSize);
        Task AssignSupervisorToTeamAsync(int teamId, int professorId);
        Task DeleteTeamByAdminAsync(int adminId, int teamId);
        Task RemoveSupervisorFromTeamAsync(int teamId);

        // ── Project Management ───────────────────────────────────────────────────
        Task<PagedResult<AdminProjectListItemDto>> GetAllProjectsAsync(
            string? search, string? status, int? domainId, int? academicYearId,
            int pageNumber, int pageSize);
        Task<AdminProjectDetailDto> GetProjectDetailAsync(int projectId);

        /// <summary>Force-transitions a project to any status with a mandatory audit reason.</summary>
        Task OverrideProjectStatusAsync(
            int adminId, int projectId, ProjectStatus newStatus, string reason);

        /// <summary>Reassigns the supervising professor for a project's team.</summary>
        Task ReassignProjectSupervisorAsync(int adminId, int projectId, int newProfessorId);

        /// <summary>
        /// Finds projects stuck in UnderReview for over 48 hours with no originality score
        /// (indicating a failed Hangfire job) and resets them to Draft so students can resubmit.
        /// </summary>
        Task<int> ResetStuckProjectsAsync(int adminId);

        // ── Audit Logs ───────────────────────────────────────────────────────────
        Task<PagedResult<AuditLogDto>> GetAuditLogsAsync(
            string? search, string? action, DateTime? from, DateTime? to,
            int pageNumber, int pageSize);
        // ── Quick Actions ─────────────────────────────────────────────────────────────

        /// <summary>
        /// Deactivates the currently active academic year.
        /// Students will be unable to create new project drafts until a new year is opened.
        /// </summary>
        Task CloseCurrentAcademicYearAsync(int adminId);

        /// <summary>
        /// Invalidates all active refresh tokens for every non-admin user,
        /// forcing a full re-login on their next request.
        /// Returns the count of sessions terminated.
        /// </summary>
        Task<int> ForceLogoutAllUsersAsync(int adminId);

    }
}