using InnoTrack.API.Attributes;
using InnoTrack.Application.DTOs.Students;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace InnoTrack.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class StudentsController : ControllerBase
    {
        private readonly IStudentService _studentService;

        public StudentsController(IStudentService studentService)
        {
            _studentService = studentService;
        }

        private int GetUserId()
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(claimValue) || !int.TryParse(claimValue, out int userId))
                throw new UnauthorizedAccessException("Invalid User Token.");
            return userId;
        }

        /// <summary>
        /// Retrieves the authenticated student's full profile information.
        /// </summary>
        /// <returns>
        /// Returns the student's profile details, department information,
        /// team status, GPA, graduation year, and skills.
        /// </returns>
        [HttpGet("me")]
        [AuthorizeRoles(UserRole.Student)]
        public async Task<IActionResult> GetMyProfile()
        {
            var userId = GetUserId();
            var result = await _studentService.GetStudentProfileAsync(userId);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves another student's profile information accessible to authenticated students.
        /// </summary>
        /// <param name="studentId">
        /// The identifier of the student.
        /// </param>
        /// <returns>
        /// Returns the student's public profile including academic and skill information.
        /// </returns>
        [HttpGet("{studentId:int}")]
        [AuthorizeRoles(UserRole.Student)]
        public async Task<IActionResult> GetStudentProfile(int studentId)
        {
            var result = await _studentService.GetPublicStudentProfileAsync(studentId);
            return Ok(result);
        }

        /// <summary>
        /// Partially updates the authenticated student's profile information and skills.
        /// </summary>
        /// <param name="request">
        /// The profile update request containing editable student fields.
        /// </param>
        /// <returns>
        /// Returns no content after the profile is successfully updated.
        /// </returns>
        [AuthorizeRoles(UserRole.Student)]
        [HttpPatch("me/profile")]
        public async Task<IActionResult> PatchProfile([FromBody] PatchStudentProfileDto request)
        {
            var userId = GetUserId();
            await _studentService.PatchStudentProfileAsync(userId, request);
            return NoContent();
        }
    }
}