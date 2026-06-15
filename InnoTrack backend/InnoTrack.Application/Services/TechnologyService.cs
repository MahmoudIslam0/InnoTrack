using AutoMapper;
using InnoTrack.Application.Common;
using InnoTrack.Application.DTOs.Lookups;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Interfaces;

namespace InnoTrack.Application.Services
{
    public class TechnologyService : ITechnologyService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public TechnologyService(IUnitOfWork unitOfWork, IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<TechnologyDto> CreateTechnologyAsync(CreateTechnologyDto request)
        {
            var name = request.Name.Trim();
            if (string.IsNullOrWhiteSpace(name))
            {
                throw new ArgumentException("Technology name is required.");
            }

            var existing = await _unitOfWork.Repository<Technology>()
                .FindAsync(technology => technology.Name.ToLower() == name.ToLower());

            if (existing != null)
            {
                return _mapper.Map<TechnologyDto>(existing);
            }

            var technology = new Technology { Name = name };
            await _unitOfWork.Repository<Technology>().AddAsync(technology);
            await _unitOfWork.CompleteAsync();
            return _mapper.Map<TechnologyDto>(technology);
        }

        public async Task<PagedResult<TechnologyDto>> GetAllTechnologiesAsync(int pageNumber, int pageSize)
        {
            var (data, totalCount) = await _unitOfWork.Repository<Technology>().GetPagedAsync(
                pageNumber: pageNumber,
                pageSize: pageSize);

            var mappedData = _mapper.Map<IReadOnlyList<TechnologyDto>>(data);
            return new PagedResult<TechnologyDto>(mappedData, totalCount, pageNumber, pageSize);
        }

        public async Task<TechnologyDto> GetTechnologyByIdAsync(int id)
        {
            var technology = await _unitOfWork.Repository<Technology>().GetByIdAsync(id);
            if (technology == null) throw new KeyNotFoundException("Technology not found.");
            return _mapper.Map<TechnologyDto>(technology);
        }
        public async Task UpdateTechnologyAsync(int id, CreateTechnologyDto request)
        {
            var technology = await _unitOfWork.Repository<Technology>().GetByIdAsync(id);
            if (technology == null) throw new KeyNotFoundException("Technology not found.");


            technology.Name = request.Name;

            _unitOfWork.Repository<Technology>().Update(technology);
            await _unitOfWork.CompleteAsync();
        }

        public async Task DeleteTechnologyAsync(int id)
        {
            var technology = await _unitOfWork.Repository<Technology>().GetByIdAsync(id);
            if (technology == null) throw new KeyNotFoundException("Technology not found.");
            _unitOfWork.Repository<Technology>().Delete(technology);
            await _unitOfWork.CompleteAsync();
        }
    }
}
