namespace InnoTrack.Application.DTOs.Students
{
    public record PatchStudentProfileDto(decimal? GPA, List<string>? Skills, string? ProfileBannerColor);
}
