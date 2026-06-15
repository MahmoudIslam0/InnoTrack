using InnoTrack.Application.DTOs.Feedback;

namespace InnoTrack.Application.Interfaces
{
    public interface IFeedbackService
    {
        Task AddFeedbackAsync(int professorId, int projectId, string content);
        Task MarkFeedbackAsReadAsync(int feedbackId, int userId);
        Task<IReadOnlyList<FeedbackHistoryItemDto>> GetFeedbackHistoryAsync(int professorId);
    }
}
