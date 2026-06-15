using InnoTrack.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace InnoTrack.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationReadService _notificationReadService;

        public NotificationsController(INotificationReadService notificationReadService)
        {
            _notificationReadService = notificationReadService;
        }

        private int GetUserId()
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(claimValue) || !int.TryParse(claimValue, out int userId))
                throw new UnauthorizedAccessException("Invalid User Token.");
            return userId;
        }

        /// <summary>
        /// Retrieves the authenticated user's notifications,
        /// optionally filtered to unread notifications only.
        /// </summary>
        /// <param name="unreadOnly">
        /// Indicates whether to return only unread notifications.
        /// </param>
        /// <returns>
        /// Returns the user's notifications ordered by newest first.
        /// </returns>
        [HttpGet]
        public async Task<IActionResult> GetNotifications([FromQuery] bool unreadOnly = false)
        {
            var userId = GetUserId();
            var result = await _notificationReadService.GetNotificationsAsync(userId, unreadOnly);
            return Ok(result);
        }

        /// <summary>
        /// Marks a specific notification as read for the authenticated user.
        /// </summary>
        /// <param name="notificationId">
        /// The identifier of the notification to mark as read.
        /// </param>
        /// <returns>
        /// Returns no content after the notification is successfully updated.
        /// </returns>
        [HttpPatch("{notificationId:int}/read")]
        public async Task<IActionResult> MarkAsRead(int notificationId)
        {
            var userId = GetUserId();
            await _notificationReadService.MarkAsReadAsync(notificationId, userId);
            return NoContent();
        }

        /// <summary>
        /// Marks all unread notifications for the authenticated user as read.
        /// </summary>
        /// <returns>
        /// Returns no content after all notifications are updated.
        /// </returns>
        [HttpPatch("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = GetUserId();
            await _notificationReadService.MarkAllAsReadAsync(userId);
            return NoContent();
        }

        /// <summary>
        /// Deletes all notifications for the authenticated user.
        /// </summary>
        /// <returns>
        /// Returns no content after all notifications are cleared.
        /// </returns>
        [HttpDelete("clear-all")]
        public async Task<IActionResult> ClearAllNotifications()
        {
            var userId = GetUserId();
            await _notificationReadService.ClearAllNotificationsAsync(userId);
            return NoContent();
        }
    }
}