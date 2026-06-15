namespace InnoTrack.Application.DTOs.Projects
{
    public record ProjectActivityLogDto(
        int Id,
        string Type,
        string Message,
        string Timestamp,
        string ActorName,
        string? IconName,
        string? ColorClass,
        string? BgClass
    );
}
