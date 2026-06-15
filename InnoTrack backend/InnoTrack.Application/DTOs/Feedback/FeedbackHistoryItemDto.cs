namespace InnoTrack.Application.DTOs.Feedback
{
    public record FeedbackHistoryItemDto(
        int Id,
        int ProjectId,
        string ProjectTitle,
        string Content,
        DateTime CreatedAt,
        bool IsRead
    );
}