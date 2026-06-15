using InnoTrack.Application.DTOs.Feedback;

namespace InnoTrack.Application.Interfaces
{
    public interface IFeedbackReadService
    {
        Task<IReadOnlyList<FeedbackHistoryItemDto>> GetMyFeedbackAsync(int userId);
    }
}