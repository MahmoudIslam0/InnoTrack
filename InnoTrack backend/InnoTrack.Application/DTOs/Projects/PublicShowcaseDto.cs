namespace InnoTrack.Application.DTOs.Projects
{
    public record PublicShowcaseDto(
        int Id,
        string Title,
        string Abstract,
        decimal? OriginalityScore,
        List<string> Students
    );
}
