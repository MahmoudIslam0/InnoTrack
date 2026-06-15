// InnoTrack.Application/DTOs/Professors/ProfessorProjectDetailDto.cs
namespace InnoTrack.Application.DTOs.Professors
{
    /// <summary>
    /// Rich single-project view for informed review decisions.
    /// Includes full proposal text, team composition, and feedback history.
    /// </summary>
    public record ProfessorProjectDetailDto(
        int Id,
        string Title,
        string Abstract,
        string Description,
        string? ProblemStatement,
        string? ProposedSolution,
        string? Objectives,
        string Status,
        int ProgressPercent,
        decimal? OriginalityScore,
        string TeamName,
        string DomainName,
        string AcademicYear,
        IReadOnlyList<ProjectTeamMemberDto> Members,
        IReadOnlyList<string> Technologies,
        DateTime CreatedAt,
        DateTime? SubmittedAt,
        IReadOnlyList<ProjectFeedbackItemDto> FeedbackHistory,
        bool HasOriginalityReport,
        string? ProposalDepartment = null,
        string? ProposalMessage = null
    );

    public record ProjectTeamMemberDto(
        int Id,
        string FullName,
        string Email,
        string Role,
        decimal? GPA,
        IReadOnlyList<string> Skills
    );

    public record ProjectFeedbackItemDto(
        int Id,
        string Content,
        DateTime CreatedAt,
        bool IsRead
    );
}