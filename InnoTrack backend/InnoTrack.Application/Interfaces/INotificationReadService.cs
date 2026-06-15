using InnoTrack.Application.DTOs.Notifications;

namespace InnoTrack.Application.Interfaces
{
    public interface INotificationReadService
    {
        Task<IReadOnlyList<NotificationDto>> GetNotificationsAsync(int userId, bool unreadOnly);
        Task MarkAsReadAsync(int notificationId, int userId);
        Task MarkAllAsReadAsync(int userId);
        Task ClearAllNotificationsAsync(int userId);
    }
}