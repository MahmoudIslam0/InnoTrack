namespace InnoTrack.Application.DTOs.Admin
{
    public record AuditLogDto(
        int Id,
        int UserId,
        string ActorName,
        string Action,
        string Details,
        DateTime Timestamp
    );
}