namespace InnoTrack.Application.DTOs.Admin
{
    public record AdminTeamListItemDto(
        int Id,
        string Name,
        int MemberCount,
        int? ProjectId,
        string? ProjectTitle,
        string? ProjectStatus,
        decimal? OriginalityScore,
        int? SupervisorId,
        string? SupervisorName,
        bool SupervisorIsActive,
        DateTime CreatedAt
    );
}