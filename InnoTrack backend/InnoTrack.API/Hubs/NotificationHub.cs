using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace InnoTrack.API.Hubs
{
    [Authorize]
    public class NotificationHub : Hub
    {
        private readonly ILogger<NotificationHub> _logger;

        public NotificationHub(ILogger<NotificationHub> logger)
        {
            _logger = logger;
        }
        public override async Task OnConnectedAsync()
        {
            var userId = Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!;
            await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userId}");

            await base.OnConnectedAsync();
        }


        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (exception is not null)
                _logger.LogWarning(exception, "ChatHub connection {ConnectionId} disconnected with error.", Context.ConnectionId);

            await base.OnDisconnectedAsync(exception);
        }
    }
}