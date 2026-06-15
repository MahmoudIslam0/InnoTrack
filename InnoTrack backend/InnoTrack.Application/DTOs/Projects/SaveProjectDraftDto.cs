namespace InnoTrack.Application.DTOs.Projects
{
    public record SaveProjectDraftDto(
        string Title,
        string StudentNames,
        int Year,
        string Abstract,
        string Description,
        int DomainId,
        List<int> TechnologyIds,
        string? ProblemStatement,
        string? ProposedSolution,
        string? Objectives,
        decimal? OriginalityScore
    );
}