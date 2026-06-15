using Microsoft.Extensions.Logging;
using InnoTrack.Application.Common;
using InnoTrack.Application.DTOs.Admin;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Entities.Enums;
using InnoTrack.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.Application.Services
{
    public class AdminService : IAdminService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IPasswordHasher _passwordHasher;
        private readonly INotificationService _notificationService;
        private readonly IAuditService _auditService;
        private readonly ILogger<AdminService> _logger;

        public AdminService(
            IUnitOfWork unitOfWork,
            IPasswordHasher passwordHasher,
            INotificationService notificationService,
            IAuditService auditService,
            ILogger<AdminService> logger)
        {
            _unitOfWork = unitOfWork;
            _passwordHasher = passwordHasher;
            _notificationService = notificationService;
            _auditService = auditService;
            _logger = logger;
        }

        // ── Dashboard ────────────────────────────────────────────────────────────

        public async Task<AdminDashboardDto> GetDashboardAsync()
        {
            var oneWeekAgo = DateTime.UtcNow.AddDays(-7);

            // ── User counts ──────────────────────────────────────────────────────
            var totalStudents = await _unitOfWork.Repository<Student>().GetQueryable().CountAsync();
            var activeStudents = await _unitOfWork.Repository<Student>().CountAsync(s => s.IsActive);
            var totalProfs = await _unitOfWork.Repository<Professor>().GetQueryable().CountAsync();
            var activeProfs = await _unitOfWork.Repository<Professor>().CountAsync(p => p.IsActive);
            var newStudentsWeek = await _unitOfWork.Repository<Student>()
                .CountAsync(s => s.CreatedAt >= oneWeekAgo);

            // ── Team counts ──────────────────────────────────────────────────────
            var totalTeams = await _unitOfWork.Repository<Team>().GetQueryable().CountAsync();
            var teamsWithoutSupervisor = await _unitOfWork.Repository<Team>()
                .CountAsync(t => t.ProfessorId == null &&
                                 (t.Project == null || t.Project.Status != ProjectStatus.Completed));

            var draftCount = await _unitOfWork.Repository<ProjectDraft>().GetQueryable().CountAsync();

            // ── Project counts in one DB round-trip ──────────────────────────────
            var projStats = await _unitOfWork.Repository<Project>()
                .GetQueryable().AsNoTracking()
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    Total = g.Count(),
                    UnderReview = g.Count(p => p.Status == ProjectStatus.UnderReview),
                    InProgress = g.Count(p => p.Status == ProjectStatus.In_Progress),
                    Approved = g.Count(p => p.Status == ProjectStatus.Approved),
                    Rejected = g.Count(p => p.Status == ProjectStatus.Rejected),
                    Completed = g.Count(p => p.Status == ProjectStatus.Completed),
                    RawAvgScore = g.Where(p => p.OriginalityScore != null)
                                   .Select(p => (decimal?)p.OriginalityScore)
                                   .Average()
                })
                .FirstOrDefaultAsync();

            // ── Task 1: Normalize average score to the 0–100 scale ───────────────
            // Some rows may store the score as a 0–1 decimal (e.g., 0.79) rather than
            // a percentage (79). Detect and correct before returning to the client.
            decimal? averageOriginalityScore = null;
            if (projStats?.RawAvgScore.HasValue == true)
            {
                var raw = projStats.RawAvgScore.Value;
                averageOriginalityScore = Math.Round(raw <= 1m ? raw * 100m : raw, 2);
            }

            // ── Academic year ────────────────────────────────────────────────────
            var activeYear = await _unitOfWork.Repository<AcademicYear>()
                .FindAsync(y => y.IsActive);

            // ── System data counts ───────────────────────────────────────────────
            var totalTechnologies = await _unitOfWork.Repository<Technology>()
                .GetQueryable().CountAsync();
            var totalDomains = await _unitOfWork.Repository<InnoTrack.Domain.Entities.Domain>()
                .GetQueryable().CountAsync();

            // ── Task 3: Stuck project count (computed once, reused in alerts + DTO) 
            var stuckCutoff = DateTime.UtcNow.AddHours(-48);
            var stuckProjectsCount = await _unitOfWork.Repository<Project>().CountAsync(
                p => p.Status == ProjectStatus.UnderReview
                  && p.SubmittedAt < stuckCutoff
                  && p.OriginalityScore == null);

            // ── Alerts (stuckCount passed in to avoid a second DB query) ─────────
            var alerts = await BuildSystemAlertsAsync(
                teamsWithoutSupervisor, activeYear is null, stuckProjectsCount);

            // ── Task 2: Chart data ────────────────────────────────────────────────
            // Build status chart from already-computed projStats (zero extra DB hits)
            var projectsByStatus = new[]
            {
                new ChartDataPointDto("Draft", draftCount),
                new ChartDataPointDto("Under Review", projStats?.UnderReview ?? 0),
                new ChartDataPointDto("In Progress",  projStats?.InProgress  ?? 0),
                new ChartDataPointDto("Approved",     projStats?.Approved    ?? 0),
                new ChartDataPointDto("Rejected",     projStats?.Rejected    ?? 0),
                new ChartDataPointDto("Completed",    projStats?.Completed   ?? 0),
            }
            .Where(x => x.Count > 0)               // omit zero-count statuses from pie/bar charts
            .OrderByDescending(x => x.Count)
            .ToList()
            .AsReadOnly();

            // Domain distribution requires a join — one focused query, top 10 domains
            var projectsByDomain = await (
                from p in _unitOfWork.Repository<Project>()
                                      .GetQueryable().AsNoTracking()
                join d in _unitOfWork.Repository<InnoTrack.Domain.Entities.Domain>()
                                      .GetQueryable().AsNoTracking()
                    on p.DomainId equals d.Id
                group p by d.Name into g
                orderby g.Count() descending
                select new ChartDataPointDto(g.Key, g.Count())
            )
            .Take(10)
            .ToListAsync();

            // ── Recent audit entries ─────────────────────────────────────────────
            var recent = await FetchRecentAuditEntriesAsync(10);

            return new AdminDashboardDto(
                totalStudents, activeStudents,
                totalProfs, activeProfs, newStudentsWeek,
                totalTeams, teamsWithoutSupervisor,
                (projStats?.Total ?? 0) + draftCount,
                draftCount,
                projStats?.UnderReview ?? 0,
                projStats?.InProgress ?? 0,
                projStats?.Approved ?? 0,
                projStats?.Rejected ?? 0,
                projStats?.Completed ?? 0,
                averageOriginalityScore,            // Task 1: normalized
                activeYear is not null,
                activeYear?.Name,
                totalTechnologies,
                totalDomains,
                stuckProjectsCount,                 // Task 3: quick action flag
                CanCloseAcademicYear: activeYear is not null, // Task 3: quick action flag
                projectsByStatus.AsReadOnly(),      // Task 2
                projectsByDomain.AsReadOnly(),      // Task 2
                alerts.AsReadOnly(),
                recent.AsReadOnly()
            );
        }

        // stuckProjectsCount is now passed in from GetDashboardAsync,
        // eliminating the duplicate CountAsync call that was previously here.
        private async Task<List<SystemAlertDto>> BuildSystemAlertsAsync(
            int teamsWithoutSupervisor, bool noActiveYear, int stuckProjectsCount)
        {
            var alerts = new List<SystemAlertDto>();

            if (noActiveYear)
                alerts.Add(new SystemAlertDto(
                    "Critical",
                    "No active academic year is configured. Students cannot create new projects.",
                    0));

            if (teamsWithoutSupervisor > 0)
                alerts.Add(new SystemAlertDto(
                    "Warning",
                    $"{teamsWithoutSupervisor} team(s) have no supervisor assigned.",
                    teamsWithoutSupervisor));

            if (stuckProjectsCount > 0)
                alerts.Add(new SystemAlertDto(
                    "Warning",
                    $"{stuckProjectsCount} project(s) have been under review for over 48 hours with no AI score. " +
                    $"Use POST /admin/projects/reset-stuck to recover.",
                    stuckProjectsCount));

            var atCapacity = await _unitOfWork.Repository<Professor>()
                .GetQueryable().AsNoTracking()
                .CountAsync(p => p.IsActive
                              && p.SupervisedTeams.Count(t => t.Project == null || t.Project.Status != ProjectStatus.Completed) >= p.MaxTeamLoad);

            if (atCapacity > 0)
                alerts.Add(new SystemAlertDto(
                    "Info",
                    $"{atCapacity} professor(s) are at maximum active supervision capacity.",
                    atCapacity));

            return alerts;
        }

        public async Task CloseCurrentAcademicYearAsync(int adminId)
        {
            var activeYear = await _unitOfWork.Repository<AcademicYear>()
                .FindAsync(y => y.IsActive)
                ?? throw new InvalidOperationException(
                    "No academic year is currently active. Nothing to close.");

            activeYear.IsActive = false;
            _unitOfWork.Repository<AcademicYear>().Update(activeYear);
            await _unitOfWork.CompleteAsync();

            _auditService.LogAction(adminId, "Close Academic Year",
                $"Closed academic year '{activeYear.Name}'. " +
                $"Students can no longer create new project drafts until a new year is opened.");
        }

        public async Task<int> ForceLogoutAllUsersAsync(int adminId)
        {
            // Admins are intentionally excluded — this action should never lock out
            // the person executing it.
            var activeSessions = await _unitOfWork.Repository<User>()
                .GetQueryable()
                .Where(u => u.RefreshToken != null && u.Role != UserRole.Admin)
                .ToListAsync();

            if (!activeSessions.Any()) return 0;

            foreach (var user in activeSessions)
            {
                user.RefreshToken = null;
                user.RefreshTokenExpiryTime = null;
                _unitOfWork.Repository<User>().Update(user);
            }

            await _unitOfWork.CompleteAsync();

            _auditService.LogAction(adminId, "Force Logout All",
                $"Invalidated active sessions for {activeSessions.Count} user(s) " +
                $"({activeSessions.Count(u => u.Role == UserRole.Student)} students, " +
                $"{activeSessions.Count(u => u.Role == UserRole.Professor)} professors).");

            return activeSessions.Count;
        }

        // AuditLog has no User navigation property — requires a LINQ join.
        private async Task<List<RecentAuditEntryDto>> FetchRecentAuditEntriesAsync(int count)
        {
            return await
                (from log in _unitOfWork.Repository<AuditLog>().GetQueryable().AsNoTracking()
                 join user in _unitOfWork.Repository<User>().GetQueryable().AsNoTracking()
                     on log.UserId equals user.Id
                 orderby log.Timestamp descending
                 select new RecentAuditEntryDto(
                     log.Id,
                     user.FirstName + " " + user.LastName,
                     log.Action,
                     log.Details,
                     log.Timestamp))
                .Take(count)
                .ToListAsync();
        }

        // ── Student Management ───────────────────────────────────────────────────

        public async Task<PagedResult<StudentAdminViewDto>> SearchStudentsAsync(
            string? search, int? departmentId, bool? hasTeam, bool? isActive,
            int pageNumber, int pageSize)
        {
            var query = _unitOfWork.Repository<Student>()
                .GetQueryable()
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(s =>
                    s.FirstName.ToLower().Contains(term) ||
                    s.LastName.ToLower().Contains(term) ||
                    s.Email.ToLower().Contains(term));
            }

            if (departmentId.HasValue)
                query = query.Where(s => s.DepartmentId == departmentId.Value);

            if (isActive.HasValue)
                query = query.Where(s => s.IsActive == isActive.Value);

            if (hasTeam.HasValue)
            {
                query = hasTeam.Value
                    ? query.Where(s => s.TeamMember != null)
                    : query.Where(s => s.TeamMember == null);
            }

            var totalCount = await query.CountAsync();

            var students = await query
                .OrderByDescending(s => s.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new StudentAdminViewDto(
                    s.Id, s.FullName, s.Email,
                    s.Department.Name, s.GPA, s.GraduationYear,
                    s.IsActive,
                    s.TeamMember != null,
                    s.TeamMember != null ? s.TeamMember.Team.Name : null))
                .ToListAsync();

            return new PagedResult<StudentAdminViewDto>(students, totalCount, pageNumber, pageSize);
        }

        public async Task<StudentDetailForAdminDto> GetStudentDetailAsync(int studentId)
        {
            // GetByIdAsync uses FindAsync which bypasses the global IsDeleted filter —
            // intentional so admins can inspect soft-deleted accounts.
            var student = await _unitOfWork.Repository<Student>()
                .GetQueryable()
                .AsNoTracking()
                .IgnoreQueryFilters()   // must see deleted students too
                .Include(s => s.Department)
                .Include(s => s.TeamMember)
                    .ThenInclude(tm => tm!.Team)
                        .ThenInclude(t => t.Project)
                .Include(s => s.StudentSkills)
                    .ThenInclude(ss => ss.Skill)
                .FirstOrDefaultAsync(s => s.Id == studentId)
                ?? throw new KeyNotFoundException("Student not found.");

            var skills = student.StudentSkills
                .Select(ss => ss.Skill?.Name ?? string.Empty)
                .Where(n => n.Length > 0)
                .ToList().AsReadOnly();

            var tm = student.TeamMember;
            var project = tm?.Team?.Project;

            return new StudentDetailForAdminDto(
                student.Id, student.FirstName, student.LastName, student.Email,
                student.DepartmentId, student.Department.Name,
                student.GPA, student.GraduationYear,
                student.IsActive, student.IsDeleted, student.CreatedAt,
                tm is not null, tm?.TeamId, tm?.Team?.Name, tm?.Role.ToString(),
                project?.Id, project?.Title, project?.Status.ToString(),
                skills);
        }

        public async Task SetStudentActiveStatusAsync(int studentId, bool isActive)
        {
            var student = await _unitOfWork.Repository<Student>().GetByIdAsync(studentId)
                ?? throw new KeyNotFoundException("Student not found.");

            if (student.IsDeleted)
                throw new InvalidOperationException("Cannot change the status of a deleted account.");

            student.IsActive = isActive;

            // Deactivating a student invalidates their session immediately
            if (!isActive)
            {
                student.RefreshToken = null;
                student.RefreshTokenExpiryTime = null;
            }

            _unitOfWork.Repository<Student>().Update(student);
            await _unitOfWork.CompleteAsync();
        }

        public async Task ResetStudentPasswordAsync(int studentId, string newPassword)
        {
            if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 8)
                throw new ArgumentException("New password must be at least 8 characters.");

            var student = await _unitOfWork.Repository<Student>().GetByIdAsync(studentId)
                ?? throw new KeyNotFoundException("Student not found.");

            if (student.IsDeleted)
                throw new InvalidOperationException("Cannot reset the password of a deleted account.");

            student.PasswordHash = _passwordHasher.Hash(newPassword);
            // Invalidate any current sessions so the student must log in with the new password
            student.RefreshToken = null;
            student.RefreshTokenExpiryTime = null;

            _unitOfWork.Repository<Student>().Update(student);
            await _unitOfWork.CompleteAsync();
        }

        public async Task SoftDeleteStudentAsync(int adminId, int studentId)
        {
            var student = await _unitOfWork.Repository<Student>().GetByIdAsync(studentId)
                ?? throw new KeyNotFoundException("Student not found.");

            if (student.IsDeleted)
                throw new InvalidOperationException("Student account is already deleted.");

            var membership = await _unitOfWork.Repository<TeamMember>()
                .FindAsync(tm => tm.StudentId == studentId);

            if (membership != null)
            {
                var teamId = membership.TeamId;

                if (membership.Role == TeamMemberRole.Leader)
                {
                    var hasActiveProject = await _unitOfWork.Repository<Project>().AnyAsync(
                        p => p.TeamId == teamId
                          && p.Status != ProjectStatus.Abandoned
                          && p.Status != ProjectStatus.Rejected
                          && p.Status != ProjectStatus.Completed);

                    if (hasActiveProject)
                    {
                        throw new InvalidOperationException(
                            "Cannot delete a student who leads a team with an active project. " +
                            "Resolve or reassign the project first.");
                    }

                    var otherMembers = await _unitOfWork.Repository<TeamMember>()
                        .GetQueryable()
                        .Where(tm => tm.TeamId == teamId && tm.StudentId != studentId)
                        .OrderBy(tm => tm.JoinedAt)
                        .ToListAsync();

                    if (otherMembers.Any())
                    {
                        var newLeader = otherMembers.First();
                        newLeader.Role = TeamMemberRole.Leader;
                        _unitOfWork.Repository<TeamMember>().Update(newLeader);
                    }
                    else
                    {
                        var drafts = await _unitOfWork.Repository<ProjectDraft>().GetAllAsync(d => d.TeamId == teamId);
                        foreach (var draft in drafts) _unitOfWork.Repository<ProjectDraft>().Delete(draft);

                        var joinRequests = await _unitOfWork.Repository<JoinRequest>().GetAllAsync(r => r.TeamId == teamId);
                        foreach (var request in joinRequests) _unitOfWork.Repository<JoinRequest>().Delete(request);

                        var team = await _unitOfWork.Repository<Team>().GetByIdAsync(teamId);
                        if (team != null) _unitOfWork.Repository<Team>().Delete(team);
                    }
                }

                _unitOfWork.Repository<TeamMember>().Delete(membership);

                var myRequests = await _unitOfWork.Repository<JoinRequest>().GetAllAsync(r => r.StudentId == studentId);
                foreach (var req in myRequests) _unitOfWork.Repository<JoinRequest>().Delete(req);
            }

            student.IsDeleted = true;
            student.IsActive = false;
            student.RefreshToken = null;
            student.RefreshTokenExpiryTime = null;

            _unitOfWork.Repository<Student>().Update(student);
            await _unitOfWork.CompleteAsync();

            _auditService.LogAction(adminId, "Soft Delete Student",
                $"Admin soft-deleted student ID {studentId} ('{student.FullName}').");
        }


        // ── Team Management ──────────────────────────────────────────────────────

        public async Task<PagedResult<AdminTeamListItemDto>> GetAllTeamsAsync(
            string? search, bool? hasSupervisor, string? projectStatus,
            int pageNumber, int pageSize)
        {
            var query = _unitOfWork.Repository<Team>()
                        .GetQueryable()
                        .AsNoTracking()
                        .Include(t => t.Members).ThenInclude(m => m.Student)
                        .Include(t => t.Project)
                        .Include(t => t.Supervisor)
                        .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var cleanSearch = search.Trim().ToLower();
                query = query.Where(t =>
                    t.Name.ToLower().Contains(cleanSearch) ||
                    (t.Project != null && t.Project.Title.ToLower().Contains(cleanSearch)) ||
                    (t.Supervisor != null && (t.Supervisor.FirstName + " " + t.Supervisor.LastName).ToLower().Contains(cleanSearch)));
            }

            if (hasSupervisor.HasValue)
            {
                if (hasSupervisor.Value)
                    query = query.Where(t => t.ProfessorId != null);
                else
                    query = query.Where(t => t.ProfessorId == null);
            }

            if (!string.IsNullOrWhiteSpace(projectStatus))
            {
                var cleanStatus = projectStatus.Trim();

                if (cleanStatus.Equals("No Project", StringComparison.OrdinalIgnoreCase) ||
                    cleanStatus.Equals("None", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(t => t.Project == null);
                }
                else if (cleanStatus.Equals("Draft", StringComparison.OrdinalIgnoreCase))
                {
                    var teamsWithDrafts = _unitOfWork.Repository<ProjectDraft>().GetQueryable().Select(d => d.TeamId).Distinct();
                    query = query.Where(t => t.Project == null && teamsWithDrafts.Contains(t.Id));
                }
                else
                {
                    if (cleanStatus.Equals("Under Review", StringComparison.OrdinalIgnoreCase) ||
                        cleanStatus.Equals("Under-Review", StringComparison.OrdinalIgnoreCase))
                    {
                        cleanStatus = "UnderReview";
                    }
                    else if (cleanStatus.Equals("In Progress", StringComparison.OrdinalIgnoreCase) ||
                             cleanStatus.Equals("In-Progress", StringComparison.OrdinalIgnoreCase))
                    {
                        cleanStatus = "In_Progress";
                    }

                    if (Enum.TryParse<ProjectStatus>(cleanStatus, true, out var parsedStatus))
                    {
                        query = query.Where(t => t.Project != null && t.Project.Status == parsedStatus);
                    }
                }
            }
            var totalCount = await query.CountAsync();

            var teams = await query
                    .OrderBy(t => t.Name)
                    .Skip((pageNumber - 1) * pageSize)
                    .Take(pageSize)
                    .Select(t => new AdminTeamListItemDto(
                        t.Id, t.Name,
                        t.Members.Count(m => m.Student != null && !m.Student.IsDeleted),
                        t.Project != null ? (int?)t.Project.Id : null,
                        t.Project != null ? t.Project.Title : null,
                        t.Project != null ? t.Project.Status.ToString() : null,
                        t.Project != null ? t.Project.OriginalityScore : null,
                        t.ProfessorId,
                        t.Supervisor != null ? t.Supervisor.FirstName + " " + t.Supervisor.LastName : null,
                        t.Supervisor != null && t.Supervisor.IsActive,
                        t.CreatedAt))
                    .ToListAsync();

            return new PagedResult<AdminTeamListItemDto>(teams, totalCount, pageNumber, pageSize);
        }

        public async Task AssignSupervisorToTeamAsync(int teamId, int professorId)
        {
            var team = await _unitOfWork.Repository<Team>().GetByIdAsync(teamId)
                ?? throw new KeyNotFoundException("Team not found.");

            var professor = await _unitOfWork.Repository<Professor>().GetByIdAsync(professorId)
                ?? throw new KeyNotFoundException("Professor not found.");

            if (!professor.IsActive)
                throw new InvalidOperationException("Cannot assign an inactive professor as supervisor.");

            // Capacity check — exclude this team itself if it's already supervised by the same professor
            var currentLoad = await _unitOfWork.Repository<Team>()
                .CountAsync(t => t.ProfessorId == professorId && t.Id != teamId);

            if (currentLoad >= professor.MaxTeamLoad)
                throw new InvalidOperationException(
                    $"Prof. '{professor.FullName}' is at maximum capacity ({professor.MaxTeamLoad} teams). " +
                    $"Increase their MaxTeamLoad via PUT /api/admin/professors/{professorId}, or choose another professor.");

            var oldProfessorId = team.ProfessorId;
            team.ProfessorId = professorId;
            _unitOfWork.Repository<Team>().Update(team);
            await _unitOfWork.CompleteAsync();

            // Notify new professor
            try
            {
                await _notificationService.SendNotificationAsync(
                    professorId, "New Team Assigned",
                    $"You have been assigned by an administrator as supervisor for team '{team.Name}'.",
                    NotificationType.Info);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to notify professor {ProfessorId} of new team {TeamId} assignment.", professorId, team.Id);
            }

            // Notify team members
            var members = await _unitOfWork.Repository<TeamMember>()
                .GetAllAsync(tm => tm.TeamId == teamId);

            foreach (var member in members)
            {
                try
                {
                    await _notificationService.SendNotificationAsync(
                        member.StudentId, "Supervisor Assigned",
                        $"Prof. {professor.FullName} has been assigned as your team's supervisor by an administrator.",
                        NotificationType.Info);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to notify team member {StudentId} about new supervisor assignment.", member.StudentId);
                }
            }
        }

        public async Task DeleteTeamByAdminAsync(int adminId, int teamId)
        {
            var team = await _unitOfWork.Repository<Team>()
                .GetQueryable()
                .Include(t => t.Project)
                .FirstOrDefaultAsync(t => t.Id == teamId)
                ?? throw new KeyNotFoundException("Team not found.");

            if (team.Project != null &&
               (team.Project.Status == ProjectStatus.In_Progress || team.Project.Status == ProjectStatus.Completed))
            {
                throw new InvalidOperationException("Cannot delete a team with an Active or Completed project. Archive or Abandon the project first.");
            }

            await _unitOfWork.BeginTransactionAsync();
            try
            {
                var drafts = await _unitOfWork.Repository<ProjectDraft>().GetAllAsync(d => d.TeamId == teamId);
                foreach (var d in drafts) _unitOfWork.Repository<ProjectDraft>().Delete(d);

                var requests = await _unitOfWork.Repository<JoinRequest>().GetAllAsync(r => r.TeamId == teamId);
                foreach (var r in requests) _unitOfWork.Repository<JoinRequest>().Delete(r);

                var members = await _unitOfWork.Repository<TeamMember>().GetAllAsync(m => m.TeamId == teamId);
                foreach (var m in members) _unitOfWork.Repository<TeamMember>().Delete(m);

                if (team.Project != null)
                {
                    _unitOfWork.Repository<Project>().Delete(team.Project);
                }

                _unitOfWork.Repository<Team>().Delete(team);

                await _unitOfWork.CompleteAsync();
                await _unitOfWork.CommitTransactionAsync();

                _auditService.LogAction(adminId, "Admin Delete Team", $"Deleted team '{team.Name}' and unlinked all members.");
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync();
                throw;
            }
        }

        public async Task RemoveSupervisorFromTeamAsync(int teamId)
        {
            var team = await _unitOfWork.Repository<Team>().GetByIdAsync(teamId)
                ?? throw new KeyNotFoundException("Team not found.");

            if (team.ProfessorId is null) return; // already unassigned — idempotent

            team.ProfessorId = null;
            _unitOfWork.Repository<Team>().Update(team);
            await _unitOfWork.CompleteAsync();

            var members = await _unitOfWork.Repository<TeamMember>()
                .GetAllAsync(tm => tm.TeamId == teamId);

            foreach (var member in members)
            {
                try
                {
                    await _notificationService.SendNotificationAsync(
                        member.StudentId, "Supervisor Removed",
                        "Your team's supervisor has been unassigned by an administrator. A new supervisor will be assigned soon.",
                        NotificationType.Warning);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to notify team member {StudentId} about supervisor removal.", member.StudentId);
                }
            }
        }

        // ── Project Management ───────────────────────────────────────────────────

        public async Task<PagedResult<AdminProjectListItemDto>> GetAllProjectsAsync(
            string? search, string? status, int? domainId, int? academicYearId,
            int pageNumber, int pageSize)
        {
            if (!string.IsNullOrWhiteSpace(status) && status.Trim().Equals("Draft", StringComparison.OrdinalIgnoreCase))
            {
                var draftQuery = _unitOfWork.Repository<ProjectDraft>()
                    .GetQueryable().AsNoTracking()
                    .Include(d => d.Team).ThenInclude(t => t.Supervisor)
                    .Include(d => d.Domain)
                    .AsQueryable();

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var cleanSearch = search.Trim().ToLower();
                    draftQuery = draftQuery.Where(d =>
                        d.Title.ToLower().Contains(cleanSearch) ||
                        (d.Team != null && d.Team.Name.ToLower().Contains(cleanSearch)) ||
                        (d.Team != null && d.Team.Supervisor != null &&
                         (d.Team.Supervisor.FirstName + " " + d.Team.Supervisor.LastName).ToLower().Contains(cleanSearch))
                    );
                }

                if (domainId.HasValue)
                    draftQuery = draftQuery.Where(d => d.DomainId == domainId.Value);

                var totalDrafts = await draftQuery.CountAsync();

                var drafts = await draftQuery
                    .OrderByDescending(d => d.CreatedAt)
                    .Skip((pageNumber - 1) * pageSize)
                    .Take(pageSize)
                    .Select(d => new AdminProjectListItemDto(
                        d.Id, d.Title, "Draft",
                        d.TeamId, d.Team != null ? d.Team.Name : null,
                        d.Team != null ? d.Team.ProfessorId : null,
                        d.Team != null && d.Team.Supervisor != null
                            ? d.Team.Supervisor.FirstName + " " + d.Team.Supervisor.LastName
                            : null,
                        d.Domain.Name,
                        d.Year.ToString(),
                        d.OriginalityScore, false,
                        d.CreatedAt, null, null))
                    .ToListAsync();

                return new PagedResult<AdminProjectListItemDto>(drafts, totalDrafts, pageNumber, pageSize);
            }

            IQueryable<Project> query = _unitOfWork.Repository<Project>()
                .GetQueryable().AsNoTracking()
                .Include(p => p.Team).ThenInclude(t => t!.Supervisor)
                .Include(p => p.Domain)
                .Include(p => p.AcademicYear);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var cleanSearch = search.Trim().ToLower();
                query = query.Where(p =>
                    p.Title.ToLower().Contains(cleanSearch) ||
                    (p.Team != null && p.Team.Name.ToLower().Contains(cleanSearch)) ||
                    (p.Team != null && p.Team.Supervisor != null &&
                     (p.Team.Supervisor.FirstName + " " + p.Team.Supervisor.LastName).ToLower().Contains(cleanSearch))
                );
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var cleanStatus = status.Trim();

                if (cleanStatus.Equals("Under Review", StringComparison.OrdinalIgnoreCase) ||
                    cleanStatus.Equals("Under-Review", StringComparison.OrdinalIgnoreCase))
                {
                    cleanStatus = "UnderReview";
                }
                else if (cleanStatus.Equals("In Progress", StringComparison.OrdinalIgnoreCase) ||
                         cleanStatus.Equals("In-Progress", StringComparison.OrdinalIgnoreCase))
                {
                    cleanStatus = "In_Progress";
                }

                if (Enum.TryParse<ProjectStatus>(cleanStatus, true, out var parsedStatus))
                {
                    query = query.Where(p => p.Status == parsedStatus);
                }
                else
                {
                    query = query.Where(p => false);
                }
            }

            if (domainId.HasValue)
            {
                query = query.Where(p => p.DomainId == domainId.Value);
            }

            if (academicYearId.HasValue)
            {
                query = query.Where(p => p.AcademicYearId == academicYearId.Value);
            }

            var totalCount = await query.CountAsync();

            var projects = await query
                .OrderByDescending(p => p.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new AdminProjectListItemDto(
                    p.Id, p.Title, p.Status.ToString(),
                    p.TeamId, p.Team != null ? p.Team.Name : null,
                    p.Team != null ? p.Team.ProfessorId : null,
                    p.Team != null && p.Team.Supervisor != null
                        ? p.Team.Supervisor.FirstName + " " + p.Team.Supervisor.LastName
                        : null,
                    p.Domain.Name,
                    p.AcademicYear.Name,
                    p.OriginalityScore, p.IsPublicShowcase,
                    p.CreatedAt, p.SubmittedAt, p.ApprovedAt))
                .ToListAsync();

            return new PagedResult<AdminProjectListItemDto>(projects, totalCount, pageNumber, pageSize);
        }

        public async Task<AdminProjectDetailDto> GetProjectDetailAsync(int projectId)
        {
            var project = await _unitOfWork.Repository<Project>()
                .GetQueryable().AsNoTracking()
                .Include(p => p.Team)
                    .ThenInclude(t => t!.Supervisor)
                .Include(p => p.Team)
                    .ThenInclude(t => t!.Members)
                .Include(p => p.Domain)
                .Include(p => p.AcademicYear)
                .Include(p => p.ProjectTechnologies)
                    .ThenInclude(pt => pt.Technology)
                .FirstOrDefaultAsync(p => p.Id == projectId)
                ?? throw new KeyNotFoundException("Project not found.");

            // Bulk-load student info for member list
            var memberIds = project.Team?.Members.Select(m => m.StudentId).ToList()
                            ?? new List<int>();
            var studentMap = (await _unitOfWork.Repository<Student>()
                    .GetQueryable().AsNoTracking()
                    .Where(s => memberIds.Contains(s.Id))
                    .ToListAsync())
                .ToDictionary(s => s.Id);

            var memberDtos = project.Team?.Members
                .Select(m =>
                {
                    var s = studentMap.GetValueOrDefault(m.StudentId);
                    return new AdminProjectMemberDto(
                        m.StudentId, s?.FullName ?? "Unknown",
                        s?.Email ?? string.Empty, m.Role.ToString());
                })
                .ToList().AsReadOnly()
                ?? (IReadOnlyList<AdminProjectMemberDto>)new List<AdminProjectMemberDto>();

            var technologies = project.ProjectTechnologies
                .Select(pt => pt.Technology?.Name ?? string.Empty)
                .Where(n => n.Length > 0)
                .ToList().AsReadOnly();

            var sup = project.Team?.Supervisor;

            return new AdminProjectDetailDto(
                project.Id, project.Title, project.Abstract, project.Description,
                project.ProblemStatement, project.ProposedSolution, project.Objectives,
                project.Status.ToString(), project.OriginalityScore, project.IsPublicShowcase,
                project.TeamId, project.Team?.Name,
                project.Team?.ProfessorId,
                sup is not null ? $"{sup.FirstName} {sup.LastName}" : null,
                project.Domain?.Name ?? "Unknown",
                project.AcademicYear?.Name ?? "Unknown",
                technologies, memberDtos,
                project.CreatedAt, project.SubmittedAt, project.ApprovedAt, project.UpdatedAt);
        }

        public async Task OverrideProjectStatusAsync(
            int adminId, int projectId, ProjectStatus newStatus, string reason)
        {
            if (string.IsNullOrWhiteSpace(reason))
                throw new ArgumentException(
                    "A reason is required for administrative status overrides. It is recorded in the audit log.");

            var project = await _unitOfWork.Repository<Project>().GetByIdAsync(projectId)
                ?? throw new KeyNotFoundException("Project not found.");

            var previousStatus = project.Status;

            project.Status = newStatus;
            project.UpdatedAt = DateTime.UtcNow;

            if (newStatus == ProjectStatus.Approved && project.ApprovedAt is null)
                project.ApprovedAt = DateTime.UtcNow;

            _unitOfWork.Repository<Project>().Update(project);
            await _unitOfWork.CompleteAsync();

            _auditService.LogAction(adminId, "Admin Status Override",
                $"Project {projectId} ('{project.Title}') forced from {previousStatus} to {newStatus}. " +
                $"Reason: {reason}");

            if (!project.TeamId.HasValue) return;

            var members = await _unitOfWork.Repository<TeamMember>()
                .GetAllAsync(tm => tm.TeamId == project.TeamId.Value);

            var notifType = newStatus switch
            {
                ProjectStatus.Approved or ProjectStatus.Completed => NotificationType.Success,
                ProjectStatus.Rejected or ProjectStatus.Abandoned => NotificationType.Error,
                ProjectStatus.Draft => NotificationType.Warning,
                _ => NotificationType.Info
            };

            foreach (var member in members)
            {
                try
                {
                    await _notificationService.SendNotificationAsync(
                        member.StudentId, "Project Status Updated by Admin",
                        $"An administrator has updated your project '{project.Title}' to '{newStatus}'.",
                        notifType, project.Id, ReferenceType.Project);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to notify team member {StudentId} about project {ProjectId} status override.", member.StudentId, project.Id);
                }
            }
        }

        public async Task ReassignProjectSupervisorAsync(
            int adminId, int projectId, int newProfessorId)
        {
            var project = await _unitOfWork.Repository<Project>().GetByIdAsync(projectId)
                ?? throw new KeyNotFoundException("Project not found.");

            if (!project.TeamId.HasValue)
                throw new InvalidOperationException("Project is not associated with a team.");

            var team = await _unitOfWork.Repository<Team>().GetByIdAsync(project.TeamId.Value)
                ?? throw new KeyNotFoundException("Team not found.");

            var professor = await _unitOfWork.Repository<Professor>().GetByIdAsync(newProfessorId)
                ?? throw new KeyNotFoundException("Professor not found.");

            if (!professor.IsActive)
                throw new InvalidOperationException("Cannot assign an inactive professor.");

            var loadExcludingCurrentTeam = await _unitOfWork.Repository<Team>()
                .CountAsync(t => t.ProfessorId == newProfessorId && t.Id != team.Id);

            if (loadExcludingCurrentTeam >= professor.MaxTeamLoad)
                throw new InvalidOperationException(
                    $"Prof. '{professor.FullName}' is at maximum capacity ({professor.MaxTeamLoad} teams). " +
                    $"Increase their MaxTeamLoad first.");

            var previousProfId = team.ProfessorId;
            team.ProfessorId = newProfessorId;
            _unitOfWork.Repository<Team>().Update(team);
            await _unitOfWork.CompleteAsync();

            _auditService.LogAction(adminId, "Supervisor Reassignment",
                $"Project {projectId} ('{project.Title}') supervisor reassigned from " +
                $"{(previousProfId.HasValue ? $"professor {previousProfId}" : "none")} " +
                $"to professor {newProfessorId}.");

            // Notify new professor
            try
            {
                await _notificationService.SendNotificationAsync(
                    newProfessorId, "New Team Assigned",
                    $"You have been assigned to supervise team '{team.Name}' on project '{project.Title}' by an administrator.",
                    NotificationType.Info, project.Id, ReferenceType.Project);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to notify professor {ProfessorId} of reassigned team {TeamId}.", newProfessorId, team.Id);
            }

            // Notify team members
            var members = await _unitOfWork.Repository<TeamMember>()
                .GetAllAsync(tm => tm.TeamId == team.Id);

            foreach (var member in members)
            {
                try
                {
                    await _notificationService.SendNotificationAsync(
                        member.StudentId, "Supervisor Updated",
                        $"Prof. {professor.FullName} has been assigned as your new supervisor by an administrator.",
                        NotificationType.Info, project.Id, ReferenceType.Project);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to notify team member {StudentId} about supervisor reassignment to prof {ProfessorId}.", member.StudentId, professor.Id);
                }
            }
        }

        public async Task<int> ResetStuckProjectsAsync(int adminId)
        {
            var cutoff = DateTime.UtcNow.AddHours(-48);

            var stuck = await _unitOfWork.Repository<Project>().GetAllAsync(
                p => p.Status == ProjectStatus.UnderReview
                  && p.SubmittedAt < cutoff
                  && p.OriginalityScore == null);

            if (!stuck.Any()) return 0;

            foreach (var p in stuck)
            {
                p.Status = ProjectStatus.Draft;
                p.UpdatedAt = DateTime.UtcNow;
                _unitOfWork.Repository<Project>().Update(p);
            }

            await _unitOfWork.CompleteAsync();

            _auditService.LogAction(adminId, "Batch Reset Stuck Projects",
                $"Reset {stuck.Count} project(s) from UnderReview → Draft. " +
                $"IDs: {string.Join(", ", stuck.Select(p => p.Id))}");

            // Notify each team — best effort
            foreach (var project in stuck)
            {
                if (!project.TeamId.HasValue) continue;

                var members = await _unitOfWork.Repository<TeamMember>()
                    .GetAllAsync(tm => tm.TeamId == project.TeamId.Value);

                foreach (var member in members)
                {
                    try
                    {
                        await _notificationService.SendNotificationAsync(
                            member.StudentId,
                            "Project Reset — Action Required",
                            $"Your project '{project.Title}' encountered an AI processing issue and has been " +
                            $"reset to Draft. Please review your submission and resubmit.",
                            NotificationType.Warning,
                            project.Id, ReferenceType.Project);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to notify team member {StudentId} about stuck project reset for project {ProjectId}.", member.StudentId, project.Id);
                    }
                }
            }

            return stuck.Count;
        }

        // ── Audit Logs ───────────────────────────────────────────────────────────

        public async Task<PagedResult<AuditLogDto>> GetAuditLogsAsync(
            string? search, string? action, DateTime? from, DateTime? to,
            int pageNumber, int pageSize)
        {
            // AuditLog has no navigation property to User — join required
            var query =
                from log in _unitOfWork.Repository<AuditLog>().GetQueryable().AsNoTracking()
                join user in _unitOfWork.Repository<User>().GetQueryable().AsNoTracking()
                    on log.UserId equals user.Id
                select new { log, user.FirstName, user.LastName };

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(x =>
                    (x.FirstName + " " + x.LastName).ToLower().Contains(term) ||
                    x.log.Action.ToLower().Contains(term) ||
                    x.log.Details.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(action))
            {
                var cleanAction = action.Trim().ToLower();
                query = query.Where(x => x.log.Action.ToLower().Contains(cleanAction));
            }

            if (from.HasValue)
                query = query.Where(x => x.log.Timestamp >= from.Value);

            if (to.HasValue)
                query = query.Where(x => x.log.Timestamp <= to.Value);

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(x => x.log.Timestamp)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new AuditLogDto(
                    x.log.Id, x.log.UserId,
                    x.FirstName + " " + x.LastName,
                    x.log.Action, x.log.Details, x.log.Timestamp))
                .ToListAsync();

            return new PagedResult<AuditLogDto>(items, totalCount, pageNumber, pageSize);
        }
    }
}
