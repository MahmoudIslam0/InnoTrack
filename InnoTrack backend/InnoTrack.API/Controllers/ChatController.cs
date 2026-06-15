using InnoTrack.API.Attributes;
using InnoTrack.API.Hubs;
using InnoTrack.Application.DTOs.Chat;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace InnoTrack.API.Controllers
{
    [Route("api/teams/me/chat")]
    [ApiController]
    [AuthorizeRoles(UserRole.Student, UserRole.Professor)]
    public class ChatController : ControllerBase
    {
        private readonly IChatService _chatService;
        private readonly IHubContext<ChatHub> _hubContext;

        public ChatController(IChatService chatService, IHubContext<ChatHub> hubContext)
        {
            _chatService = chatService;
            _hubContext = hubContext;
        }

        private int GetUserId()
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(claimValue) || !int.TryParse(claimValue, out int userId))
                throw new UnauthorizedAccessException("Invalid User Token.");
            return userId;
        }

        /// <summary>
        /// Retrieves the current user's team chat workspace including members and recent messages.
        /// </summary>
        /// <returns>
        /// Returns the chat room details, team members, and the latest chat messages.
        /// </returns>
        [HttpGet]
        public async Task<IActionResult> GetTeamChat()
        {
            var userId = GetUserId();
            var result = await _chatService.GetTeamChatAsync(userId);
            return Ok(result);
        }

        /// <summary>
        /// Sends a new text message to the team chat.
        /// </summary>
        /// <param name="dto">The message content to send.</param>
        /// <returns>
        /// Returns the created chat message information.
        /// </returns>
        [HttpPost("messages")]
        public async Task<IActionResult> SendMessage([FromBody] SendChatMessageDto dto)
        {
            var userId = GetUserId();
            var result = await _chatService.SendMessageAsync(userId, dto.Content);
            await _hubContext.Clients.Group($"Team_{result.TeamId}").SendAsync("ReceiveMessage", result);
            return CreatedAtAction(nameof(GetTeamChat), result);
        }

        /// <summary>
        /// Uploads a file directly into the team's chat.
        /// </summary>
        /// <param name="teamId">The identifier of the target team.</param>
        /// <param name="file">The file to upload to the chat.</param>
        /// <returns>Returns the chat message object containing the file URL.</returns>
        [HttpPost("teams/{teamId}/chat/upload")]
        [AuthorizeRoles(UserRole.Student, UserRole.Professor)]
        public async Task<IActionResult> UploadChatFile(int teamId, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file was uploaded.");

            var userId = GetUserId();

            using var stream = file.OpenReadStream();

            var chatMessage = await _chatService.UploadTeamChatFileAsync(
                stream,
                file.FileName,
                file.ContentType,
                file.Length,
                teamId,
                userId
            );

            await _hubContext.Clients.Group($"Team_{teamId}").SendAsync("ReceiveMessage", chatMessage);

            return Ok(chatMessage);
        }

        /// <summary>
        /// Downloads a file attached in a team chat.
        /// </summary>
        /// <param name="fileName">The unique generated file name.</param>
        /// <returns>The physical file stream.</returns>
        [HttpGet("files/{fileName}")]
        [Authorize] // السماح للطلبة والدكاترة، والـ Service هتفلترهم
        public async Task<IActionResult> DownloadChatFile(string fileName)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            try
            {
                var (filePath, contentType, downloadName) = await _chatService.GetChatFileAsync(fileName, userId);

                return PhysicalFile(filePath, contentType, downloadName);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
            catch (FileNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}