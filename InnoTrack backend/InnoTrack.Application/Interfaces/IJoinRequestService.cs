using InnoTrack.Application.DTOs.Teams;

namespace InnoTrack.Application.Interfaces
{
    public interface IJoinRequestService
    {
        Task RequestToJoinAsync(int studentId, JoinRequestDto dto);
        Task HandleRequestAsync(int leaderId, HandleRequestDto dto);
    }
}
