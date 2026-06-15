using InnoTrack.Application.Common;
using InnoTrack.Application.DTOs.Lookups;

namespace InnoTrack.Application.Interfaces
{
    public interface IDomainService
    {
        Task<PagedResult<DomainDto>> GetAllDomainsAsync(int pageNumber, int pageSize);
        Task<DomainDto> GetDomainByIdAsync(int id);
        Task<DomainDto> CreateDomainAsync(CreateDomainDto request);
        Task UpdateDomainAsync(int id, CreateDomainDto request);
        Task DeleteDomainAsync(int id);
    }
}
