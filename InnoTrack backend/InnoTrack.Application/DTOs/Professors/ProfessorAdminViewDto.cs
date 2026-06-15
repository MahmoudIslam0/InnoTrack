namespace InnoTrack.Application.DTOs.Professors
{
    public record ProfessorAdminViewDto(
        int Id,
        string FullName,
        string Email,
        int DepartmentId,
        string DepartmentName,
        int MaxTeamLoad,
        int CurrentTeamLoad,
        bool IsActive,
        DateTime CreatedAt
    )
    {
        public bool IsAvailable => CurrentTeamLoad < MaxTeamLoad;
    }
}