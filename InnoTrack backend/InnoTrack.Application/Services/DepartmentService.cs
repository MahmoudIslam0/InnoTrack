using AutoMapper;
using InnoTrack.Application.Common;
using InnoTrack.Application.DTOs.Lookups;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Interfaces;

namespace InnoTrack.Application.Services
{
    public class DepartmentService : IDepartmentService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        public DepartmentService(IUnitOfWork unitOfWork, IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }
        public async Task<DepartmentDto> CreateDepartmentAsync(CreateDepartmentDto request)
        {
            var department = new Department { Name = request.Name, Code = request.Code };
            await _unitOfWork.Repository<Department>().AddAsync(department);
            await _unitOfWork.CompleteAsync();
            return _mapper.Map<DepartmentDto>(department);
        }

        public async Task<PagedResult<DepartmentDto>> GetAllDepartmentsAsync(int pageNumber, int pageSize)
        {
            var (data, totalCount) = await _unitOfWork.Repository<Department>().GetPagedAsync(
                pageNumber: pageNumber,
                pageSize: pageSize);

            var mappedData = _mapper.Map<IReadOnlyList<DepartmentDto>>(data);
            return new PagedResult<DepartmentDto>(mappedData, totalCount, pageNumber, pageSize);
        }

        public async Task<DepartmentDto> GetDepartmentByIdAsync(int id)
        {
            var department = await _unitOfWork.Repository<Department>().GetByIdAsync(id);
            if (department == null) throw new KeyNotFoundException("Department not found.");
            return _mapper.Map<DepartmentDto>(department);
        }

        public async Task UpdateDepartmentAsync(int id, CreateDepartmentDto request)
        {
            var department = await _unitOfWork.Repository<Department>().GetByIdAsync(id);
            if (department == null) throw new KeyNotFoundException("Department not found.");

            department.Name = request.Name;
            department.Code = request.Code;

            _unitOfWork.Repository<Department>().Update(department);
            await _unitOfWork.CompleteAsync();
        }

        public async Task DeleteDepartmentAsync(int id)
        {
            var department = await _unitOfWork.Repository<Department>().GetByIdAsync(id);
            if (department == null) throw new KeyNotFoundException("Department not found.");

            _unitOfWork.Repository<Department>().Delete(department);
            await _unitOfWork.CompleteAsync();
        }
    }
}
