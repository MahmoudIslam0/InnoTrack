namespace InnoTrack.Application.DTOs.Projects
{
    public record UpdateProjectDetailsDto(
        string? Title,
        string? Abstract,
        string? Description,
        string? ProblemStatement,
        string? ProposedSolution,
        string? Objectives,
        List<int>? TechnologyIds,
        int? DomainId
    );
}