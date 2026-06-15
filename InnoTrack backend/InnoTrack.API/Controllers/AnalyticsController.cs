using InnoTrack.API.Attributes;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities.Enums;
using Microsoft.AspNetCore.Mvc;

namespace InnoTrack.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AuthorizeRoles(UserRole.Admin)]
    public class AnalyticsController : ControllerBase
    {
        private readonly IAnalyticsService _analyticsService;

        public AnalyticsController(IAnalyticsService analyticsService) => _analyticsService = analyticsService;

        /// <summary>
        /// Retrieves system-wide analytics data for the admin dashboard.
        /// </summary>
        /// <returns>
        /// A SystemAnalyticsDto containing:
        /// - Total number of active users (non-deleted)
        /// - Total number of teams
        /// - Total number of projects
        /// - Average originality score across all projects
        /// </returns>
        /// <response code="200">Analytics data retrieved successfully.</response>
        /// <response code="401">User is not authenticated.</response>
        /// <response code="403">User does not have admin privileges.</response>
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboardStats()
        {

            return Ok(await _analyticsService.GetSystemAnalyticsAsync());
        }
    }
}
