namespace InnoTrack.Application.DTOs.Projects
{
    public record ProfessorPendingProjectDto(
        int Id,
        string Title,
        string Abstract,
        decimal? OriginalityScore,
        string Status
    );
}