using InnoTrack.Application.DTOs.Dashboard;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities.Enums;
using InnoTrack.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.Infrastructure.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly ApplicationDbContext _context;

        public DashboardService(ApplicationDbContext context) => _context = context;

        public async Task<GlobalDashboardStatsDto> GetGlobalDashboardStatsAsync()
        {
            var activeYear = await _context.AcademicYears.FirstOrDefaultAsync(y => y.IsActive);
            int activeYearId = activeYear?.Id ?? 0;

            var totalProjects = await _context.Projects.CountAsync();

            var completedThisYear = await _context.Projects.CountAsync(
                    p => p.Status == ProjectStatus.Approved && p.AcademicYearId == activeYearId);

            var inProgress = await _context.Projects.CountAsync(p =>
                p.Status == ProjectStatus.Draft
                || p.Status == ProjectStatus.UnderReview);

            var topTechnologies = await _context.ProjectTechnologies
                    .GroupBy(pt => pt.Technology.Name)
                    .Select(g => new { Name = g.Key, Count = g.Count() })
                    .OrderByDescending(t => t.Count)
                    .Take(5)
                    .ToListAsync();

            var topTechnologiesDto = topTechnologies
                    .Select(t => new TechStatDto(t.Name, t.Count))
                    .ToList();

            return new GlobalDashboardStatsDto(
                totalProjects,
                completedThisYear,
                inProgress,
                topTechnologiesDto.AsReadOnly()
            );
        }

        public async Task<IReadOnlyList<PopularProjectDto>> GetPopularProjectsAsync(int limit)
        {
            var projects = await _context.Projects
                .AsNoTracking()
                .Where(p => p.Status == ProjectStatus.Approved && p.OriginalityScore.HasValue)
                .OrderByDescending(p => p.OriginalityScore)
                .Take(limit)
                .Select(p => new PopularProjectDto(
                    p.Id,
                    p.Title,
                    p.Domain.Name,
                    p.OriginalityScore,
                    p.CreatedAt.Year,
                    p.Team.Supervisor != null ? p.Team.Supervisor.FullName : null,
                    p.Team.Members.Select(m => m.Student.FullName).ToList()
                    ))
                .ToListAsync();

            return projects.AsReadOnly();
        }

        public async Task<IReadOnlyList<TrendingTechnologyDto>> GetTrendingTechnologiesAsync()
        {
            var currentYear = DateTime.UtcNow.Year;

            var trending = await _context.ProjectTechnologies
                   .AsNoTracking()
                   .Where(pt => pt.Project.CreatedAt.Year == currentYear)
                   .GroupBy(pt => pt.Technology.Name)
                   .Select(g => new { Name = g.Key, Count = g.Count() })
                   .OrderByDescending(t => t.Count)
                   .Take(12)
                   .ToListAsync();

            var trendingDto = trending
                    .Select(t => new TrendingTechnologyDto(t.Name, t.Count))
                    .ToList();

            return trendingDto.AsReadOnly();
        }

        public async Task<CurrentOriginalityWidgetDto> GetCurrentOriginalityWidget(int userId)
        {
            var project = await _context.TeamMembers
                .AsNoTracking()
                .Where(tm =>
                    tm.StudentId == userId &&
                    tm.Team.Project != null &&
                    (tm.Team.Project.Status == ProjectStatus.In_Progress ||
                     tm.Team.Project.Status == ProjectStatus.Approved ||
                     tm.Team.Project.Status == ProjectStatus.Completed))
                .Select(tm => tm.Team.Project)
                .FirstOrDefaultAsync();

            if (project == null)
            {
                return new CurrentOriginalityWidgetDto(
                    null,
                    "No Active Project"
                );
            }

            return new CurrentOriginalityWidgetDto(
                project.OriginalityScore,
                project.Title
            );
        }

        public async Task<ProjectStatusWidgetDto> GetProjectStatusWidget(int userId)
        {
            var project = await _context.TeamMembers
                .AsNoTracking()
                .Where(tm => tm.StudentId == userId && tm.Team.Project != null)
                .Select(tm => tm.Team.Project)
                .FirstOrDefaultAsync();

            if (project == null)
            {
                return new ProjectStatusWidgetDto(
                    "Not Started",
                    "Join a team or create a draft to begin"
                );
            }
            string statusDescription = project.Status switch
            {
                ProjectStatus.Draft => "Drafting phase",
                ProjectStatus.UnderReview => "Awaiting professor approval",
                ProjectStatus.In_Progress => "Active development phase",
                ProjectStatus.Rejected => "Requires revisions",
                ProjectStatus.Completed => "Project successfully finished",
                _ => "Unknown phase"
            };

            string formattedStatus = project.Status.ToString().Replace("_", " ");

            return new ProjectStatusWidgetDto(
                formattedStatus,
                statusDescription
            );
        }

        public async Task<IReadOnlyList<MostOriginalProjectCardDto>> GetMostOriginalProjectsAsync(bool thisYearOnly, int limit = 4)
        {
            var query = _context.Projects
                .AsNoTracking()
                .Include(p => p.Domain)
                .Where(p => p.OriginalityScore.HasValue && 
                            (p.Status == ProjectStatus.In_Progress || 
                             p.Status == ProjectStatus.Approved || 
                             p.Status == ProjectStatus.Completed));

            if (thisYearOnly)
            {
                var activeYear = await _context.AcademicYears.FirstOrDefaultAsync(y => y.IsActive);
                if (activeYear != null)
                {
                    query = query.Where(p => p.AcademicYearId == activeYear.Id);
                }
            }

            var rawProjects = await query
                .OrderByDescending(p => p.OriginalityScore.Value > 1 ? p.OriginalityScore.Value / 100m : p.OriginalityScore.Value)
                .Take(limit)
                .Select(p => new
                {
                    p.Id,
                    DomainName = p.Domain.Name,
                    OriginalityScore = p.OriginalityScore.Value > 1 ? p.OriginalityScore.Value / 100m : p.OriginalityScore.Value,
                    p.Title,
                    p.Abstract,
                    Year = p.CreatedAt.Year,
                    p.Status
                })
                .ToListAsync();

            var projects = rawProjects
                    .Select(p => new MostOriginalProjectCardDto(
                        p.Id,
                        p.DomainName,
                        p.OriginalityScore,
                        p.Title,
                        p.Abstract,
                        p.Year,
                        MapStatusForCard(p.Status)
                    ))
                    .ToList();

            return projects.AsReadOnly();
        }

        private static string MapStatusForCard(ProjectStatus status) => status switch
        {
            ProjectStatus.Draft => "Draft",
            ProjectStatus.UnderReview => "Under Review",
            ProjectStatus.In_Progress => "In Progress",
            ProjectStatus.Completed => "Completed",
            _ => status.ToString()
        };
    }
}
