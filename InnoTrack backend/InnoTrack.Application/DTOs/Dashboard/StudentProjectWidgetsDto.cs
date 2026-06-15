
namespace InnoTrack.Application.DTOs.Dashboard
{
    public record CurrentOriginalityWidgetDto(
        decimal? CurrentProjectOriginality,
        string? ProjectTitle
    );
    public record ProjectStatusWidgetDto(

        string? ProjectStatus,
        string? StatusDescription
    );
}
