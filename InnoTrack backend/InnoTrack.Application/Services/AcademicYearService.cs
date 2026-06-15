// InnoTrack.Application/Services/AcademicYearService.cs
using InnoTrack.Application.Common;
using InnoTrack.Application.DTOs.Admin;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.Application.Services
{
    public class AcademicYearService : IAcademicYearService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IAuditService _auditService;

        public AcademicYearService(IUnitOfWork unitOfWork, IAuditService auditService)
        {
            _unitOfWork = unitOfWork;
            _auditService = auditService;
        }

        public async Task<AcademicYearDto> CreateAsync(CreateAcademicYearDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name) || dto.Name.Length > 20)
                throw new ArgumentException("Academic year name must be between 1 and 20 characters.");

            if (dto.EndDate <= dto.StartDate)
                throw new ArgumentException("End date must be after start date.");

            var duplicate = await _unitOfWork.Repository<AcademicYear>()
                .FindAsync(y => y.Name == dto.Name.Trim());
            if (duplicate is not null)
                throw new InvalidOperationException(
                    $"An academic year named '{dto.Name}' already exists.");

            var academicYear = new AcademicYear
            {
                Name = dto.Name.Trim(),
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                IsActive = false  // always inactive on creation; use Activate to promote
            };

            await _unitOfWork.Repository<AcademicYear>().AddAsync(academicYear);
            await _unitOfWork.CompleteAsync();

            return MapToDto(academicYear, projectCount: 0);
        }

        public async Task DeleteAcademicYearAsync(int adminId, int yearId)
        {
            var year = await _unitOfWork.Repository<AcademicYear>().GetByIdAsync(yearId)
                ?? throw new KeyNotFoundException("Academic Year not found.");

            if (year.IsActive)
                throw new InvalidOperationException("Cannot delete the current active academic year.");

            var hasProjects = await _unitOfWork.Repository<Project>().AnyAsync(p => p.AcademicYearId == yearId);
            if (hasProjects)
                throw new InvalidOperationException("Cannot delete this academic year because it contains registered project records.");

            _unitOfWork.Repository<AcademicYear>().Delete(year);
            await _unitOfWork.CompleteAsync();

            _auditService.LogAction(adminId, "Delete Academic Year", $"Deleted academic year configuration: {year.Name}");
        }

        public async Task<PagedResult<AcademicYearDto>> GetAllAsync(
            string? search, bool? isActive, int pageNumber, int pageSize)
        {
            var query = _unitOfWork.Repository<AcademicYear>()
                .GetQueryable()
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(y => y.Name.ToLower().Contains(term));
            }

            if (isActive.HasValue)
            {
                query = query.Where(y => y.IsActive == isActive.Value);
            }

            query = query.OrderByDescending(y => y.StartDate);

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(y => new AcademicYearDto(
                    y.Id, y.Name, y.StartDate, y.EndDate, y.IsActive,
                    y.Projects.Count))
                .ToListAsync();

            return new PagedResult<AcademicYearDto>(items, totalCount, pageNumber, pageSize);
        }
        public async Task<AcademicYearDto?> GetActiveAsync()
        {
            var year = await _unitOfWork.Repository<AcademicYear>()
                .GetQueryable()
                .AsNoTracking()
                .Include(y => y.Projects)
                .FirstOrDefaultAsync(y => y.IsActive);

            return year is null ? null : MapToDto(year, year.Projects.Count);
        }

        public async Task ActivateAsync(int academicYearId)
        {
            var target = await _unitOfWork.Repository<AcademicYear>().GetByIdAsync(academicYearId)
                ?? throw new KeyNotFoundException("Academic year not found.");

            if (target.IsActive) return; // already active — idempotent

            // Only one academic year may be active at a time.
            // Deactivate the currently active one first.
            var currentlyActive = await _unitOfWork.Repository<AcademicYear>()
                .FindAsync(y => y.IsActive);

            if (currentlyActive is not null)
            {
                currentlyActive.IsActive = false;
                _unitOfWork.Repository<AcademicYear>().Update(currentlyActive);
            }

            target.IsActive = true;
            _unitOfWork.Repository<AcademicYear>().Update(target);
            await _unitOfWork.CompleteAsync();
        }

        public async Task UpdateAsync(int academicYearId, UpdateAcademicYearDto dto)
        {
            var year = await _unitOfWork.Repository<AcademicYear>().GetByIdAsync(academicYearId)
                ?? throw new KeyNotFoundException("Academic year not found.");

            if (dto.Name is not null)
            {
                if (dto.Name.Trim().Length > 20)
                    throw new ArgumentException("Name must not exceed 20 characters.");

                var conflict = await _unitOfWork.Repository<AcademicYear>()
                    .FindAsync(y => y.Name == dto.Name.Trim() && y.Id != academicYearId);
                if (conflict is not null)
                    throw new InvalidOperationException(
                        $"Another academic year with the name '{dto.Name}' already exists.");

                year.Name = dto.Name.Trim();
            }

            if (dto.StartDate.HasValue) year.StartDate = dto.StartDate.Value;
            if (dto.EndDate.HasValue) year.EndDate = dto.EndDate.Value;

            if (year.EndDate <= year.StartDate)
                throw new ArgumentException("End date must be after start date.");

            _unitOfWork.Repository<AcademicYear>().Update(year);
            await _unitOfWork.CompleteAsync();
        }

        private static AcademicYearDto MapToDto(AcademicYear y, int projectCount) =>
            new(y.Id, y.Name, y.StartDate, y.EndDate, y.IsActive, projectCount);
    }
}