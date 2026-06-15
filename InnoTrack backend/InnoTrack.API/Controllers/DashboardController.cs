using InnoTrack.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace InnoTrack.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;

        public DashboardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        private int GetUserId()
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(claimValue) || !int.TryParse(claimValue, out int userId))
                throw new UnauthorizedAccessException("Invalid User Token.");
            return userId;
        }

        /// <summary>
        /// Retrieves global dashboard statistics including total projects,
        /// completed projects, projects in progress, and top technologies.
        /// </summary>
        /// <returns>
        /// Returns aggregated platform-wide dashboard statistics.
        /// </returns>
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var result = await _dashboardService.GetGlobalDashboardStatsAsync();
            return Ok(result);
        }

        /// <summary>
        /// Retrieves the most popular and highly original approved projects.
        /// </summary>
        /// <param name="limit">
        /// The maximum number of projects to return. Default value is 5.
        /// </param>
        /// <returns>
        /// Returns a ranked list of popular projects.
        /// </returns>
        [HttpGet("popular-projects")]
        public async Task<IActionResult> GetPopularProjects([FromQuery] int limit = 5)
        {
            var result = await _dashboardService.GetPopularProjectsAsync(limit);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves the most trending technologies used in projects during the current year.
        /// </summary>
        /// <returns>
        /// Returns a list of trending technologies and their usage frequency.
        /// </returns>
        [HttpGet("trending-technologies")]
        public async Task<IActionResult> GetTrendingTechnologies()
        {
            var result = await _dashboardService.GetTrendingTechnologiesAsync();
            return Ok(result);
        }

        /// <summary>
        /// Retrieves the current originality score widget for the authenticated student's project.
        /// </summary>
        /// <returns>
        /// Returns the project originality score and project title.
        /// </returns>
        [HttpGet("student/current-originality-widget")]
        public async Task<IActionResult> GetCurrentOriginalityWidget()
        {
            var userId = GetUserId();
            var result = await _dashboardService.GetCurrentOriginalityWidget(userId);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves the current project status widget for the authenticated student.
        /// </summary>
        /// <returns>
        /// Returns the current project status and descriptive progress information.
        /// </returns>
        [HttpGet("student/project-status-widget")]
        public async Task<IActionResult> GetProjectStatusWidget()
        {
            var userId = GetUserId();
            var result = await _dashboardService.GetProjectStatusWidget(userId);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves the most original projects based on originality score.
        /// </summary>
        /// <param name="thisYearOnly">
        /// Indicates whether to limit results to the currently active academic year.
        /// </param>
        /// <param name="limit">
        /// The maximum number of projects to return. Default value is 4.
        /// </param>
        /// <returns>
        /// Returns a collection of highly original project cards.
        /// </returns>
        [HttpGet("most-original")]
        public async Task<IActionResult> GetMostOriginalProjects([FromQuery] bool thisYearOnly = true, [FromQuery] int limit = 4)
        {
            var result = await _dashboardService.GetMostOriginalProjectsAsync(thisYearOnly, limit);
            return Ok(result);
        }
    }
}