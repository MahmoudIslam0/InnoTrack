namespace InnoTrack.Application.DTOs.Chat
{
    public record ChatMessageResponseDto(
        int Id, 
        int TeamId, 
        int SenderId, 
        string AuthorName, 
        string Content, 
        DateTime SentAt,
        bool IsEdited = false,
        bool IsDeletedForAll = false,
        bool IsPinned = false,
        int? ParentMessageId = null,
        List<ChatMessageReactionDto>? Reactions = null,
        ChatMessageAttachmentDto? Attachment = null
    );

    public record ChatMessageReactionDto(
        int UserId,
        string Emoji
    );
}