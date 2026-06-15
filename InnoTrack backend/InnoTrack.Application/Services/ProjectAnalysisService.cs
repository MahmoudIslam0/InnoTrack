using InnoTrack.Application.DTOs.AI;
using InnoTrack.Application.DTOs.Projects;
using InnoTrack.Application.Interfaces;
using InnoTrack.Application.Settings;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Entities.Enums;
using InnoTrack.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace InnoTrack.Application.Services
{
    public class ProjectAnalysisService : IProjectAnalysisService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IPythonAiClient _aiClient;
        private readonly INotificationService _notificationService;
        private readonly ILogger<ProjectAnalysisService> _logger;
        private readonly OriginalityThresholds _thresholds;

        public ProjectAnalysisService(IUnitOfWork unitOfWork, IPythonAiClient aiClient, INotificationService notificationService, ILogger<ProjectAnalysisService> logger, IOptions<OriginalityThresholds> options)
        {
            _unitOfWork = unitOfWork;
            _aiClient = aiClient;
            _notificationService = notificationService;
            _logger = logger;
            _thresholds = options.Value;
        }

        public async Task ProcessProjectAiReportAsync(int projectId)
        {
            var project = await _unitOfWork.Repository<Project>().GetByIdAsync(projectId);
            if (project is null)
            {
                _logger.LogWarning("Project {ProjectId} not found during AI analysis.", projectId);
                return;
            }

            PythonAiResponseDto aiResponse;

            try
            {
                var request = new PythonAiRequestDto(
                    title: project.Title,
                    description: project.Description,
                    abstractText: project.Abstract
                );
                aiResponse = await _aiClient.AnalyzeProjectAsync(request);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing AI for project {ProjectId}", projectId);

                if (project.Status == ProjectStatus.UnderReview)
                {
                    project.Status = ProjectStatus.Draft;
                    _unitOfWork.Repository<Project>().Update(project);
                    await _unitOfWork.CompleteAsync();

                    var leader = await _unitOfWork.Repository<TeamMember>()
                        .FindAsync(tm => tm.TeamId == project.TeamId && tm.Role == TeamMemberRole.Leader);

                    if (leader != null)
                    {
                        await _notificationService.SendNotificationAsync(leader.StudentId,
                            "Analysis Failed",
                            "The AI analysis failed due to a server error. Please resubmit your project.",
                            NotificationType.Error,
                            project.Id,
                            ReferenceType.Project);
                    }
                }

                throw;
            }

            await _unitOfWork.BeginTransactionAsync();
            try
            {
                decimal overallScore = aiResponse.TopSimilarProjects.FirstOrDefault()?.FinalOriginalityScore ?? 100m;

                string generatedSummary = aiResponse.ExtractedFeatures != null && aiResponse.ExtractedFeatures.Any()
                    ? "Identified Key Features: " + string.Join(", ", aiResponse.ExtractedFeatures)
                    : "No summary features extracted by AI.";

                var vector = new VectorEmbedding
                {
                    ProjectId = project.Id,
                    ModelName = "SBERT",
                    VectorData = "Data omitted by AI",
                    GeneratedAt = DateTime.UtcNow
                };
                await _unitOfWork.Repository<VectorEmbedding>().AddAsync(vector);

                var report = new OriginalityReport
                {
                    ProjectId = project.Id,
                    OverallScore = NormalizePercent(overallScore),
                    Summary = generatedSummary,
                    GeneratedAt = DateTime.UtcNow,
                    SimilarProjects = new List<SimilarProject>()
                };

                var topProjects = aiResponse.TopSimilarProjects ?? new List<PythonSimilarProjectDto>();

                foreach (var sp in topProjects)
                {
                    var referencedProject = await _unitOfWork.Repository<Project>()
                        .GetQueryable()
                        .FirstOrDefaultAsync(p => p.Title == sp.ProjectTitle);

                    report.SimilarProjects.Add(new SimilarProject
                    {
                        ReferencedProjectId = referencedProject?.Id,
                        ProjectTitle = sp.ProjectTitle ?? "Unknown External Project",
                        SimilarityPercentage = NormalizePercent(sp.SimilarityScore),
                    });
                }
                await _unitOfWork.Repository<OriginalityReport>().AddAsync(report);

                project.OriginalityScore = NormalizePercent(overallScore);
                project.UpdatedAt = DateTime.UtcNow;

                var (status, notifTitle, notifMessage, notifType) = overallScore switch
                {
                    var score when score < (_thresholds.AutoRejectBelow * 100m)
                                    => (ProjectStatus.Rejected, "Project Rejected", $"Originality score {score}% is too low.", NotificationType.Error),

                    var score when score <= (_thresholds.RequireManualReviewBelow * 100m)
                                    => (ProjectStatus.UnderReview, "AI Analysis — Review Required", $"Originality score {score}%. Professor approval required.", NotificationType.Warning),

                    _ => (ProjectStatus.UnderReview, "AI Analysis Passed", $"Originality score {overallScore}%. Awaiting professor review.", NotificationType.Success)
                };

                var currentProjectState = await _unitOfWork.Repository<Project>().GetByIdAsync(project.Id);
                if (currentProjectState != null && currentProjectState.Status == ProjectStatus.Draft)
                {
                    currentProjectState.OriginalityScore = NormalizePercent(overallScore);
                    _unitOfWork.Repository<Project>().Update(currentProjectState);
                    await _unitOfWork.CompleteAsync();
                    await _unitOfWork.CommitTransactionAsync();
                    return;
                }

                if (status == ProjectStatus.Rejected)
                {
                    var teamLeader = await _unitOfWork.Repository<TeamMember>()
                        .FindAsync(tm => tm.TeamId == project.TeamId && tm.Role == TeamMemberRole.Leader);

                    var draft = new ProjectDraft
                    {
                        Title = project.Title,
                        Abstract = project.Abstract,
                        Description = project.Description,
                        Year = project.Year ?? project.CreatedAt.Year,
                        StudentNames = project.StudentNames,
                        OriginalityScore = NormalizePercent(overallScore),
                        CreatedAt = DateTime.UtcNow,
                        TeamId = project.TeamId ?? 0,
                        CreatedByUserId = teamLeader?.StudentId ?? 0,
                        DomainId = project.DomainId,
                        ProblemStatement = project.ProblemStatement,
                        ProposedSolution = project.ProposedSolution,
                        Objectives = project.Objectives
                    };

                    await _unitOfWork.Repository<ProjectDraft>().AddAsync(draft);
                    await _unitOfWork.CompleteAsync();

                    var projectTechs = await _unitOfWork.Repository<ProjectTechnology>()
                        .GetAllAsync(pt => pt.ProjectId == project.Id);

                    foreach (var pt in projectTechs)
                    {
                        await _unitOfWork.Repository<ProjectDraftTechnology>().AddAsync(new ProjectDraftTechnology
                        {
                            ProjectDraftId = draft.Id,
                            TechnologyId = pt.TechnologyId
                        });
                    }

                    if (project.TeamId.HasValue)
                    {
                        var teamToUpdate = await _unitOfWork.Repository<Team>().GetByIdAsync(project.TeamId.Value);
                        if (teamToUpdate != null && teamToUpdate.ProfessorId.HasValue)
                        {
                            teamToUpdate.ProfessorId = null;
                            _unitOfWork.Repository<Team>().Update(teamToUpdate);
                        }
                    }

                    _unitOfWork.Repository<Project>().Delete(project);
                }
                else
                {
                    project.Status = status;
                    _unitOfWork.Repository<Project>().Update(project);
                }

                await _unitOfWork.CompleteAsync();
                await _unitOfWork.CommitTransactionAsync();

                try
                {
                    if (status != ProjectStatus.Rejected && project.ProposedSupervisorId.HasValue)
                    {
                        await _notificationService.SendNotificationAsync(
                            project.ProposedSupervisorId.Value,
                            "New Project Submission",
                            $"A new project '{project.Title}' has been submitted for your review. AI Originality Score: {overallScore}%.",
                            NotificationType.Info,
                            project.Id,
                            ReferenceType.Project);
                    }

                    var teamLeader = await _unitOfWork.Repository<TeamMember>()
                        .FindAsync(tm => tm.TeamId == project.TeamId && tm.Role == TeamMemberRole.Leader);

                    if (teamLeader != null)
                    {
                        await _notificationService.SendNotificationAsync(
                            teamLeader.StudentId, notifTitle, notifMessage, notifType, project.Id, ReferenceType.Project);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send notification for project {ProjectId}", project.Id);
                }
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync();
                throw;
            }
        }

        public async Task<OriginalityReportDto> GetOriginalityReportAsync(int projectId, int userId, string role)
        {
            var report = await _unitOfWork.Repository<OriginalityReport>()
                .GetQueryable()
                .Include(r => r.Project!)
                    .ThenInclude(p => p.Team!).ThenInclude(t => t.Supervisor!)
                .Include(r => r.SimilarProjects)
                    .ThenInclude(sp => sp.ReferencedProject)
                .FirstOrDefaultAsync(r => r.ProjectId == projectId);

            if (report == null)
                throw new KeyNotFoundException("AI report not generated yet for this project.");

            if (role == UserRole.Student.ToString())
            {
                var isLeader = await _unitOfWork.Repository<TeamMember>().AnyAsync(tm =>
                    tm.TeamId == report.Project!.TeamId &&
                    tm.StudentId == userId &&
                    tm.Role == TeamMemberRole.Leader);

                if (!isLeader)
                    throw new UnauthorizedAccessException("Only the team leader is allowed to view and download the originality report.");
            }
            else if (role == UserRole.Professor.ToString())
            {
                var isSupervisor = report.Project?.Team?.ProfessorId == userId;

                if (!isSupervisor)
                    throw new UnauthorizedAccessException("Only the assigned supervisor can access this project's originality report.");
            }

            decimal displayScore = report.OverallScore <= 1m ? report.OverallScore * 100m : report.OverallScore;

            return new OriginalityReportDto(
                    report.ProjectId,
                    report.Project?.Title ?? "Unknown Project",
                    report.Project?.Team?.Name ?? "Unknown Team",
                    report.Project?.Team?.Supervisor?.FullName ?? "Unknown Supervisor",
                    Math.Round(displayScore, 2),
                    report.Summary ?? "No summary available",
                    report.GeneratedAt,
                    report.SimilarProjects
                        .Select(sp => new SimilarProjectResultDto(
                                sp.ReferencedProjectId,
                                sp.ReferencedProject?.Title ?? $"Project #{sp.ReferencedProjectId}",
                                Math.Round(ToDisplayPercentage(sp.SimilarityPercentage), 2)
                            ))
                        .ToList()
                        .AsReadOnly()
                );
        }

        private static decimal NormalizePercent(decimal score)
        {
            return score > 1m ? score / 100m : score;
        }

        private static decimal ToDisplayPercentage(decimal score)
        {
            return score <= 1m && score > 0m ? score * 100m : score;
        }
    }
}
