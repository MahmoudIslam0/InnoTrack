using InnoTrack.Application.DTOs.Admin;
using InnoTrack.Application.DTOs.Students;

namespace InnoTrack.Application.Interfaces
{
    public interface IStudentService
    {
        Task<StudentProfileDto> GetStudentProfileAsync(int userId);
        Task<StudentPublicProfileDto> GetPublicStudentProfileAsync(int studentId);
        Task PatchStudentProfileAsync(int studentId, PatchStudentProfileDto dto);
        Task<IReadOnlyList<StudentAdminViewDto>> GetAllStudentsForAdminAsync();
    }
}