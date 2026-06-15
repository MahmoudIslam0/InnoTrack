namespace InnoTrack.Application.DTOs.Admin
{
    public record StudentDetailForAdminDto(
        int Id,
        string FirstName,
        string LastName,
        string Email,
        int DepartmentId,
        string DepartmentName,
        decimal? GPA,
        int GraduationYear,
        bool IsActive,
        bool IsDeleted,
        DateTime CreatedAt,
        bool HasTeam,
        int? TeamId,
        string? TeamName,
        string? TeamRole,
        int? ProjectId,
        string? ProjectTitle,
        string? ProjectStatus,
        IReadOnlyList<string>? Skills
    );
}