namespace InnoTrack.Application.DTOs.Teams
{
    public record DirectJoinResponseDto(int TeamId, int? ProjectId, int? ChatRoomId, string Message);
}