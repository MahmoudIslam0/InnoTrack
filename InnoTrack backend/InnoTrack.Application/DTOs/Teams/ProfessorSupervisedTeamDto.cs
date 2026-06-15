namespace InnoTrack.Application.DTOs.Teams
{
    /// <summary>
    /// Professor's read-only view of a supervised team.
    /// JoinCode is intentionally excluded — professors have no business need
    /// for the student recruitment code and must never receive it.
    /// </summary>
    public record ProfessorSupervisedTeamDto(
        int Id,
        string Name,
        int MemberCount,
        int? ProjectId,
        string? ProjectTitle,
        string? ProjectStatus,
        decimal? OriginalityScore,
        DateTime? SubmittedAt,
        bool HasPendingReview,
        IReadOnlyList<TeamMemberDetailDto> Members
    );
}
