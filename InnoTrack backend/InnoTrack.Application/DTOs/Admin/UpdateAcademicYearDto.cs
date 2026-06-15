namespace InnoTrack.Application.DTOs.Admin
{
    public record UpdateAcademicYearDto(
        string? Name,
        DateTime? StartDate,
        DateTime? EndDate
    );
}