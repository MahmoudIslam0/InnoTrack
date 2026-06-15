using InnoTrack.Application.Common;
using InnoTrack.Application.DTOs.Admin;

namespace InnoTrack.Application.Interfaces
{
    public interface IAcademicYearService
    {
        Task<AcademicYearDto> CreateAsync(CreateAcademicYearDto dto);
        Task DeleteAcademicYearAsync(int adminId, int yearId);
        Task<PagedResult<AcademicYearDto>> GetAllAsync(
            string? search, bool? isActive, int pageNumber, int pageSize);
        Task<AcademicYearDto?> GetActiveAsync();
        Task ActivateAsync(int academicYearId);
        Task UpdateAsync(int academicYearId, UpdateAcademicYearDto dto);
    }
}