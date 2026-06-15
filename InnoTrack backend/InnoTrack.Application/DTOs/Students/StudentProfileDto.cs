namespace InnoTrack.Application.DTOs.Students
{
    public record StudentProfileDto(
        int Id,
        string FirstName,
        string LastName,
        string Email,
        int DepartmentId,
        string DepartmentName,
        decimal? GPA,
        int GraduationYear,
        bool HasTeam,
        IReadOnlyList<string> Skills,
        string? ProfilePictureUrl,
        string? ProfileBannerColor
    );
}