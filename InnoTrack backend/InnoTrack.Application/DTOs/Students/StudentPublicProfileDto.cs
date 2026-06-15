namespace InnoTrack.Application.DTOs.Students
{
    public record StudentPublicProfileDto(
        int Id,
        string FullName,
        string FirstName,
        string LastName,
        string Email,
        string DepartmentName,
        decimal? GPA,
        int GraduationYear,
        bool HasTeam,
        IReadOnlyList<string> Skills,
        string? ProfilePictureUrl,
        string? ProfileBannerColor
    );
}