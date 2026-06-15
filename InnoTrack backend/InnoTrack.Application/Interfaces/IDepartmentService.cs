using InnoTrack.Application.Common;
using InnoTrack.Application.DTOs.Lookups;

namespace InnoTrack.Application.Interfaces
{
    public interface IDepartmentService
    {
        Task<PagedResult<DepartmentDto>> GetAllDepartmentsAsync(int pageNumber, int pageSize);
        Task<DepartmentDto> GetDepartmentByIdAsync(int id);
        Task<DepartmentDto> CreateDepartmentAsync(CreateDepartmentDto request);
        Task UpdateDepartmentAsync(int id, CreateDepartmentDto request);
        Task DeleteDepartmentAsync(int id);
    }
}
