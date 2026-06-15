namespace InnoTrack.Application.DTOs.Projects
{
    public record ProjectDraftDto(
        int Id,
        string Title,
        string? StudentNames,
        int Year,
        string Domain,
        int DomainId,
        decimal? OriginalityScore,
        DateTime CreatedAt,
        DateTime? UpdatedAt,
        bool CanEdit,
        IReadOnlyList<string> Technologies,
        IReadOnlyList<int> TechnologyIds,
        string Abstract,
        string Description,
        string? ProblemStatement,
        string? ProposedSolution,
        string? Objectives
    );
}
