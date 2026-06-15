// InnoTrack.Application/DTOs/Admin/AdminProjectDetailDto.cs
namespace InnoTrack.Application.DTOs.Admin
{
    public record AdminProjectDetailDto(
        int Id,
        string Title,
        string Abstract,
        string Description,
        string? ProblemStatement,
        string? ProposedSolution,
        string? Objectives,
        string Status,
        decimal? OriginalityScore,
        bool IsPublicShowcase,
        int? TeamId,
        string? TeamName,
        int? SupervisorId,
        string? SupervisorName,
        string DomainName,
        string AcademicYearName,
        IReadOnlyList<string> Technologies,
        IReadOnlyList<AdminProjectMemberDto> Members,
        DateTime CreatedAt,
        DateTime? SubmittedAt,
        DateTime? ApprovedAt,
        DateTime? UpdatedAt
    );

    public record AdminProjectMemberDto(
        int Id,
        string FullName,
        string Email,
        string Role
    );
}