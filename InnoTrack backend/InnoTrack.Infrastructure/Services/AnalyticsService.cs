using InnoTrack.Application.DTOs.Analytics;
using InnoTrack.Application.Interfaces;
using InnoTrack.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.Infrastructure.Services
{
    public class AnalyticsService : IAnalyticsService
    {
        private readonly ApplicationDbContext _context;
        public AnalyticsService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<SystemAnalyticsDto> GetSystemAnalyticsAsync()
        {
            var stats = await _context.Projects
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    TotalProjects = g.Count(),
                    AverageOriginalityScore = g.Where(p => p.OriginalityScore.HasValue)
                                               .Average(p => (decimal?)p.OriginalityScore) ?? 0m
                })
                .FirstOrDefaultAsync();

            var totalUsers = await _context.Users.CountAsync(u => !u.IsDeleted);
            var totalTeams = await _context.Teams.CountAsync();

            return new SystemAnalyticsDto(totalUsers, totalTeams, stats?.TotalProjects ?? 0, stats?.AverageOriginalityScore ?? 0m);
        }
    }
}
