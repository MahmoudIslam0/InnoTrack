using InnoTrack.API.Attributes;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities.Enums;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace InnoTrack.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AuthorizeRoles(UserRole.Student)]
    public class FeedbackController : ControllerBase
    {
        private readonly IFeedbackReadService _feedbackReadService;

        public FeedbackController(IFeedbackReadService feedbackReadService)
        {
            _feedbackReadService = feedbackReadService;
        }

        private int GetUserId()
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(claimValue) || !int.TryParse(claimValue, out int userId))
                throw new UnauthorizedAccessException("Invalid User Token.");
            return userId;
        }

        /// <summary>
        /// Retrieves all feedback entries associated with the authenticated student's project.
        /// </summary>
        /// <returns>
        /// Returns the project's feedback history ordered by newest first.
        /// </returns>
        [HttpGet("me")]
        public async Task<IActionResult> GetMyFeedback()
        {
            var userId = GetUserId();
            var result = await _feedbackReadService.GetMyFeedbackAsync(userId);
            return Ok(result);
        }
    }
}