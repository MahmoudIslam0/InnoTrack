namespace InnoTrack.Application.DTOs.Dashboard
{
    public record MostOriginalProjectCardDto(
        int Id,
        string Domain,
        decimal OriginalityScore,
        string Title,
        string Abstract,
        int Year,
        string Status
    );
}