namespace InnoTrack.Application.DTOs.Projects
{
    public record SimilarityCheckResponseDto(
        decimal OriginalityScore,
        IReadOnlyList<SimilarProjectResultDto> SimilarProjects
    );

    public record SimilarProjectResultDto(
        int? Id,
        string Title,
        decimal Similarity
    );
}