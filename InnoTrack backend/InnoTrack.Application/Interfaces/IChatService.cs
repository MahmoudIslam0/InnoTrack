using InnoTrack.Application.DTOs.Chat;

namespace InnoTrack.Application.Interfaces
{
    public interface IChatService
    {
        Task<TeamChatDto> GetTeamChatAsync(int userId);
        Task<ChatMessageResponseDto> SendMessageAsync(int userId, string content);
        Task<ChatMessageResponseDto> UploadTeamChatFileAsync(Stream fileStream, string fileName, string contentType, long fileSize, int teamId, int senderId);
        Task<(string FilePath, string ContentType, string DownloadName)> GetChatFileAsync(string fileName, int userId);
        Task<ChatMessageResponseDto> ReplyToMessageAsync(int userId, int parentMessageId, string content);
        Task EditMessageAsync(int userId, int messageId, string newContent);
        Task DeleteMessageAsync(int userId, int messageId, bool deleteForAll);
        Task TogglePinMessageAsync(int userId, int messageId);
        Task ReactToMessageAsync(int userId, int messageId, string emoji);
        Task<TeamChatDto> GetTeamChatForProfessorAsync(int professorId, int teamId);
        Task<ChatMessageResponseDto> SendProfessorMessageAsync(int professorId, int teamId, string content);
    }
}