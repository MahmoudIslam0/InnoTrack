namespace InnoTrack.Application.DTOs.Projects
{
    public record ProfessorSupervisedProjectDto(
        int Id,
        string Title,
        string? TeamName,
        string Description,
        string Abstract,
        string Domain,
        IReadOnlyList<string> Technologies,
        string Status,
        decimal? OriginalityScore,
        DateTime? SubmittedAt,
        int Progress,
        bool IsMuted = false
    );
}
