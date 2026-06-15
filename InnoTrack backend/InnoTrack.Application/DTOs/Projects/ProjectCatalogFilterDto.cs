namespace InnoTrack.Application.DTOs.Projects
{
    public record ProjectCatalogFilterDto(
        int? Year,
        string? Status,
        string? Search,
        int? DomainId,
        int? SupervisorId,
        int? TechnologyId,
        decimal? MinOriginalityScore,
        decimal? MaxOriginalityScore,
        bool? IsCurrentAcademicYear
    );
}