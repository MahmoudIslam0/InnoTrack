namespace InnoTrack.Application.DTOs.Projects
{
    public record SimilarityCheckRequestDto(
        string Title,
        string Abstract,
        string Description
    );
}