namespace InnoTrack.Application.DTOs.Admin
{
    public record StudentAdminViewDto(
         int Id,
         string FullName,
         string Email,
         string DepartmentName,
         decimal? Gpa,
         int GraduationYear,
         bool IsActive,
         bool HasTeam,
         string? TeamName
     );
}
