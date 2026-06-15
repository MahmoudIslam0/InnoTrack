namespace InnoTrack.Application.DTOs.Teams
{
    public record PendingJoinRequestDetailDto(
        int Id,
        int StudentId,
        string StudentName,
        string Department,
        decimal? GPA,
        IReadOnlyList<string> Skills,
        DateTime RequestedAt,
        string? Message
    );
}