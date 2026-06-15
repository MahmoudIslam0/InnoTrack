// InnoTrack.Application/Services/ProfessorService.cs
using InnoTrack.Application.DTOs.Professors;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Entities.Enums;
using InnoTrack.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.Application.Services
{
    public class ProfessorService : IProfessorService
    {
        private readonly IUnitOfWork _unitOfWork;

        public ProfessorService(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        public async Task<ProfessorProfileDto> GetProfileAsync(int professorId)
        {
            var professor = await _unitOfWork.Repository<Professor>()
                .GetQueryable()
                .AsNoTracking()
                .Include(p => p.Department)
                .FirstOrDefaultAsync(p => p.Id == professorId)
                ?? throw new KeyNotFoundException("Professor profile not found.");

            var currentLoad = await _unitOfWork.Repository<Team>()
                .CountAsync(t => t.ProfessorId == professorId &&
                     (t.Project == null || t.Project.Status != ProjectStatus.Completed));

            return new ProfessorProfileDto(
                professor.Id, professor.FirstName, professor.LastName,
                professor.Email, professor.DepartmentId, professor.Department.Name,
                professor.MaxTeamLoad, currentLoad, professor.IsActive, professor.ProfilePictureURL, professor.ProfileBannerColor);
        }

        public async Task UpdateProfileAsync(int professorId, UpdateProfessorProfileDto dto)
        {
            if (!dto.MaxTeamLoad.HasValue && dto.ProfileBannerColor == null) return; // nothing to update

            var professor = await _unitOfWork.Repository<Professor>().GetByIdAsync(professorId)
                ?? throw new KeyNotFoundException("Professor not found.");

            if (dto.MaxTeamLoad.HasValue)
            {
                if (dto.MaxTeamLoad.Value is < 1 or > 50)
                    throw new ArgumentException("MaxTeamLoad must be between 1 and 50.");

                // Guard: cannot reduce capacity below active team count
                var currentLoad = await _unitOfWork.Repository<Team>()
                    .CountAsync(t => t.ProfessorId == professorId &&
                         (t.Project == null || t.Project.Status != ProjectStatus.Completed));

                if (dto.MaxTeamLoad.Value < currentLoad)
                    throw new InvalidOperationException(
                        $"Cannot set capacity to {dto.MaxTeamLoad.Value}. " +
                        $"You are currently supervising {currentLoad} team(s). " +
                        $"Contact an admin to reassign teams first.");

                professor.MaxTeamLoad = dto.MaxTeamLoad.Value;
            }

            if (dto.ProfileBannerColor != null)
            {
                professor.ProfileBannerColor = dto.ProfileBannerColor;
            }

            _unitOfWork.Repository<Professor>().Update(professor);
            await _unitOfWork.CompleteAsync();
        }
    }
}