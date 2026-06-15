// InnoTrack.Application/Services/ProfessorAdminService.cs
using InnoTrack.Application.Common;
using InnoTrack.Application.DTOs.Professors;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Entities.Enums;
using InnoTrack.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.Application.Services
{
    public class ProfessorAdminService : IProfessorAdminService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IAuditService _auditService;

        public ProfessorAdminService(IUnitOfWork unitOfWork, IPasswordHasher passwordHasher, IAuditService auditService)
        {
            _unitOfWork = unitOfWork;
            _passwordHasher = passwordHasher;
            _auditService = auditService;
        }

        public async Task<ProfessorAdminViewDto> CreateProfessorAsync(CreateProfessorDto dto)
        {
            // Email uniqueness check across ALL users, not just professors
            var existing = await _unitOfWork.Repository<User>()
                .FindAsync(u => u.Email == dto.Email.Trim().ToLower());
            if (existing is not null)
                throw new InvalidOperationException("A user with this email already exists.");

            var department = await _unitOfWork.Repository<Department>()
                .GetByIdAsync(dto.DepartmentId)
                ?? throw new KeyNotFoundException($"Department ID {dto.DepartmentId} not found.");

            var professor = new Professor
            {
                FirstName = dto.FirstName.Trim(),
                LastName = dto.LastName.Trim(),
                Email = dto.Email.Trim().ToLower(),
                PasswordHash = _passwordHasher.Hash(dto.Password),
                DepartmentId = dto.DepartmentId,
                MaxTeamLoad = dto.MaxTeamLoad,
                Role = UserRole.Professor,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.Repository<Professor>().AddAsync(professor);
            await _unitOfWork.CompleteAsync();

            return new ProfessorAdminViewDto(
                professor.Id, professor.FullName, professor.Email,
                professor.DepartmentId, department.Name,
                professor.MaxTeamLoad, CurrentTeamLoad: 0,
                professor.IsActive, professor.CreatedAt);
        }

        public async Task DeleteProfessorByAdminAsync(int adminId, int professorId)
        {
            var professor = await _unitOfWork.Repository<Professor>().GetByIdAsync(professorId)
                ?? throw new KeyNotFoundException("Professor not found.");

            var activeSupervisions = await _unitOfWork.Repository<Team>()
                .AnyAsync(t => t.ProfessorId == professorId &&
                               t.Project != null &&
                               (t.Project.Status == ProjectStatus.In_Progress || t.Project.Status == ProjectStatus.Approved || t.Project.Status == ProjectStatus.Draft));

            if (activeSupervisions)
                throw new InvalidOperationException("Cannot delete this professor because they are currently supervising active teams. Reassign the teams first.");

            professor.IsActive = false;
            professor.IsDeleted = true;

            _unitOfWork.Repository<Professor>().Update(professor); 
            await _unitOfWork.CompleteAsync();

            _auditService.LogAction(adminId, "Admin Disable Professor", $"Disabled professor account: {professor.FullName}");
        }

        public async Task<PagedResult<ProfessorAdminViewDto>> GetAllProfessorsAsync(
            string? search, int? departmentId, bool? isActive, bool? hasCapacity,
            int pageNumber, int pageSize)
        {
            var query = _unitOfWork.Repository<Professor>()
                    .GetQueryable()
                    .AsNoTracking()
                    .Include(p => p.Department)
                    .Include(p => p.SupervisedTeams)
                        .ThenInclude(t => t.Project)
                    .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(p =>
                    p.FirstName.ToLower().Contains(term) ||
                    p.LastName.ToLower().Contains(term) ||
                    p.Email.ToLower().Contains(term) ||
                    p.Department.Name.ToLower().Contains(term));
            }

            if (departmentId.HasValue)
            {
                query = query.Where(p => p.DepartmentId == departmentId.Value);
            }

            if (isActive.HasValue)
            {
                query = query.Where(p => p.IsActive == isActive.Value);
            }

            if (hasCapacity.HasValue)
            {
                if (hasCapacity.Value)
                {
                    query = query.Where(p => p.SupervisedTeams.Count(t =>
                        t.Project == null || t.Project.Status != ProjectStatus.Completed) < p.MaxTeamLoad);
                }
                else
                {
                    query = query.Where(p => p.SupervisedTeams.Count(t =>
                        t.Project == null || t.Project.Status != ProjectStatus.Completed) >= p.MaxTeamLoad);
                }
            }

            var totalCount = await query.CountAsync();

            var professors = await query
                    .OrderBy(p => p.FirstName).ThenBy(p => p.LastName)
                    .Skip((pageNumber - 1) * pageSize)
                    .Take(pageSize)
                    .Select(p => new ProfessorAdminViewDto(
                        p.Id,
                        p.FullName,
                        p.Email,
                        p.DepartmentId,
                        p.Department.Name,
                        p.MaxTeamLoad,
                        p.SupervisedTeams.Count(t => t.Project == null || t.Project.Status != ProjectStatus.Completed),
                        p.IsActive,
                        p.CreatedAt))
                    .ToListAsync();

            return new PagedResult<ProfessorAdminViewDto>(professors, totalCount, pageNumber, pageSize);
        }
        public async Task<ProfessorAdminViewDto> GetProfessorByIdAsync(int professorId)
        {
            var professor = await _unitOfWork.Repository<Professor>()
                .GetQueryable()
                .AsNoTracking()
                .Include(p => p.Department)
                .FirstOrDefaultAsync(p => p.Id == professorId)
                ?? throw new KeyNotFoundException("Professor not found.");

            // CountAsync for current load — avoids loading all team entities
            var currentLoad = await _unitOfWork.Repository<Team>()
                .CountAsync(t => t.ProfessorId == professorId);

            return new ProfessorAdminViewDto(
                professor.Id, professor.FullName, professor.Email,
                professor.DepartmentId, professor.Department.Name,
                professor.MaxTeamLoad, currentLoad,
                professor.IsActive, professor.CreatedAt);
        }

        public async Task UpdateProfessorAsync(int professorId, UpdateProfessorAdminDto dto)
        {
            var professor = await _unitOfWork.Repository<Professor>().GetByIdAsync(professorId)
                ?? throw new KeyNotFoundException("Professor not found.");

            if (dto.FirstName is not null) professor.FirstName = dto.FirstName.Trim();
            if (dto.LastName is not null) professor.LastName = dto.LastName.Trim();

            if (dto.DepartmentId.HasValue)
            {
                _ = await _unitOfWork.Repository<Department>().GetByIdAsync(dto.DepartmentId.Value)
                    ?? throw new KeyNotFoundException($"Department {dto.DepartmentId} not found.");
                professor.DepartmentId = dto.DepartmentId.Value;
            }

            if (dto.MaxTeamLoad.HasValue)
            {
                var currentLoad = await _unitOfWork.Repository<Team>()
                    .CountAsync(t => t.ProfessorId == professorId &&
                                     (t.Project == null || t.Project.Status != ProjectStatus.Completed));

                if (dto.MaxTeamLoad.Value < currentLoad)
                    throw new InvalidOperationException(
                        $"Cannot reduce capacity below the current active team load ({currentLoad} supervised teams). " +
                        $"Reassign teams first.");

                professor.MaxTeamLoad = dto.MaxTeamLoad.Value;
            }

            if (dto.IsActive.HasValue) professor.IsActive = dto.IsActive.Value;

            _unitOfWork.Repository<Professor>().Update(professor);
            await _unitOfWork.CompleteAsync();
        }

        public async Task SetProfessorActiveStatusAsync(int professorId, bool isActive)
        {
            var professor = await _unitOfWork.Repository<Professor>().GetByIdAsync(professorId)
                ?? throw new KeyNotFoundException("Professor not found.");

            professor.IsActive = isActive;
            _unitOfWork.Repository<Professor>().Update(professor);
            await _unitOfWork.CompleteAsync();
        }

        public async Task ResetProfessorPasswordAsync(int professorId, string newPassword)
        {
            if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 8)
                throw new ArgumentException("New password must be at least 8 characters.");

            var professor = await _unitOfWork.Repository<Professor>().GetByIdAsync(professorId)
                ?? throw new KeyNotFoundException("Professor not found.");

            professor.PasswordHash = _passwordHasher.Hash(newPassword);
            _unitOfWork.Repository<Professor>().Update(professor);
            await _unitOfWork.CompleteAsync();
        }
    }
}