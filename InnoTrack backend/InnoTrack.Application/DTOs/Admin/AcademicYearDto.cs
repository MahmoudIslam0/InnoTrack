namespace InnoTrack.Application.DTOs.Admin
{
    public record AcademicYearDto(
        int Id,
        string Name,
        DateTime StartDate,
        DateTime EndDate,
        bool IsActive,
        int ProjectCount
    );
}