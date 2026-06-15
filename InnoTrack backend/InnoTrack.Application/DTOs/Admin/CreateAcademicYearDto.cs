namespace InnoTrack.Application.DTOs.Admin
{
    public record CreateAcademicYearDto(
        string Name,
        DateTime StartDate,
        DateTime EndDate
    );
}