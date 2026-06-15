namespace InnoTrack.Application.DTOs.Dashboard
{
    public record PopularProjectDto(
        int Id,
        string Title,
        string Domain,
        decimal? OriginalityScore,
        int Year,
        string? Supervisor,
        IReadOnlyList<string> Students
    );
}