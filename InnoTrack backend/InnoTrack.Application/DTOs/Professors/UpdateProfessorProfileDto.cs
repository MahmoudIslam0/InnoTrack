namespace InnoTrack.Application.DTOs.Professors
{
    /// <summary>
    /// Professors may only self-update their supervision capacity.
    /// Name and department changes require an admin via PUT /api/admin/professors/{id}.
    /// </summary>
    public record UpdateProfessorProfileDto(int? MaxTeamLoad, string? ProfileBannerColor);
}