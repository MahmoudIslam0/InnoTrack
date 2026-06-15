using InnoTrack.API.Hubs;
using InnoTrack.Application.DTOs.Notifications;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Entities.Enums;
using InnoTrack.Domain.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.API.Services
{
    public class NotificationService : INotificationService
    {
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly IUnitOfWork _unitOfWork;

        public NotificationService(IHubContext<NotificationHub> hubContext, IUnitOfWork unitOfWork)
        {
            _hubContext = hubContext;
            _unitOfWork = unitOfWork;
        }
        public async Task SendNotificationAsync(int userId, string title, string message, NotificationType type, int? referenceId = null, ReferenceType? referenceType = null)
        {
            if (referenceType == ReferenceType.Project && referenceId.HasValue)
            {
                var isMuted = await _unitOfWork.Repository<ProjectNotificationPreference>()
                    .AnyAsync(pref => pref.UserId == userId && pref.ProjectId == referenceId.Value && pref.IsMuted);

                if (isMuted)
                {
                    return;
                }
            }

            var notification = new Notification
            {
                UserId = userId,
                Title = title,
                Message = message,
                Type = type,
                CreatedAt = DateTime.UtcNow,
                ReferenceId = referenceId,
                ReferenceType = referenceType ?? ReferenceType.System,
                IsRead = false
            };

            await _unitOfWork.Repository<Notification>().AddAsync(notification);
            await _unitOfWork.CompleteAsync();

            var dto = new NotificationDto(notification.Id, notification.Title, notification.Message,
                    notification.Type.ToString(), notification.IsRead, notification.CreatedAt,
                    notification.ReferenceId, notification.ReferenceType);

            await _hubContext.Clients.Group($"User_{userId}").SendAsync("ReceiveNotification", dto);
        }

        public async Task SendProjectActivityLogAsync(int projectId, string type, string message, string actorName, string iconName, string colorClass, string bgClass)
        {
            var project = await _unitOfWork.Repository<Project>().GetQueryable()
                .Include(p => p.Team)
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project == null) return;

            var userIds = new List<int>();
            int? professorId = null;
            IEnumerable<TeamMember> members = Array.Empty<TeamMember>();

            if (project.Team != null)
            {
                professorId = project.Team.ProfessorId;
                members = await _unitOfWork.Repository<TeamMember>()
                    .GetAllAsync(tm => tm.TeamId == project.TeamId);
            }
            else if (project.TeamId.HasValue)
            {
                var team = await _unitOfWork.Repository<Team>().GetByIdAsync(project.TeamId.Value);
                if (team != null)
                {
                    professorId = team.ProfessorId;
                    members = await _unitOfWork.Repository<TeamMember>()
                        .GetAllAsync(tm => tm.TeamId == team.Id);
                }
            }

            if (professorId.HasValue)
            {
                userIds.Add(professorId.Value);
            }
            foreach (var member in members)
            {
                userIds.Add(member.StudentId);
            }

            var logDto = new
            {
                Id = Guid.NewGuid().ToString(),
                ProjectId = projectId,
                Type = type,
                Message = message,
                Timestamp = DateTime.UtcNow.ToString("o"),
                ActorName = actorName,
                IconName = iconName,
                ColorClass = colorClass,
                BgClass = bgClass
            };

            foreach (var userId in userIds)
            {
                await _hubContext.Clients.Group($"User_{userId}").SendAsync("ReceiveProjectLog", logDto);
            }
        }
    }
}
