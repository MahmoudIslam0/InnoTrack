using InnoTrack.Application.DTOs.Notifications;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Interfaces;

namespace InnoTrack.Application.Services
{
    public class NotificationReadService : INotificationReadService
    {
        private readonly IUnitOfWork _unitOfWork;

        public NotificationReadService(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        public async Task<IReadOnlyList<NotificationDto>> GetNotificationsAsync(int userId, bool unreadOnly)
        {
            var notifications = await _unitOfWork.Repository<Notification>()
                .GetAllAsync(n => n.UserId == userId && (!unreadOnly || !n.IsRead));

            var result = notifications
                .OrderByDescending(n => n.CreatedAt)
                .Select(n => new NotificationDto(
                    n.Id,
                    n.Title,
                    n.Message,
                    n.Type.ToString(),
                    n.IsRead,
                    n.CreatedAt,
                    n.ReferenceId,
                    n.ReferenceType
                ))
                .ToList();

            return result.AsReadOnly();
        }

        public async Task MarkAsReadAsync(int notificationId, int userId)
        {
            var notification = await _unitOfWork.Repository<Notification>().GetByIdAsync(notificationId);
            if (notification == null)
                throw new KeyNotFoundException("Notification not found.");

            if (notification.UserId != userId)
                throw new UnauthorizedAccessException("You can only mark your own notifications as read.");

            notification.IsRead = true;
            _unitOfWork.Repository<Notification>().Update(notification);
            await _unitOfWork.CompleteAsync();
        }

        public async Task MarkAllAsReadAsync(int userId)
        {
            var unread = await _unitOfWork.Repository<Notification>()
                .GetAllAsync(n => n.UserId == userId && !n.IsRead);

            foreach (var notification in unread)
            {
                notification.IsRead = true;
                _unitOfWork.Repository<Notification>().Update(notification);
            }

            if (unread.Any())
                await _unitOfWork.CompleteAsync();
        }

        public async Task ClearAllNotificationsAsync(int userId)
        {
            var userNotifications = await _unitOfWork.Repository<Notification>()
                .GetAllAsync(n => n.UserId == userId);

            foreach (var notification in userNotifications)
            {
                _unitOfWork.Repository<Notification>().Delete(notification);
            }

            if (userNotifications.Any())
                await _unitOfWork.CompleteAsync();
        }
    }
}