namespace InnoTrack.Application.DTOs.Auth
{
    public record RegisterRequestDto
        (string FirstName, string LastName, string Email, string Password, int DepartmentId, decimal GPA, int GraduationYear);
}
