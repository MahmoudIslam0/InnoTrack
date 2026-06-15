namespace InnoTrack.Application.DTOs.Professors
{
    public record ProfessorProfileDto(
        int Id,
        string FirstName,
        string LastName,
        string Email,
        int DepartmentId,
        string DepartmentName,
        int MaxTeamLoad,
        int CurrentTeamLoad,
        bool IsActive,
        string? ProfilePictureUrl,
        string? ProfileBannerColor
    )
    {
        public bool IsAvailable => CurrentTeamLoad < MaxTeamLoad;
    }
}