using InnoTrack.Application.DTOs.Users;
using InnoTrack.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace InnoTrack.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        /// <summary>
        /// Updates the authenticated user's profile information.
        /// </summary>
        /// <param name="request">
        /// The profile update request containing personal
        /// and academic information.
        /// </param>
        /// <returns>
        /// Returns no content after the profile is successfully updated.
        /// </returns>
        /// <remarks>
        /// Student users may update department and graduation year information.
        /// Professor users may update department assignment information.
        /// </remarks>
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto request)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await _userService.UpdateProfileAsync(userId, request);
            return NoContent();
        }

        /// <summary>
        /// Changes the authenticated user's account password.
        /// </summary>
        /// <param name="request">
        /// The password change request containing the old and new passwords.
        /// </param>
        /// <returns>
        /// Returns no content after the password is successfully changed.
        /// </returns>
        /// <remarks>
        /// The current password must be validated before the new password is applied.
        /// </remarks>
        [HttpPut("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto request)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await _userService.ChangePasswordAsync(userId, request);
            return NoContent();
        }

        /// <summary>
        /// Uploads a profile picture for the authenticated user.
        /// </summary>
        /// <param name="file">The image file to upload.</param>
        /// <returns>Returns the relative path of the uploaded picture.</returns>
        [HttpPost("me/profile-picture")]
        public async Task<IActionResult> UploadProfilePicture(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file was uploaded.");

            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            using var stream = file.OpenReadStream();
            var relativePath = await _userService.UploadProfilePictureAsync(
                userId, stream, file.FileName, file.ContentType, file.Length);

            return Ok(new { ProfilePictureUrl = relativePath });
        }

        /// <summary>
        /// Removes the profile picture for the authenticated user.
        /// </summary>
        /// <returns>Returns no content on successful removal.</returns>
        [HttpDelete("me/profile-picture")]
        public async Task<IActionResult> RemoveProfilePicture()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await _userService.RemoveProfilePictureAsync(userId);
            return NoContent();
        }
    }
}
