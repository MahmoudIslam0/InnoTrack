using InnoTrack.Application.Common;
using InnoTrack.Application.DTOs.Lookups;

namespace InnoTrack.Application.Interfaces
{
    public interface ITechnologyService
    {
        Task<PagedResult<TechnologyDto>> GetAllTechnologiesAsync(int pageNumber, int pageSize);
        Task<TechnologyDto> GetTechnologyByIdAsync(int id);
        Task<TechnologyDto> CreateTechnologyAsync(CreateTechnologyDto request);
        Task UpdateTechnologyAsync(int id, CreateTechnologyDto request);
        Task DeleteTechnologyAsync(int id);
    }
}
