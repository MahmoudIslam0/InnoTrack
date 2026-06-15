namespace InnoTrack.Application.DTOs.Chat
{
    public record TeamChatDto(
        int ChatId,
        string? ProjectTitle,
        IReadOnlyList<ChatMemberDto> Members,
        IReadOnlyList<ChatMessageDetailDto> Messages
    );

    public record ChatMemberDto(int Id, string FullName, string Role, string Initials, string? ProfilePictureUrl, DateTime? LastOnlineAt = null);

    public record ChatMessageDetailDto(
        int Id,
        int AuthorId,
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

    public record ChatMessageAttachmentDto(
        string FileName,
        string OriginalName,
        string ContentType,
        long FileSize
    );
}