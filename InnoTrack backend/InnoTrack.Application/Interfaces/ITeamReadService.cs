using InnoTrack.Application.DTOs.Teams;

namespace InnoTrack.Application.Interfaces
{
    public interface ITeamReadService
    {
        Task<MyTeamDto?> GetMyTeamAsync(int userId);
        Task<IReadOnlyList<PendingJoinRequestDetailDto>> GetPendingJoinRequestsAsync(int leaderId);
        Task<int> GetPendingRequestsCountAsync(int leaderId);
    }
}