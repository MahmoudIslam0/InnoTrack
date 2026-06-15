namespace InnoTrack.Application.DTOs.Projects
{
    public record SubmitProjectRequestDto(int SupervisorId, int DepartmentId, string TeamMembers, string Message);
}
