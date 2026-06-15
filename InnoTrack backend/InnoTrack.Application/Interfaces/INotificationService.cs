using InnoTrack.Domain.Entities.Enums;

namespace InnoTrack.Application.Interfaces
{
    public interface INotificationService
    {
        Task SendNotificationAsync(int userId, string title, string message, NotificationType type, int? referenceId = null, ReferenceType? referenceType = null);
        Task SendProjectActivityLogAsync(int projectId, string type, string message, string actorName, string iconName, string colorClass, string bgClass);
    }
}
