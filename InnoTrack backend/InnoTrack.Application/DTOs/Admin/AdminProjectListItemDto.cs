namespace InnoTrack.Application.DTOs.Admin
{
    public record AdminProjectListItemDto(
        int Id,
        string Title,
        string Status,
        int? TeamId,
        string? TeamName,
        int? SupervisorId,
        string? SupervisorName,
        string DomainName,
        string AcademicYearName,
        decimal? OriginalityScore,
        bool IsPublicShowcase,
        DateTime CreatedAt,
        DateTime? SubmittedAt,
        DateTime? ApprovedAt
    );
}