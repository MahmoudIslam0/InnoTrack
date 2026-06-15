namespace InnoTrack.Application.DTOs.Chat
{
    public record ChatMessageDto(
        int Id,
        string senderName,
        string content,
        string messageType,
        string? fileUrl,
        DateTime sentAt
    );
}
