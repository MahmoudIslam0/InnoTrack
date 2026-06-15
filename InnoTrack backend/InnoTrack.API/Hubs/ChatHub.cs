using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Entities.Enums;
using InnoTrack.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace InnoTrack.API.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly IServiceScopeFactory _scopeFactory;

        public ChatHub(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
        }

        private static readonly System.Collections.Concurrent.ConcurrentDictionary<int, int> _onlineUsers = new();

        public override async Task OnConnectedAsync()
        {
            var claimValue = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrEmpty(claimValue) && int.TryParse(claimValue, out int userId))
            {
                var newCount = _onlineUsers.AddOrUpdate(userId, 1, (key, oldValue) => oldValue + 1);
                if (newCount == 1)
                {
                    await Clients.All.SendAsync("UserOnline", userId);
                }
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var claimValue = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrEmpty(claimValue) && int.TryParse(claimValue, out int userId))
            {
                if (_onlineUsers.TryGetValue(userId, out int count))
                {
                    if (count <= 1)
                    {
                        _onlineUsers.TryRemove(userId, out _);
                        
                        using var scope = _scopeFactory.CreateScope();
                        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
                        var user = await unitOfWork.Repository<User>().GetByIdAsync(userId);
                        if (user != null)
                        {
                            user.LastOnlineAt = DateTime.UtcNow;
                            unitOfWork.Repository<User>().Update(user);
                            await unitOfWork.CompleteAsync();
                        }

                        await Clients.All.SendAsync("UserOffline", userId);
                    }
                    else
                    {
                        _onlineUsers.TryUpdate(userId, count - 1, count);
                    }
                }
            }
            await base.OnDisconnectedAsync(exception);
        }

        public async Task<IEnumerable<int>> JoinTeamChat(int teamId)
        {
            var claimValue = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(claimValue) || !int.TryParse(claimValue, out int userId))
            {
                throw new HubException("Unauthorized: Invalid user identity.");
            }

            using var scope = _scopeFactory.CreateScope();
            var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
            var isMember = await unitOfWork.Repository<TeamMember>()
                .FindAsync(tm => tm.TeamId == teamId && tm.StudentId == userId);

            if (isMember == null)
            {
                var team = await unitOfWork.Repository<Team>().GetByIdAsync(teamId);
                if (team == null || team.ProfessorId != userId)
                {
                    throw new HubException("Access Denied: You are not a member of this team.");
                }
            }
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Team_{teamId}");
            return _onlineUsers.Keys;
        }

        public async Task SendMessage(int teamId, string messageContent)
        {
            var userId = GetUserId();
            using var scope = _scopeFactory.CreateScope();
            var chatService = scope.ServiceProvider.GetRequiredService<InnoTrack.Application.Interfaces.IChatService>();

            var result = await chatService.SendMessageAsync(userId, messageContent);

            await Clients.Group($"Team_{teamId}").SendAsync("ReceiveMessage", result);
        }

        public async Task EditMessage(int teamId, int messageId, string newContent)
        {
            var userId = GetUserId();
            using var scope = _scopeFactory.CreateScope();
            var chatService = scope.ServiceProvider.GetRequiredService<InnoTrack.Application.Interfaces.IChatService>();
            
            await chatService.EditMessageAsync(userId, messageId, newContent);
            await Clients.Group($"Team_{teamId}").SendAsync("MessageEdited", messageId, newContent);
        }

        public async Task DeleteMessage(int teamId, int messageId, bool deleteForAll)
        {
            var userId = GetUserId();
            using var scope = _scopeFactory.CreateScope();
            var chatService = scope.ServiceProvider.GetRequiredService<InnoTrack.Application.Interfaces.IChatService>();
            
            await chatService.DeleteMessageAsync(userId, messageId, deleteForAll);
            if (deleteForAll)
            {
                await Clients.Group($"Team_{teamId}").SendAsync("MessageDeleted", messageId);
            }
        }

        public async Task TogglePin(int teamId, int messageId)
        {
            var userId = GetUserId();
            using var scope = _scopeFactory.CreateScope();
            var chatService = scope.ServiceProvider.GetRequiredService<InnoTrack.Application.Interfaces.IChatService>();
            
            await chatService.TogglePinMessageAsync(userId, messageId);
            await Clients.Group($"Team_{teamId}").SendAsync("MessagePinned", messageId);
        }

        public async Task ReactToMessage(int teamId, int messageId, string emoji)
        {
            var userId = GetUserId();
            using var scope = _scopeFactory.CreateScope();
            var chatService = scope.ServiceProvider.GetRequiredService<InnoTrack.Application.Interfaces.IChatService>();
            
            await chatService.ReactToMessageAsync(userId, messageId, emoji);
            await Clients.Group($"Team_{teamId}").SendAsync("ReactionAdded", messageId, userId, emoji);
        }

        public async Task ReplyToMessage(int teamId, int parentMessageId, string content)
        {
            var userId = GetUserId();
            using var scope = _scopeFactory.CreateScope();
            var chatService = scope.ServiceProvider.GetRequiredService<InnoTrack.Application.Interfaces.IChatService>();

            var result = await chatService.ReplyToMessageAsync(userId, parentMessageId, content);
            await Clients.Group($"Team_{teamId}").SendAsync("ReceiveMessage", result);
        }

        private int GetUserId()
        {
            var claimValue = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(claimValue) || !int.TryParse(claimValue, out int userId))
            {
                throw new HubException("Unauthorized: Invalid user identity.");
            }
            return userId;
        }
    }
}
