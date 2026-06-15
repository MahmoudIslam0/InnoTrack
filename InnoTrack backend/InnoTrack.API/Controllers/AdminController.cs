using InnoTrack.API.Attributes;
using InnoTrack.Application.DTOs.Admin;
using InnoTrack.Application.DTOs.Professors;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Entities.Enums;
using InnoTrack.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace InnoTrack.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AuthorizeRoles(UserRole.Admin)]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;
        private readonly IStudentService _studentService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IProfessorAdminService _professorAdminService;
        private readonly IAcademicYearService _academicYearService;
        private readonly IAuditService _auditService;

        public AdminController(
            IAdminService adminService,
            IStudentService studentService,
            IUnitOfWork unitOfWork,
            IProfessorAdminService professorAdminService,
            IAcademicYearService academicYearService,
            IAuditService auditService)
        {
            _adminService = adminService;
            _studentService = studentService;
            _unitOfWork = unitOfWork;
            _professorAdminService = professorAdminService;
            _academicYearService = academicYearService;
            _auditService = auditService;
        }

        private int GetUserId()
        {
            var v = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(v) || !int.TryParse(v, out int id))
                throw new UnauthorizedAccessException("Invalid User Token.");
            return id;
        }

        // ══════════════════════════════════════════════════════════════════════════
        // DASHBOARD
        // ══════════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Returns a comprehensive admin dashboard: user/team/project counts,
        /// originality score average, system-health alerts, and the 10 most recent
        /// audit entries. The response surface is designed for an admin's landing page.
        /// </summary>
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            var dashboard = await _adminService.GetDashboardAsync();
            return Ok(dashboard);
        }

        // ══════════════════════════════════════════════════════════════════════════
        // STUDENT MANAGEMENT
        // ══════════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Paginated, searchable, and filterable student list.
        /// Supports free-text search across name and email, department filter,
        /// team-membership filter, and active-status filter.
        /// Supersedes the legacy GET /api/admin/students endpoint.
        /// </summary>
        [HttpGet("students")]
        public async Task<IActionResult> SearchStudents(
            [FromQuery] string? search,
            [FromQuery] int? departmentId,
            [FromQuery] bool? hasTeam,
            [FromQuery] bool? isActive,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _adminService.SearchStudentsAsync(
                search, departmentId, hasTeam, isActive, pageNumber, pageSize);
            return Ok(result);
        }

        /// <summary>
        /// Returns the complete admin-level profile for a single student,
        /// including team membership, project info, skills, and deletion status.
        /// </summary>
        [HttpGet("students/{studentId:int}")]
        public async Task<IActionResult> GetStudentDetail(int studentId)
        {
            var student = await _adminService.GetStudentDetailAsync(studentId);
            return Ok(student);
        }

        /// <summary>
        /// Activates or deactivates a student account.
        /// Deactivation immediately invalidates the student's active session.
        /// </summary>
        [HttpPatch("students/{studentId:int}/status")]
        public async Task<IActionResult> SetStudentStatus(
            int studentId, [FromBody] AdminSetStudentStatusDto dto)
        {
            var adminId = GetUserId();
            await _adminService.SetStudentActiveStatusAsync(studentId, dto.IsActive);

            _auditService.LogAction(adminId, "Student Status Change",
                $"Student {studentId} active status → {dto.IsActive}.");

            return NoContent();
        }

        /// <summary>
        /// Resets a student's password and immediately invalidates their current session.
        /// </summary>
        [HttpPatch("students/{studentId:int}/reset-password")]
        public async Task<IActionResult> ResetStudentPassword(
            int studentId, [FromBody] AdminResetPasswordDto dto)
        {
            var adminId = GetUserId();
            await _adminService.ResetStudentPasswordAsync(studentId, dto.NewPassword);

            _auditService.LogAction(adminId, "Student Password Reset",
                $"Admin reset password for student ID {studentId}.");

            return NoContent();
        }

        /// <summary>
        /// Soft-deletes a student account (IsDeleted = true, session invalidated).
        /// Blocked if the student is a team leader with an active project.
        /// Soft-deleted students are invisible to all non-admin queries due to the global query filter.
        /// </summary>
        [HttpDelete("students/{studentId:int}")]
        public async Task<IActionResult> SoftDeleteStudent(int studentId)
        {
            var adminId = GetUserId();
            await _adminService.SoftDeleteStudentAsync(adminId, studentId);
            return NoContent();
        }

        // ══════════════════════════════════════════════════════════════════════════
        // PROFESSOR MANAGEMENT  (unchanged from previous session)
        // ══════════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Provisions a new professor account.
        /// This is the ONLY way professor accounts are created — the public
        /// /auth/register endpoint creates Students exclusively.
        /// </summary>
        [HttpPost("professors")]
        public async Task<IActionResult> CreateProfessor([FromBody] CreateProfessorDto dto)
        {
            var adminId = GetUserId();
            var result = await _professorAdminService.CreateProfessorAsync(dto);

            _auditService.LogAction(adminId, "Create Professor",
                $"Provisioned professor: {dto.Email} → ID {result.Id}.");

            return CreatedAtAction(nameof(GetProfessorById), new { professorId = result.Id }, result);
        }

        /// <summary>
        /// Deletes a professor account.
        /// Deletion is blocked if the professor is supervising teams with
        /// Draft, Approved, In Progress, or Completed projects.
        /// Reassign those teams before attempting deletion.
        /// </summary>
        [HttpDelete("professors/{professorId:int}")]
        public async Task<IActionResult> DeleteProfessor(int professorId)
        {
            var adminId = GetUserId();
            await _professorAdminService.DeleteProfessorByAdminAsync(adminId, professorId);
            return NoContent();
        }

        /// <summary>Returns all professor accounts with current team load info, paginated.</summary>
        [HttpGet("professors")]
        public async Task<IActionResult> GetAllProfessors(
            [FromQuery] string? search,
            [FromQuery] int? departmentId,
            [FromQuery] bool? isActive,
            [FromQuery] bool? hasCapacity,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _professorAdminService.GetAllProfessorsAsync(
                search, departmentId, isActive, hasCapacity, pageNumber, pageSize);

            return Ok(result);
        }

        /// <summary>Returns full details for a single professor.</summary>
        [HttpGet("professors/{professorId:int}")]
        public async Task<IActionResult> GetProfessorById(int professorId)
        {
            return Ok(await _professorAdminService.GetProfessorByIdAsync(professorId));
        }

        /// <summary>Updates a professor's name, department, capacity, or active status.</summary>
        [HttpPut("professors/{professorId:int}")]
        public async Task<IActionResult> UpdateProfessor(
            int professorId, [FromBody] UpdateProfessorAdminDto dto)
        {
            var adminId = GetUserId();
            await _professorAdminService.UpdateProfessorAsync(professorId, dto);

            _auditService.LogAction(adminId, "Update Professor", $"Updated professor ID {professorId}.");

            return NoContent();
        }

        /// <summary>Activates or deactivates a professor account.</summary>
        [HttpPatch("professors/{professorId:int}/status")]
        public async Task<IActionResult> SetProfessorStatus(
            int professorId, [FromBody] SetActiveStatusDto dto)
        {
            var adminId = GetUserId();
            await _professorAdminService.SetProfessorActiveStatusAsync(professorId, dto.IsActive);

            _auditService.LogAction(adminId, "Professor Status",
                $"Professor {professorId} active → {dto.IsActive}.");

            return NoContent();
        }

        /// <summary>Admin-initiated password reset for a professor account.</summary>
        [HttpPatch("professors/{professorId:int}/reset-password")]
        public async Task<IActionResult> ResetProfessorPassword(
            int professorId, [FromBody] AdminResetPasswordDto dto)
        {
            var adminId = GetUserId();
            await _professorAdminService.ResetProfessorPasswordAsync(professorId, dto.NewPassword);

            _auditService.LogAction(adminId, "Reset Professor Password",
                $"Admin reset password for professor ID {professorId}.");

            return NoContent();
        }

        // ══════════════════════════════════════════════════════════════════════════
        // TEAM MANAGEMENT
        // ══════════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Returns a paginated list of all teams with supervisor status, project info,
        /// and a SupervisorIsActive flag that surfaces teams with deactivated supervisors.
        /// </summary>
        [HttpGet("teams")]
        public async Task<IActionResult> GetAllTeams(
            [FromQuery] string? search,
            [FromQuery] bool? hasSupervisor, // true = Assigned, false = Unassigned
            [FromQuery] string? projectStatus, // e.g., "In Progress", "No Project", "Completed"
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _adminService.GetAllTeamsAsync(
                search, hasSupervisor, projectStatus, pageNumber, pageSize);

            return Ok(result);
        }

        /// <summary>
        /// Assigns a professor as supervisor for the specified team.
        /// Enforces capacity limits and requires the professor to be active.
        /// Replaces any existing supervisor assignment.
        /// Both the professor and team members are notified.
        /// </summary>
        [HttpPatch("teams/{teamId:int}/assign-supervisor")]
        public async Task<IActionResult> AssignSupervisor(
            int teamId, [FromBody] AssignSupervisorDto dto)
        {
            var adminId = GetUserId();
            await _adminService.AssignSupervisorToTeamAsync(teamId, dto.ProfessorId);

            _auditService.LogAction(adminId, "Assign Supervisor",
                $"Admin assigned professor {dto.ProfessorId} to team {teamId}.");

            return NoContent();
        }

        /// <summary>
        /// Deletes a team and removes all related data including members,
        /// join requests, drafts, and the associated project (if eligible).
        /// Teams with In Progress or Completed projects cannot be deleted.
        /// </summary>
        [HttpDelete("teams/{teamId:int}")]
        public async Task<IActionResult> DeleteTeam(int teamId)
        {
            var adminId = GetUserId();
            await _adminService.DeleteTeamByAdminAsync(adminId, teamId);
            return NoContent();
        }

        /// <summary>
        /// Removes the supervisor from the specified team without assigning a replacement.
        /// Use this before assigning a new supervisor when switching professors.
        /// Team members are notified.
        /// </summary>
        [HttpPatch("teams/{teamId:int}/remove-supervisor")]
        public async Task<IActionResult> RemoveSupervisor(int teamId)
        {
            var adminId = GetUserId();
            await _adminService.RemoveSupervisorFromTeamAsync(teamId);

            _auditService.LogAction(adminId, "Remove Supervisor",
                $"Admin removed supervisor from team {teamId}.");

            return NoContent();
        }

        // ══════════════════════════════════════════════════════════════════════════
        // PROJECT MANAGEMENT
        // ══════════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Returns a paginated list of all projects across all statuses and academic years.
        /// Optional query parameters: status (e.g. "Draft", "UnderReview"), academicYearId.
        /// </summary>
        [HttpGet("projects")]
        public async Task<IActionResult> GetAllProjects(
            [FromQuery] string? search,
            [FromQuery] string? status, // e.g., "In Progress", "Abandoned", "Completed"
            [FromQuery] int? domainId,
            [FromQuery] int? academicYearId,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _adminService.GetAllProjectsAsync(
                search, status, domainId, academicYearId, pageNumber, pageSize);

            return Ok(result);
        }

        /// <summary>
        /// Returns the full admin-level project detail including all proposal text,
        /// team composition, technologies, supervisor, and timestamps.
        /// </summary>
        [HttpGet("projects/{projectId:int}")]
        public async Task<IActionResult> GetProjectDetail(int projectId)
        {
            var detail = await _adminService.GetProjectDetailAsync(projectId);
            return Ok(detail);
        }

        /// <summary>
        /// Toggles showcase visibility for an approved project with originality ≥ 85.
        /// </summary>
        [HttpPatch("projects/{projectId:int}/toggle-showcase")]
        public async Task<IActionResult> ToggleShowcase(int projectId)
        {
            var adminId = GetUserId();
            var project = await _unitOfWork.Repository<Project>().GetByIdAsync(projectId)
                ?? throw new KeyNotFoundException("Project not found.");

            if (project.Status != ProjectStatus.Approved || project.OriginalityScore < 85)
                return BadRequest(new
                {
                    error = "Only approved projects with an originality score ≥ 85 can be showcased."
                });

            project.IsPublicShowcase = !project.IsPublicShowcase;
            _unitOfWork.Repository<Project>().Update(project);
            await _unitOfWork.CompleteAsync();

            _auditService.LogAction(adminId, "Toggle Showcase",
                $"Project {projectId} showcase → {project.IsPublicShowcase}.");

            return Ok(new
            {
                message = project.IsPublicShowcase ? "Added to showcase." : "Removed from showcase."
            });
        }

        /// <summary>
        /// Force-transitions a project to any status with a mandatory audit reason.
        /// Notifies all team members of the change.
        /// Use this for escalations, corrections, or resolving disputes.
        /// </summary>
        [HttpPatch("projects/{projectId:int}/override-status")]
        public async Task<IActionResult> OverrideProjectStatus(
            int projectId, [FromBody] AdminOverrideProjectDto dto)
        {
            if (!Enum.TryParse<ProjectStatus>(dto.Status, ignoreCase: true, out var parsedStatus))
                return BadRequest(new
                {
                    error = $"'{dto.Status}' is not a valid ProjectStatus. " +
                            $"Valid values: {string.Join(", ", Enum.GetNames<ProjectStatus>())}"
                });

            var adminId = GetUserId();
            await _adminService.OverrideProjectStatusAsync(adminId, projectId, parsedStatus, dto.Reason);

            return Ok(new { message = $"Project status overridden to '{parsedStatus}'." });
        }

        /// <summary>
        /// Reassigns the supervising professor for a project's team.
        /// Enforces capacity limits on the new professor.
        /// Both the new professor and team members are notified.
        /// </summary>
        [HttpPatch("projects/{projectId:int}/reassign-supervisor")]
        public async Task<IActionResult> ReassignProjectSupervisor(
            int projectId, [FromBody] AssignSupervisorDto dto)
        {
            var adminId = GetUserId();
            await _adminService.ReassignProjectSupervisorAsync(adminId, projectId, dto.ProfessorId);

            return Ok(new { message = "Supervisor reassigned successfully." });
        }

        /// <summary>
        /// Finds all projects that have been stuck in 'UnderReview' for over 48 hours
        /// with no originality score (indicating a failed Hangfire AI job) and resets
        /// them to 'Draft' so students can resubmit. Returns the count of reset projects.
        /// </summary>
        [HttpPost("projects/reset-stuck")]
        public async Task<IActionResult> ResetStuckProjects()
        {
            var adminId = GetUserId();
            var count = await _adminService.ResetStuckProjectsAsync(adminId);

            return Ok(new
            {
                message = count > 0
                    ? $"{count} stuck project(s) reset to Draft. Affected teams have been notified."
                    : "No stuck projects found.",
                resetCount = count
            });
        }

        // ══════════════════════════════════════════════════════════════════════════
        // ACADEMIC YEAR MANAGEMENT  (unchanged from previous session)
        // ══════════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Creates a new academic year (inactive by default).
        /// Call PATCH .../activate to make it the current year.
        /// </summary>
        [HttpPost("academic-years")]
        public async Task<IActionResult> CreateAcademicYear([FromBody] CreateAcademicYearDto dto)
        {
            var adminId = GetUserId();
            var result = await _academicYearService.CreateAsync(dto);

            _auditService.LogAction(adminId, "Create Academic Year",
                $"Created academic year '{dto.Name}' (ID {result.Id}).");

            return CreatedAtAction(nameof(GetAllAcademicYears), null, result);
        }

        /// <summary>
        /// Deletes an academic year configuration.
        /// Deletion is blocked if the academic year is currently active
        /// or if there are projects associated with it.
        /// </summary>
        [HttpDelete("academic-years/{academicYearId:int}")]
        public async Task<IActionResult> DeleteAcademicYear(int academicYearId)
        {
            var adminId = GetUserId();
            await _academicYearService.DeleteAcademicYearAsync(adminId, academicYearId);
            return NoContent();
        }

        /// <summary>Returns all academic years ordered by start date descending, paginated.</summary>
        [HttpGet("academic-years")]
        public async Task<IActionResult> GetAllAcademicYears(
            [FromQuery] string? search,
            [FromQuery] bool? isActive,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _academicYearService.GetAllAsync(search, isActive, pageNumber, pageSize);
            return Ok(result);
        }

        /// <summary>Returns the currently active academic year, or 404 if none is configured.</summary>
        [HttpGet("academic-years/active")]
        public async Task<IActionResult> GetActiveAcademicYear()
        {
            var year = await _academicYearService.GetActiveAsync();
            if (year is null)
                return NotFound(new { error = "No active academic year is configured." });
            return Ok(year);
        }

        /// <summary>
        /// Makes the specified year active. The previously active year is automatically deactivated.
        /// Only one year may be active at a time.
        /// </summary>
        [HttpPatch("academic-years/{academicYearId:int}/activate")]
        public async Task<IActionResult> ActivateAcademicYear(int academicYearId)
        {
            var adminId = GetUserId();
            await _academicYearService.ActivateAsync(academicYearId);

            _auditService.LogAction(adminId, "Activate Academic Year",
                $"Academic year {academicYearId} set as active.");

            return NoContent();
        }

        /// <summary>Updates the name or date range of an academic year.</summary>
        [HttpPut("academic-years/{academicYearId:int}")]
        public async Task<IActionResult> UpdateAcademicYear(
            int academicYearId, [FromBody] UpdateAcademicYearDto dto)
        {
            await _academicYearService.UpdateAsync(academicYearId, dto);
            return NoContent();
        }

        // ══════════════════════════════════════════════════════════════════════════
        // AUDIT LOG VIEWER
        // ══════════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Returns paginated audit log entries. Supports filtering by search keyword (name, action, details),
        /// and date range. Ordered by most recent first.
        /// Audit entries include the actor's resolved full name.
        /// </summary>
        [HttpGet("audit-logs")]
        public async Task<IActionResult> GetAuditLogs(
            [FromQuery] string? search,
            [FromQuery] string? action,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 30)
        {
            var result = await _adminService.GetAuditLogsAsync(
                search, action, from, to, pageNumber, pageSize);
            return Ok(result);
        }

        // ══════════════════════════════════════════════════════════════════════════
        // QUICK ACTIONS
        // All four are surfaced on the admin dashboard's "Quick Actions" panel.
        // The dashboard DTO includes StuckProjectsCount and CanCloseAcademicYear
        // flags so the front-end can enable/disable buttons appropriately.
        // ══════════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Quick Action 1 — Resets all projects stuck in 'UnderReview' for over 48 hours
        /// with no AI originality score back to 'Draft', so students can resubmit.
        /// Enabled on the dashboard when StuckProjectsCount > 0.
        /// </summary>
        [HttpPost("quick-actions/reset-stuck-projects")]
        public async Task<IActionResult> QuickActionResetStuckProjects()
        {
            var adminId = GetUserId();
            var count = await _adminService.ResetStuckProjectsAsync(adminId);

            return Ok(new
            {
                message = count > 0
                    ? $"{count} stuck project(s) reset to Draft. Teams have been notified."
                    : "No stuck projects found — nothing to reset.",
                resetCount = count
            });
        }

        /// <summary>
        /// Quick Action 2 — Closes (deactivates) the currently active academic year.
        /// After this action, students cannot create new project drafts until an admin
        /// opens a new year via PATCH /api/admin/academic-years/{id}/activate.
        /// Enabled on the dashboard when CanCloseAcademicYear is true.
        /// </summary>
        [HttpPost("quick-actions/close-academic-year")]
        public async Task<IActionResult> QuickActionCloseAcademicYear()
        {
            var adminId = GetUserId();
            await _adminService.CloseCurrentAcademicYearAsync(adminId);

            return Ok(new
            {
                message = "The current academic year has been closed. " +
                          "Students can no longer create project drafts until a new year is opened."
            });
        }

        /// <summary>
        /// Quick Action 3 — Invalidates all active refresh tokens for every non-admin user,
        /// forcing a full re-login on their next API request.
        /// Use during security incidents or before planned maintenance windows.
        /// </summary>
        [HttpPost("quick-actions/force-logout-all")]
        public async Task<IActionResult> QuickActionForceLogoutAll()
        {
            var adminId = GetUserId();
            var terminatedCount = await _adminService.ForceLogoutAllUsersAsync(adminId);

            return Ok(new
            {
                message = terminatedCount > 0
                    ? $"{terminatedCount} active session(s) have been terminated."
                    : "No active sessions found.",
                terminatedCount
            });
        }

        /// <summary>
        /// Quick Action 4 — Opens (activates) a specific academic year, making it
        /// the current year. Any previously active year is automatically deactivated.
        /// Use this after closing a year to open the next one.
        /// </summary>
        [HttpPost("quick-actions/open-academic-year/{academicYearId:int}")]
        public async Task<IActionResult> QuickActionOpenAcademicYear(int academicYearId)
        {
            var adminId = GetUserId();
            await _academicYearService.ActivateAsync(academicYearId);

            _auditService.LogAction(adminId, "Open Academic Year",
                $"Academic year {academicYearId} activated via Quick Actions.");

            return Ok(new { message = $"Academic year {academicYearId} is now active. Students can create project drafts." });
        }
    }
}