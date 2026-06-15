namespace InnoTrack.Application.DTOs.Users
{
    public record UpdateProfileDto(string FirstName, string LastName, int DepartmentId, int GraduationYear);
}
