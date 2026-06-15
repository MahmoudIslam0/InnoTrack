using InnoTrack.Application.DTOs.Professors;

namespace InnoTrack.Application.Interfaces
{
    public interface IProfessorService
    {
        Task<ProfessorProfileDto> GetProfileAsync(int professorId);
        Task UpdateProfileAsync(int professorId, UpdateProfessorProfileDto dto);
    }
}