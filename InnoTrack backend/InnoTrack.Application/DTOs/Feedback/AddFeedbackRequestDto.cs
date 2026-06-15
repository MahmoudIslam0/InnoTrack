namespace InnoTrack.Application.DTOs.Feedback
{
    public record AddFeedbackRequestDto(string Content);
    public record ReviewProjectRequestDto(bool Approve);
}
