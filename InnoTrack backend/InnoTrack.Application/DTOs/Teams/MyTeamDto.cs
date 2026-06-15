namespace InnoTrack.Application.DTOs.Teams
{
    public record MyTeamDto(
        int Id,
        string Name,
        int? ProjectId,
        string? ProjectTitle,
        string JoinCode,
        bool IsLeader,
        IReadOnlyList<TeamMemberDetailDto> Members,
        string? SupervisorName,
        IReadOnlyList<string> ProjectTechnologies
    );

    public record TeamMemberDetailDto(
        int Id,
        string FullName,
        string Role,
        string Email,
        string? ProfilePictureUrl,
        IReadOnlyList<string> Skills
    );
}