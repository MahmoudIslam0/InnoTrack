namespace InnoTrack.Application.DTOs.Projects
{
    public record ProjectCatalogDetailDto(
        int Id,
        string Title,
        string Domain,
        string Status,
        string AcademicYear,
        string? Supervisor,
        IReadOnlyList<string> Technologies,
        decimal? OriginalityScore,
        DateTime? SubmittedAt,
        DateTime? ApprovedAt,
        DateTime? UpdatedAt,
        string Description,
        string Abstract,
        string? ProblemStatement,
        string? ProposedSolution,
        string? Objectives,
        IReadOnlyList<StudentInProjectDto> Students,
        bool IsMuted = false
    );

    public record StudentInProjectDto(
        string Name,
        string Role,
        string Department,
        string? ProfilePictureUrl = null
    );
}