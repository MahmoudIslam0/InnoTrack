namespace InnoTrack.Application.DTOs.Professors
{
    public record CreateProfessorDto(
        string FirstName,
        string LastName,
        string Email,
        string Password,
        int DepartmentId,
        int MaxTeamLoad = 5
    );
}