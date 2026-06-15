using Hangfire;
using InnoTrack.Application.DTOs.Projects;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Entities.Enums;
using InnoTrack.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.Application.Services
{
    public class ProjectService : IProjectService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly INotificationService _notificationService;

        public ProjectService(IUnitOfWork unitOfWork, INotificationService notificationService)
        {
            _unitOfWork = unitOfWork;
            _notificationService = notificationService;
        }

        public async Task VerifyProjectForSubmissionAsync(int projectId, int userId, SubmitProjectRequestDto dto)
        {
            var supervisorId = dto.SupervisorId;
            var draft = await _unitOfWork.Repository<ProjectDraft>()
                .GetQueryable()
                .Include(d => d.DraftTechnologies)
                .FirstOrDefaultAsync(d => d.Id == projectId);
            if (draft == null)
                throw new KeyNotFoundException("Draft not found.");

            var leaderRecord = await _unitOfWork.Repository<TeamMember>()
                .FindAsync(tm => tm.TeamId == draft.TeamId && tm.StudentId == userId);

            if (leaderRecord == null || leaderRecord.Role != TeamMemberRole.Leader)
                throw new UnauthorizedAccessException("Only the team leader can submit the project.");

            var existingProject = await _unitOfWork.Repository<Project>()
                .FindAsync(p => p.TeamId == draft.TeamId);
            if (existingProject != null)
                throw new InvalidOperationException("Your team already has an active or submitted project.");

            var supervisor = await _unitOfWork.Repository<Professor>().GetByIdAsync(supervisorId);
            if (supervisor == null)
                throw new KeyNotFoundException("Supervisor not found.");

            if (supervisor.DepartmentId != dto.DepartmentId)
                throw new InvalidOperationException("Selected professor does not belong to the selected department.");

            var department = await _unitOfWork.Repository<Department>().GetByIdAsync(dto.DepartmentId);
            if (department == null)
                throw new KeyNotFoundException("Department not found.");

            var currentActiveLoad = await _unitOfWork.Repository<Team>()
                 .CountAsync(t => t.ProfessorId == supervisorId &&
                     (t.Project == null || t.Project.Status != ProjectStatus.Completed));

            if (currentActiveLoad >= supervisor.MaxTeamLoad)
                throw new InvalidOperationException($"Dr. {supervisor.FullName} has reached their maximum capacity of teams.");

            var team = await _unitOfWork.Repository<Team>().GetByIdAsync(draft.TeamId);
            if (team == null)
                throw new KeyNotFoundException("Team not found.");

            if (draft.OriginalityScore == null || draft.OriginalityScore < 60)
                throw new InvalidOperationException("Project originality must be at least 60% before sending to a supervisor.");

            var activeAcademicYear = await _unitOfWork.Repository<AcademicYear>()
                .FindAsync(y => y.IsActive);
            if (activeAcademicYear == null)
                throw new InvalidOperationException("Academic year configuration is missing. Please contact administration.");

            await _unitOfWork.BeginTransactionAsync();
            Project project;
            try
            {

                project = new Project
                {
                    Title = draft.Title,
                    Abstract = draft.Abstract,
                    Description = draft.Description,
                    Status = ProjectStatus.UnderReview,
                    OriginalityScore = draft.OriginalityScore,
                    Year = draft.Year,
                    StudentNames = draft.StudentNames,
                    CreatedAt = DateTime.UtcNow,
                    SubmittedAt = DateTime.UtcNow,
                    TeamId = draft.TeamId,
                    DomainId = draft.DomainId,
                    AcademicYearId = activeAcademicYear.Id,
                    ProblemStatement = draft.ProblemStatement,
                    ProposedSolution = draft.ProposedSolution,
                    Objectives = draft.Objectives,
                    ProposalDepartment = department.Name,
                    ProposalTeamMembers = dto.TeamMembers,
                    ProposalMessage = dto.Message,
                    ProposedSupervisorId = supervisorId,
                };

                await _unitOfWork.Repository<Project>().AddAsync(project);
                await _unitOfWork.CompleteAsync();

                foreach (var draftTech in draft.DraftTechnologies)
                {
                    await _unitOfWork.Repository<ProjectTechnology>().AddAsync(new ProjectTechnology
                    {
                        ProjectId = project.Id,
                        TechnologyId = draftTech.TechnologyId,
                    });
                }

                _unitOfWork.Repository<ProjectDraft>().Delete(draft);
                await _unitOfWork.CommitTransactionAsync();
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync();
                throw;
            }

            // Removed immediate notification to supervisor. Will be sent by AI Analysis Service if approved.

            BackgroundJob.Enqueue<IProjectAnalysisService>(aiService => aiService.ProcessProjectAiReportAsync(project.Id));

            // Log the submission activity
            var log = new ProjectActivityLog
            {
                ProjectId = project.Id,
                Type = "status",
                Message = "Project submitted for review",
                ActorName = "Team Leader",
                IconName = "GitCommit",
                ColorClass = "text-purple-500",
                BgClass = "bg-purple-500/10"
            };
            await _unitOfWork.Repository<ProjectActivityLog>().AddAsync(log);
            await _unitOfWork.CompleteAsync();

            await _notificationService.SendProjectActivityLogAsync(project.Id, log.Type, log.Message, log.ActorName, log.IconName, log.ColorClass, log.BgClass);
        }

        public async Task<List<ProjectActivityLogDto>> GetProjectLogsAsync(int projectId)
        {
            var logs = await _unitOfWork.Repository<ProjectActivityLog>()
                .GetQueryable()
                .Where(l => l.ProjectId == projectId)
                .OrderByDescending(l => l.Timestamp)
                .ToListAsync();

            return logs.Select(l => new ProjectActivityLogDto(
                l.Id,
                l.Type,
                l.Message,
                DateTime.SpecifyKind(l.Timestamp, DateTimeKind.Utc).ToString("o"),
                l.ActorName,
                l.IconName,
                l.ColorClass,
                l.BgClass
            )).ToList();
        }

        public async Task ToggleProjectMuteAsync(int userId, int projectId)
        {
            var pref = await _unitOfWork.Repository<ProjectNotificationPreference>()
                .FindAsync(p => p.UserId == userId && p.ProjectId == projectId);

            if (pref == null)
            {
                pref = new ProjectNotificationPreference
                {
                    UserId = userId,
                    ProjectId = projectId,
                    IsMuted = true
                };
                await _unitOfWork.Repository<ProjectNotificationPreference>().AddAsync(pref);
            }
            else
            {
                pref.IsMuted = !pref.IsMuted;
                pref.UpdatedAt = DateTime.UtcNow;
                _unitOfWork.Repository<ProjectNotificationPreference>().Update(pref);
            }

            await _unitOfWork.CompleteAsync();
        }
    }
}