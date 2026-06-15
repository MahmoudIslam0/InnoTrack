using InnoTrack.Application.Common;
using InnoTrack.Application.DTOs.Professors;

namespace InnoTrack.Application.Interfaces
{
    public interface IProfessorAdminService
    {
        Task<ProfessorAdminViewDto> CreateProfessorAsync(CreateProfessorDto dto);
        Task DeleteProfessorByAdminAsync(int adminId, int professorId);
        Task<PagedResult<ProfessorAdminViewDto>> GetAllProfessorsAsync(
            string? search, int? departmentId, bool? isActive, bool? hasCapacity,int pageNumber, int pageSize);
        Task<ProfessorAdminViewDto> GetProfessorByIdAsync(int professorId);
        Task UpdateProfessorAsync(int professorId, UpdateProfessorAdminDto dto);
        Task SetProfessorActiveStatusAsync(int professorId, bool isActive);
        Task ResetProfessorPasswordAsync(int professorId, string newPassword);
    }
}