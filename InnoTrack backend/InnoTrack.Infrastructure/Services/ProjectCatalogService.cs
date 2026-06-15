using InnoTrack.Application.Common;
using InnoTrack.Application.DTOs.AI;
using InnoTrack.Application.DTOs.Projects;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Entities.Enums;
using InnoTrack.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace InnoTrack.Infrastructure.Services
{
    public class ProjectCatalogService : IProjectCatalogService
    {
        private readonly ApplicationDbContext _context;
        private readonly IPythonAiClient _aiClient;
        private readonly INotificationService _notificationService;
        private readonly ILogger<ProjectCatalogService> _logger;


        public ProjectCatalogService(ApplicationDbContext context, IPythonAiClient aiClient, INotificationService notificationService, ILogger<ProjectCatalogService> logger)
        {
            _context = context;
            _aiClient = aiClient;
            _notificationService = notificationService;
            _logger = logger;
        }

        public async Task<PagedResult<ProjectCatalogItemDto>> GetProjectsAsync(
            ProjectCatalogFilterDto filter, int pageNumber, int pageSize)
        {
            int activeYearId = await _context.AcademicYears
                .Where(y => y.IsActive)
                .Select(y => y.Id)
                .FirstOrDefaultAsync();

            var query = _context.Projects
                .AsNoTracking()
                .Include(p => p.Domain)
                .Include(p => p.Team).ThenInclude(t => t.Supervisor)
                .Include(p => p.Team).ThenInclude(t => t.Members).ThenInclude(m => m.Student)
                .Include(p => p.ProjectTechnologies).ThenInclude(pt => pt.Technology)
                .AsQueryable();

            query = query.Where(p =>
                p.Status == ProjectStatus.In_Progress ||
                p.Status == ProjectStatus.Approved ||
                p.Status == ProjectStatus.Completed);

            if (filter.IsCurrentAcademicYear.HasValue)
            {
                if (filter.IsCurrentAcademicYear.Value)
                    query = query.Where(p => p.AcademicYearId == activeYearId);
                else
                    query = query.Where(p => p.AcademicYearId != activeYearId);
            }

            if (filter.Year.HasValue)
                query = query.Where(p => (p.Year ?? p.CreatedAt.Year) == filter.Year.Value);

            if (!string.IsNullOrWhiteSpace(filter.Status))
            {
                var searchStatus = filter.Status.Replace("-", "_").Replace(" ", "_");
                if (Enum.TryParse<ProjectStatus>(searchStatus, true, out var parsedStatus))
                {
                    query = query.Where(p => p.Status == parsedStatus);
                }
                else
                {
                    if (filter.Status.Equals("completed", StringComparison.OrdinalIgnoreCase))
                        query = query.Where(p => p.Status == ProjectStatus.Completed);
                    else if (filter.Status.Equals("in progress", StringComparison.OrdinalIgnoreCase))
                        query = query.Where(p => p.Status == ProjectStatus.In_Progress);
                }
            }

            if (filter.DomainId.HasValue)
                query = query.Where(p => p.DomainId == filter.DomainId.Value);

            if (filter.SupervisorId.HasValue)
                query = query.Where(p => p.Team.ProfessorId == filter.SupervisorId.Value);

            if (filter.TechnologyId.HasValue)
                query = query.Where(p => p.ProjectTechnologies.Any(pt => pt.TechnologyId == filter.TechnologyId.Value));

            if (filter.MinOriginalityScore.HasValue)
            {
                var minScore = filter.MinOriginalityScore.Value;
                query = query.Where(p => 
                    (p.OriginalityScore > 1 && p.OriginalityScore >= minScore) || 
                    (p.OriginalityScore >= 0 && p.OriginalityScore <= 1 && (p.OriginalityScore * 100) >= minScore)
                );
            }

            if (filter.MaxOriginalityScore.HasValue)
            {
                var maxScore = filter.MaxOriginalityScore.Value;
                query = query.Where(p => 
                    (p.OriginalityScore > 1 && p.OriginalityScore <= maxScore) || 
                    (p.OriginalityScore >= 0 && p.OriginalityScore <= 1 && (p.OriginalityScore * 100) <= maxScore)
                );
            }

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                query = query.Where(p =>
                    p.Title.Contains(filter.Search) ||
                    p.Domain.Name.Contains(filter.Search) ||
                    p.ProjectTechnologies.Any(pt => pt.Technology.Name.Contains(filter.Search)));
            }

            var totalCount = await query.CountAsync();

            var rawData = await query
                .OrderByDescending(p => p.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new {
                    p.Id,
                    p.Title,
                    DomainName = p.Domain.Name,
                    p.Status,
                    Year = p.Year ?? p.CreatedAt.Year,
                    Supervisor = p.Team.Supervisor != null ? p.Team.Supervisor.FullName : null,
                    Members = p.Team.Members.Select(m => m.Student.FullName).ToList(),
                    StudentNames = p.StudentNames,
                    Technologies = p.ProjectTechnologies.Select(pt => pt.Technology.Name).ToList(),
                    p.OriginalityScore,
                    TeamId = p.TeamId,
                    AcceptsJoin = (p.AcademicYearId == activeYearId) && (p.Team.Members.Count < p.Team.MaxSize)
                })
                .ToListAsync();

            var data = rawData.Select(p => new ProjectCatalogItemDto(
                p.Id,
                p.Title,
                p.DomainName,
                MapStatus(p.Status),
                p.Year,
                p.TeamId,
                p.Supervisor,
                p.Members.Any()
                    ? p.Members
                    : (string.IsNullOrWhiteSpace(p.StudentNames)
                        ? new List<string>()
                        : p.StudentNames.Split(new[] { ',', '&', '\n' }, StringSplitOptions.RemoveEmptyEntries).Select(n => n.Trim()).Where(n => !string.IsNullOrEmpty(n)).ToList()),
                p.Technologies,
                p.OriginalityScore,
                p.AcceptsJoin
            )).ToList();

            return new PagedResult<ProjectCatalogItemDto>(data.AsReadOnly(), totalCount, pageNumber, pageSize);
        }

        public async Task<CatalogTabsCountDto> GetCatalogTabsCountAsync()
        {
            int activeYearId = await _context.AcademicYears
                .Where(y => y.IsActive)
                .Select(y => y.Id)
                .FirstOrDefaultAsync();

            var baseQuery = _context.Projects
                .Where(p =>
                    p.Status == ProjectStatus.In_Progress ||
                    p.Status == ProjectStatus.Approved ||
                    p.Status == ProjectStatus.Completed);

            int thisYearCount = await baseQuery.CountAsync(p => p.AcademicYearId == activeYearId);
            int oldProjectsCount = await baseQuery.CountAsync(p => p.AcademicYearId != activeYearId);

            return new CatalogTabsCountDto(thisYearCount, oldProjectsCount);
        }
        public async Task<ProjectCatalogDetailDto> GetProjectByIdAsync(int projectId, int? userId = null)
        {
            var project = await _context.Projects
                .AsNoTracking()
                .Include(p => p.Team).ThenInclude(t => t.Supervisor)
                .Include(p => p.Team).ThenInclude(t => t.Members)
                    .ThenInclude(m => m.Student).ThenInclude(s => s.Department)
                .Include(p => p.ProjectTechnologies).ThenInclude(pt => pt.Technology)
                .Include(p => p.Domain)
                .Include(p => p.AcademicYear)
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project == null)
                throw new KeyNotFoundException("Project not found.");

            bool isPublicProject =
                project.Status == ProjectStatus.In_Progress ||
                project.Status == ProjectStatus.Approved ||
                project.Status == ProjectStatus.Completed;
            if (!isPublicProject)
            {
                if (!userId.HasValue)
                    throw new UnauthorizedAccessException("Only team members can view this project.");

                bool isTeamMember = project.Team.Members.Any(m => m.StudentId == userId.Value);
                if (!isTeamMember)
                    throw new UnauthorizedAccessException("Only team members can view this project.");
            }

            var students = new List<StudentInProjectDto>();

            if (project.Team != null && project.Team.Members.Any())
            {
                students = project.Team.Members.Select(m => new StudentInProjectDto(
                    m.Student.FullName,
                    m.Role.ToString(),
                    m.Student.Department?.Name ?? string.Empty,
                    m.Student.ProfilePictureURL
                )).ToList();
            }
            else if (!string.IsNullOrWhiteSpace(project.StudentNames))
            {
                var legacyNames = project.StudentNames
                    .Split(new[] { ',', '&', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(name => name.Trim())
                    .Where(name => !string.IsNullOrEmpty(name));

                students = legacyNames.Select(name => new StudentInProjectDto(
                    Name: name,
                    Role: "Member",
                    Department: "Unknown",
                    ProfilePictureUrl: null
                )).ToList();
            }

            bool isMuted = false;
            if (userId.HasValue)
            {
                var pref = await _context.ProjectNotificationPreferences
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.UserId == userId.Value && p.ProjectId == projectId);
                if (pref != null)
                {
                    isMuted = pref.IsMuted;
                }
            }

            return new ProjectCatalogDetailDto(
                    project.Id,
                    project.Title,
                    project.Domain?.Name ?? "Uncategorized",
                    MapStatus(project.Status),
                    project.AcademicYear?.Name ?? project.CreatedAt.Year.ToString(),
                    project.Team.Supervisor?.FullName,
                    project.ProjectTechnologies.Select(pt => pt.Technology.Name).ToList().AsReadOnly(),
                    project.OriginalityScore,
                    project.SubmittedAt,
                    project.ApprovedAt,
                    project.UpdatedAt,
                    project.Description,
                    project.Abstract,
                    project.ProblemStatement,
                    project.ProposedSolution,
                    project.Objectives,
                    students.AsReadOnly(),
                    isMuted
                );
        }

        public async Task<MyProjectResponseDto?> GetMyProjectAsync(int userId)
        {
            var teamMember = await _context.TeamMembers
                .AsNoTrackingWithIdentityResolution()
                .Include(tm => tm.Team).ThenInclude(t => t.Project)
                     .ThenInclude(p => p!.Domain)
                .Include(tm => tm.Team).ThenInclude(t => t.Project)
                     .ThenInclude(p => p!.ProjectTechnologies).ThenInclude(pt => pt.Technology)
                .Include(tm => tm.Team).ThenInclude(t => t.Members).ThenInclude(m => m.Student)
                .Include(tm => tm.Team).ThenInclude(t => t.Supervisor)
                .FirstOrDefaultAsync(tm => tm.StudentId == userId);

            var project = teamMember?.Team?.Project;
            if (project == null || project.Status == ProjectStatus.Abandoned) return null;

            var members = teamMember!.Team.Members
                .Select(m => new TeamMemberSummaryDto(m.Student.FullName, m.Role.ToString()))
                .ToList();

            var technologies = project.ProjectTechnologies
                .Select(pt => pt.Technology.Name)
                .ToList();

            return new MyProjectResponseDto(
                ProjectId: project.Id,
                Title: project.Title,
                Status: project.Status.ToString(),
                DomainName: project.Domain?.Name,
                OriginalityScore: project.OriginalityScore,
                JoinCode: teamMember.Team.JoinCode,
                Technologies: technologies.AsReadOnly(),
                Members: members.AsReadOnly(),
                CreatedAt: project.CreatedAt,
                SubmittedAt: project.SubmittedAt,
                SupervisorName: teamMember.Team.Supervisor?.FullName,
                TeamName: teamMember.Team.Name
            );
        }

        public async Task<IReadOnlyList<ProjectDraftDto>> GetMyDraftsAsync(int userId)
        {
            var teamMember = await _context.TeamMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(tm => tm.StudentId == userId);
            if (teamMember == null) return Array.Empty<ProjectDraftDto>();

            var drafts = await _context.ProjectDrafts
                .AsNoTracking()
                .Include(d => d.Domain)
                .Include(d => d.DraftTechnologies).ThenInclude(dt => dt.Technology)
                .Where(d => d.TeamId == teamMember.TeamId)
                .OrderByDescending(d => d.UpdatedAt ?? d.CreatedAt)
                .ToListAsync();

            bool canEdit = teamMember.Role == TeamMemberRole.Leader;
            return drafts.Select(d => MapDraft(d, canEdit)).ToList().AsReadOnly();
        }

        public async Task<ProjectDraftDto> GetDraftByIdAsync(int draftId, int userId)
        {
            var teamMember = await _context.TeamMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(tm => tm.StudentId == userId);
            if (teamMember == null) throw new UnauthorizedAccessException("You must be in a team to view drafts.");

            var draft = await _context.ProjectDrafts
                .AsNoTracking()
                .Include(d => d.Domain)
                .Include(d => d.DraftTechnologies).ThenInclude(dt => dt.Technology)
                .FirstOrDefaultAsync(d => d.Id == draftId && d.TeamId == teamMember.TeamId);
            if (draft == null) throw new KeyNotFoundException("Draft not found.");

            return MapDraft(draft, teamMember.Role == TeamMemberRole.Leader);
        }

        public async Task<IReadOnlyList<SupervisorDto>> GetSupervisorsAsync(int? departmentId = null)
        {
            var query = _context.Professors
                .AsNoTracking()
                .Include(p => p.Department)
                .Include(p => p.SupervisedTeams)
                    .ThenInclude(t => t.Project)
                .AsQueryable();

            if (departmentId.HasValue)
            {
                query = query.Where(p => p.DepartmentId == departmentId.Value);
            }

            var supervisors = await query
                .Select(p => new SupervisorDto(
                    p.Id,
                    p.FullName,
                    p.Department.Name,
                    p.Email,
                    p.SupervisedTeams.Count(t => t.Project == null || t.Project.Status != ProjectStatus.Completed),
                    p.MaxTeamLoad,
                    p.IsActive
                ))
                .ToListAsync();

            return supervisors.AsReadOnly();
        }

        public async Task<SaveDraftResponseDto> SaveDraftAsync(int userId, SaveProjectDraftDto dto)
        {
            var leaderRecord = await _context.TeamMembers
                .FirstOrDefaultAsync(tm => tm.StudentId == userId && tm.Role == TeamMemberRole.Leader);
            if (leaderRecord == null)
                throw new UnauthorizedAccessException("Only a team leader can create a project draft.");

            var existingProject = await _context.Projects
                .FirstOrDefaultAsync(p => p.TeamId == leaderRecord.TeamId);
            if (existingProject != null)
                throw new InvalidOperationException("Your team already has a project.");

            var draftsCount = await _context.ProjectDrafts
                .CountAsync(d => d.TeamId == leaderRecord.TeamId);
            if (draftsCount >= 5)
                throw new InvalidOperationException("Your team can only have a maximum of 5 project drafts.");

            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var draft = new ProjectDraft
                {
                    Title = dto.Title,
                    Abstract = dto.Abstract,
                    Description = dto.Description,
                    ProblemStatement = dto.ProblemStatement,
                    ProposedSolution = dto.ProposedSolution,
                    Objectives = dto.Objectives,
                    DomainId = dto.DomainId,
                    TeamId = leaderRecord.TeamId,
                    CreatedByUserId = userId,
                    Year = dto.Year,
                    StudentNames = dto.StudentNames,
                    OriginalityScore = dto.OriginalityScore,
                };
                _context.ProjectDrafts.Add(draft);
                await _context.SaveChangesAsync();

                foreach (var techId in dto.TechnologyIds)
                {
                    _context.ProjectDraftTechnologies.Add(
                        new ProjectDraftTechnology { ProjectDraftId = draft.Id, TechnologyId = techId });
                }
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return new SaveDraftResponseDto(draft.Id, draft.Title, draft.CreatedAt);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<SaveDraftResponseDto> UpdateDraftAsync(int draftId, int userId, SaveProjectDraftDto dto)
        {
            var draft = await _context.ProjectDrafts.FindAsync(draftId);
            if (draft == null) throw new KeyNotFoundException("Draft not found.");

            var leaderRecord = await _context.TeamMembers
                .FirstOrDefaultAsync(tm => tm.TeamId == draft.TeamId
                                            && tm.StudentId == userId
                                            && tm.Role == TeamMemberRole.Leader);
            if (leaderRecord == null)
                throw new UnauthorizedAccessException("Only the team leader can update this draft.");

            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                bool textChanged = draft.Abstract != dto.Abstract ||
                           draft.Description != dto.Description ||
                           draft.Title != dto.Title;

                if (textChanged)
                {
                    draft.OriginalityScore = null;
                }
                else if (dto.OriginalityScore.HasValue)
                {
                    draft.OriginalityScore = dto.OriginalityScore.Value;
                }
                draft.Title = dto.Title;
                draft.Abstract = dto.Abstract;
                draft.Description = dto.Description;
                draft.DomainId = dto.DomainId;
                draft.ProblemStatement = dto.ProblemStatement;
                draft.ProposedSolution = dto.ProposedSolution;
                draft.Objectives = dto.Objectives;
                draft.UpdatedAt = DateTime.UtcNow;
                draft.StudentNames = dto.StudentNames;

                var existingTechs = _context.ProjectDraftTechnologies.Where(dt => dt.ProjectDraftId == draftId);
                _context.ProjectDraftTechnologies.RemoveRange(existingTechs);

                foreach (var techId in dto.TechnologyIds)
                {
                    _context.ProjectDraftTechnologies.Add(
                        new ProjectDraftTechnology { ProjectDraftId = draftId, TechnologyId = techId });
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return new SaveDraftResponseDto(draft.Id, draft.Title, draft.UpdatedAt.Value);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task DeleteDraftAsync(int draftId, int userId)
        {
            var draft = await _context.ProjectDrafts.FindAsync(draftId);
            if (draft == null)
                throw new KeyNotFoundException("Draft not found.");

            var leaderRecord = await _context.TeamMembers
                .FirstOrDefaultAsync(tm => tm.TeamId == draft.TeamId
                                          && tm.StudentId == userId
                                          && tm.Role == TeamMemberRole.Leader);
            if (leaderRecord == null)
                throw new UnauthorizedAccessException("Only the team leader can delete this draft.");

            _context.ProjectDrafts.Remove(draft);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateProjectDetailsAsync(int projectId, int userId, UpdateProjectDetailsDto dto)
        {
            var project = await _context.Projects
                .Include(p => p.Team)
                    .ThenInclude(t => t.Members)
                .FirstOrDefaultAsync(p => p.Id == projectId);
            if (project == null) throw new KeyNotFoundException("Project not found.");

            var isLeader = await _context.TeamMembers
                .AnyAsync(tm => tm.TeamId == project.TeamId && tm.StudentId == userId && tm.Role == TeamMemberRole.Leader);
            if (!isLeader) throw new UnauthorizedAccessException("Only the team leader can update project details.");

            if (project.Status == ProjectStatus.Completed || project.Status == ProjectStatus.Abandoned)
                throw new InvalidOperationException("Cannot edit a completed or abandoned project.");

            if (project.Status == ProjectStatus.UnderReview)
                throw new InvalidOperationException("Project is currently under review by the professor and cannot be modified.");

            bool isLimitedMode = project.Status == ProjectStatus.In_Progress;

            // Capture old values for comparison
            string oldTitle = project.Title;
            string? oldDescription = project.Description;
            string? oldObjectives = project.Objectives;
            string? oldAbstract = project.Abstract;
            string? oldProblemStatement = project.ProblemStatement;
            string? oldProposedSolution = project.ProposedSolution;
            int oldDomainId = project.DomainId;

            var existingTechIds = await _context.ProjectTechnologies
                .Where(pt => pt.ProjectId == projectId)
                .Select(pt => pt.TechnologyId)
                .ToListAsync();

            if (dto.Title != null) project.Title = dto.Title;
            if (dto.Objectives != null) project.Objectives = dto.Objectives;
            if (dto.Description != null) project.Description = dto.Description;

            if (!isLimitedMode)
            {
                if (dto.Abstract != null) project.Abstract = dto.Abstract;
                if (dto.ProblemStatement != null) project.ProblemStatement = dto.ProblemStatement;
                if (dto.ProposedSolution != null) project.ProposedSolution = dto.ProposedSolution;
                if (dto.DomainId.HasValue) project.DomainId = dto.DomainId.Value;
            }

            if (dto.TechnologyIds != null)
            {
                var existing = _context.ProjectTechnologies.Where(pt => pt.ProjectId == projectId);
                _context.ProjectTechnologies.RemoveRange(existing);
                foreach (var techId in dto.TechnologyIds)
                {
                    _context.ProjectTechnologies.Add(new ProjectTechnology { ProjectId = projectId, TechnologyId = techId });
                }
            }

            project.UpdatedAt = DateTime.UtcNow;
            _context.Projects.Update(project);

            // Build activity log entries for changed fields
            var logMessages = new List<string>();
            if (dto.Title != null && dto.Title != oldTitle)
                logMessages.Add("Title updated");
            if (dto.Description != null && dto.Description != oldDescription)
                logMessages.Add("Description updated");
            if (dto.Objectives != null && dto.Objectives != oldObjectives)
                logMessages.Add("Objectives updated");

            if (!isLimitedMode)
            {
                if (dto.Abstract != null && dto.Abstract != oldAbstract)
                    logMessages.Add("Abstract updated");
                if (dto.ProblemStatement != null && dto.ProblemStatement != oldProblemStatement)
                    logMessages.Add("Problem statement updated");
                if (dto.ProposedSolution != null && dto.ProposedSolution != oldProposedSolution)
                    logMessages.Add("Proposed solution updated");
                if (dto.DomainId.HasValue && dto.DomainId.Value != oldDomainId)
                    logMessages.Add("Domain updated");
            }

            if (dto.TechnologyIds != null)
            {
                bool techChanged = existingTechIds.Count != dto.TechnologyIds.Count || !existingTechIds.All(dto.TechnologyIds.Contains);
                if (techChanged)
                {
                    logMessages.Add("Technologies updated");
                }
            }

            foreach (var msg in logMessages)
            {
                var log = new ProjectActivityLog
                {
                    ProjectId = projectId,
                    Type = "update",
                    Message = msg,
                    ActorName = "Team Leader",
                    IconName = "FileText",
                    ColorClass = "text-primary",
                    BgClass = "bg-primary/10"
                };
                _context.ProjectActivityLogs.Add(log);
            }

            await _context.SaveChangesAsync();

            // Notify and broadcast logs after SaveChangesAsync
            foreach (var msg in logMessages)
            {
                await _notificationService.SendProjectActivityLogAsync(projectId, "update", msg, "Team Leader", "FileText", "text-primary", "bg-primary/10");
            }

            if (logMessages.Any())
            {
                var shortTitle = project.Title.Trim();
                if (shortTitle.Length > 80) shortTitle = shortTitle.Substring(0, 77) + "...";
                var notificationMessage = $"Project '{shortTitle}': {string.Join(", ", logMessages)}.";

                if (project.Team?.ProfessorId != null)
                {
                    await _notificationService.SendNotificationAsync(
                        userId: project.Team.ProfessorId.Value,
                        title: "Project Details Updated",
                        message: notificationMessage,
                        type: NotificationType.Info,
                        referenceId: project.Id,
                        referenceType: ReferenceType.Project
                    );
                }

                if (project.Team?.Members != null)
                {
                    var membersToNotify = project.Team.Members.Where(m => m.StudentId != userId).ToList();
                    foreach (var member in membersToNotify)
                    {
                        await _notificationService.SendNotificationAsync(
                            userId: member.StudentId,
                            title: "Project Details Updated",
                            message: notificationMessage,
                            type: NotificationType.Info,
                            referenceId: project.Id,
                            referenceType: ReferenceType.Project
                        );
                    }
                }
            }
        }

        public async Task RecallSubmissionAsync(int projectId, int userId)
        {
            var project = await _context.Projects
                .Include(p => p.ProjectTechnologies)
                .FirstOrDefaultAsync(p => p.Id == projectId);
            if (project == null) throw new KeyNotFoundException("Project not found.");

            if (project.Status != ProjectStatus.UnderReview)
                throw new InvalidOperationException("Only submitted projects can be recalled.");

            var leaderRecord = await _context.TeamMembers
                .FirstOrDefaultAsync(tm => tm.TeamId == project.TeamId && tm.StudentId == userId && tm.Role == TeamMemberRole.Leader);
            if (leaderRecord == null) throw new UnauthorizedAccessException("Only the team leader can recall a submission.");

            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var draft = new ProjectDraft
                {
                    Title = project.Title,
                    Abstract = project.Abstract,
                    Description = project.Description,
                    Year = project.Year ?? project.CreatedAt.Year,
                    StudentNames = project.StudentNames,
                    OriginalityScore = project.OriginalityScore,
                    CreatedAt = DateTime.UtcNow,
                    TeamId = project.TeamId.Value,
                    CreatedByUserId = userId,
                    DomainId = project.DomainId,
                    ProblemStatement = project.ProblemStatement,
                    ProposedSolution = project.ProposedSolution,
                    Objectives = project.Objectives,
                };
                _context.ProjectDrafts.Add(draft);
                await _context.SaveChangesAsync();

                foreach (var tech in project.ProjectTechnologies)
                {
                    _context.ProjectDraftTechnologies.Add(new ProjectDraftTechnology
                    {
                        ProjectDraftId = draft.Id,
                        TechnologyId = tech.TechnologyId,
                    });
                }

                var team = await _context.Teams.FindAsync(project.TeamId);
                int? professorId = team?.ProfessorId;
                if (team != null && team.ProfessorId.HasValue)
                {
                    team.ProfessorId = null;
                }

                _context.Projects.Remove(project);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                if (professorId.HasValue)
                {
                    try
                    {
                        await _notificationService.SendNotificationAsync(
                            userId: professorId.Value,
                            title: "Project Submission Recalled",
                            message: $"The team for project '{project.Title}' has recalled their submission, returning it to draft.",
                            type: NotificationType.Warning,
                            referenceId: null,
                            referenceType: ReferenceType.System
                        );
                    }
                    catch (Exception ex) 
                    { 
                        _logger.LogWarning(ex, "Failed to send notification to professor {ProfessorId} when project {ProjectId} was recalled.", professorId.Value, projectId);
                    }
                }
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<SimilarityCheckResponseDto> RunSimilarityCheckAsync(SimilarityCheckRequestDto dto)
        {
            var aiRequest = new PythonAiRequestDto(
                title: dto.Title,
                description: dto.Description,
                abstractText: dto.Abstract
            );

            var aiResponse = await _aiClient.AnalyzeProjectAsync(aiRequest);

            var topProjects = aiResponse.TopSimilarProjects ?? new List<PythonSimilarProjectDto>();
            decimal overallScore = aiResponse.OverallOriginalityScore > 0 
                ? aiResponse.OverallOriginalityScore : (topProjects.FirstOrDefault()?.FinalOriginalityScore ?? 100m);

            var similarProjects = new List<SimilarProjectResultDto>();
            foreach (var sp in topProjects)
            {
                var referencedProject = await _context.Projects
                            .AsNoTracking()
                            .FirstOrDefaultAsync(p => p.Title == sp.ProjectTitle);

                similarProjects.Add(new SimilarProjectResultDto(
                    referencedProject?.Id,
                    sp.ProjectTitle ?? "Unknown Project",
                    NormalizePercent(sp.SimilarityScore)));
            }

            return new SimilarityCheckResponseDto(overallScore, similarProjects.AsReadOnly());
        }

        public async Task<string> GenerateAiAbstractAsync(int userId, GenerateAbstractRequestDto dto)
        {
            var isLeader = await _context.TeamMembers
                .AnyAsync(tm => tm.StudentId == userId && tm.Role == TeamMemberRole.Leader);

            if (!isLeader)
                throw new UnauthorizedAccessException("Only team leaders can request AI abstract generation.");

            int wordCount = (dto.Description + dto.ProblemStatement + dto.ProposedSolution)
                .Split(new[] { ' ', '\n' }, StringSplitOptions.RemoveEmptyEntries).Length;

            if (wordCount < 50)
                throw new InvalidOperationException("Please provide more details in the description and problem statement so the AI can generate a meaningful abstract.");

            var response = await _aiClient.GenerateProjectAbstractAsync(dto);

            return response.GeneratedAbstract;
        }

        public async Task AbandonProjectAsync(int projectId, int userId, string reason)
        {
            var project = await _context.Projects
                .Include(p => p.Team)
                .ThenInclude(t => t.Members)
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project == null)
                throw new KeyNotFoundException("Project not found.");

            var isLeader = project.Team.Members
                    .Any(tm => tm.StudentId == userId && tm.Role == TeamMemberRole.Leader);

            if (!isLeader)
                throw new UnauthorizedAccessException("Only the team leader can abandon the project.");

            if (project.Status == ProjectStatus.Completed)
                throw new InvalidOperationException("Cannot abandon a completed project.");

            var notificationTitle = "Project Abandoned";
            var notificationMessage = $"The project '{project.Title}' has been abandoned by the team leader. Reason: {reason}";

            var membersToNotify = project.Team.Members.Where(m => m.StudentId != userId).ToList();
            foreach (var member in membersToNotify)
            {
                await _notificationService.SendNotificationAsync(
                    userId: member.StudentId,
                    title: notificationTitle,
                    message: notificationMessage,
                    type: NotificationType.Error,
                    referenceId: project.Id,
                    referenceType: ReferenceType.Project
                );
            }

            if (project.Team.ProfessorId.HasValue)
            {
                await _notificationService.SendNotificationAsync(
                    userId: project.Team.ProfessorId.Value,
                    title: "Project Abandoned by Team",
                    message: notificationMessage,
                    type: NotificationType.Warning,
                    referenceId: project.Id,
                    referenceType: ReferenceType.Project
                );
            }

            // Log activity first, before unlinking the team!
            var log = new ProjectActivityLog
            {
                ProjectId = project.Id,
                Type = "status",
                Message = $"Project abandoned by the team leader. Reason: {reason}",
                ActorName = "Team Leader",
                IconName = "AlertTriangle",
                ColorClass = "text-red-500",
                BgClass = "bg-red-500/10",
                Timestamp = DateTime.UtcNow
            };
            _context.ProjectActivityLogs.Add(log);
            await _context.SaveChangesAsync();

            // Broadcast log activity to team members & professor before unlinking the team
            await _notificationService.SendProjectActivityLogAsync(project.Id, log.Type, log.Message, log.ActorName, log.IconName, log.ColorClass, log.BgClass);

            var team = await _context.Teams.FindAsync(project.TeamId);
            if (team != null)
            {
                team.ProfessorId = null;
            }

            project.Status = ProjectStatus.Abandoned;
            project.AbandonReason = reason;
            project.TeamId = null; // Unlink the team!

            _context.Projects.Update(project);
            await _context.SaveChangesAsync();
        }

        public async Task<List<PublicShowcaseDto>> GetPublicShowcaseAsync()
        {
            return await _context.Projects
                .AsNoTracking()
                .Where(p => p.IsPublicShowcase)
                .Select(p => new PublicShowcaseDto(
                    p.Id,
                    p.Title,
                    p.Abstract,
                    p.OriginalityScore,
                    p.Team.Members.Select(m => m.Student.FullName).ToList()
                ))
                .ToListAsync();
        }

        private static string MapStatus(ProjectStatus status) => status switch
        {
            ProjectStatus.Draft => "draft",
            ProjectStatus.UnderReview => "under-review",
            ProjectStatus.In_Progress => "in-progress",
            ProjectStatus.Completed => "completed",
            ProjectStatus.Rejected => "rejected",
            ProjectStatus.Abandoned => "abandoned",
            _ => status.ToString().ToLower()
        };

        private static ProjectDraftDto MapDraft(ProjectDraft draft, bool canEdit)
        {
            return new ProjectDraftDto(
                draft.Id,
                draft.Title,
                draft.StudentNames,
                draft.Year,
                draft.Domain.Name,
                draft.DomainId,
                draft.OriginalityScore,
                draft.CreatedAt,
                draft.UpdatedAt,
                canEdit,
                draft.DraftTechnologies.Select(dt => dt.Technology.Name).ToList().AsReadOnly(),
                draft.DraftTechnologies.Select(dt => dt.TechnologyId).ToList().AsReadOnly(),
                draft.Abstract,
                draft.Description,
                draft.ProblemStatement,
                draft.ProposedSolution,
                draft.Objectives
            );
        }

        private static decimal NormalizePercent(decimal score)
        {
            return score > 1m ? score / 100m : score;
        }
    }
}
