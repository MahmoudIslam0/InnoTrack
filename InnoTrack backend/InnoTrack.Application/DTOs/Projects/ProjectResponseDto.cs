using InnoTrack.Domain.Entities.Enums;

namespace InnoTrack.Application.DTOs.Projects
{
    public record ProjectResponseDto(int Id, string Title, ProjectStatus Status);
}
