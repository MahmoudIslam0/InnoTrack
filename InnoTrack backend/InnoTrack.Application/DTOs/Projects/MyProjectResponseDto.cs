namespace InnoTrack.Application.DTOs.Projects
{
    public record MyProjectResponseDto(
        int? ProjectId,
        string? Title,
        string? Status,
        string? DomainName,
        decimal? OriginalityScore,
        string? JoinCode,
        IReadOnlyList<string>? Technologies,
        IReadOnlyList<TeamMemberSummaryDto>? Members,
        DateTime? CreatedAt,
        DateTime? SubmittedAt,
        string? SupervisorName,
        string? TeamName
    );

    public record TeamMemberSummaryDto(string Name, string Role);
}