using AutoMapper;
using InnoTrack.Application.Common;
using InnoTrack.Application.DTOs.Lookups;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Interfaces;

namespace InnoTrack.Application.Services
{
    public class DomainService : IDomainService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public DomainService(IUnitOfWork unitOfWork, IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<DomainDto> CreateDomainAsync(CreateDomainDto request)
        {
            var domain = new Domain.Entities.Domain { Name = request.Name, Description = request.Description };
            await _unitOfWork.Repository<Domain.Entities.Domain>().AddAsync(domain);
            await _unitOfWork.CompleteAsync();
            return _mapper.Map<DomainDto>(domain);
        }

        public async Task<PagedResult<DomainDto>> GetAllDomainsAsync(int pageNumber, int pageSize)
        {
            var (data, totalCount) = await _unitOfWork.Repository<Domain.Entities.Domain>().GetPagedAsync(
                pageNumber: pageNumber,
                pageSize: pageSize);

            var mappedData = _mapper.Map<IReadOnlyList<DomainDto>>(data);
            return new PagedResult<DomainDto>(mappedData, totalCount, pageNumber, pageSize);
        }

        public async Task<DomainDto> GetDomainByIdAsync(int id)
        {
            var domain = await _unitOfWork.Repository<Domain.Entities.Domain>().GetByIdAsync(id);
            if (domain == null) throw new KeyNotFoundException("Domain not found.");
            return _mapper.Map<DomainDto>(domain);
        }

        public async Task UpdateDomainAsync(int id, CreateDomainDto request)
        {
            var domain = await _unitOfWork.Repository<Domain.Entities.Domain>().GetByIdAsync(id);
            if (domain == null) throw new KeyNotFoundException("Domain not found.");

            domain.Name = request.Name;
            domain.Description = request.Description;

            _unitOfWork.Repository<Domain.Entities.Domain>().Update(domain);
            await _unitOfWork.CompleteAsync();
        }

        public async Task DeleteDomainAsync(int id)
        {
            var domain = await _unitOfWork.Repository<Domain.Entities.Domain>().GetByIdAsync(id);
            if (domain == null) throw new KeyNotFoundException("Domain not found.");

            _unitOfWork.Repository<Domain.Entities.Domain>().Delete(domain);
            await _unitOfWork.CompleteAsync();
        }
    }
}
