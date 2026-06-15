using InnoTrack.Application.DTOs.Teams;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Entities.Enums;
using InnoTrack.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace InnoTrack.Application.Services
{
    public class JoinRequestService : IJoinRequestService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly INotificationService _notificationService;
        private readonly ILogger<JoinRequestService> _logger;

        public JoinRequestService(IUnitOfWork unitOfWork, INotificationService notificationService, ILogger<JoinRequestService> logger)
        {
            _unitOfWork = unitOfWork;
            _notificationService = notificationService;
            _logger = logger;
        }

        public async Task RequestToJoinAsync(int studentId, JoinRequestDto dto)
        {
            var team = await _unitOfWork.Repository<Team>().GetByIdAsync(dto.TeamId);
            if (team == null) throw new KeyNotFoundException("Team not found.");

            if (team.JoinCodeExpiry.HasValue && team.JoinCodeExpiry.Value < DateTime.UtcNow)
                throw new UnauthorizedAccessException("This join code has expired. Ask the leader to generate a new one.");

            if (await _unitOfWork.Repository<TeamMember>().AnyAsync(tm => tm.StudentId == studentId))
                throw new InvalidOperationException("You are already in a team.");

            var currentMembersCount = await _unitOfWork.Repository<TeamMember>().CountAsync(tm => tm.TeamId == team.Id);
            if (currentMembersCount >= team.MaxSize) throw new InvalidOperationException("Team is full.");

            if (await _unitOfWork.Repository<JoinRequest>().AnyAsync(r => r.StudentId == studentId && r.TeamId == team.Id && r.Status == RequestStatus.Pending))
                throw new InvalidOperationException("You already have a pending request for this team.");

            var request = new JoinRequest
            {
                StudentId = studentId,
                TeamId = team.Id,
                Message = dto.Message,
                Status = RequestStatus.Pending
            };

            await _unitOfWork.Repository<JoinRequest>().AddAsync(request);
            await _unitOfWork.CompleteAsync();

            var leader = await _unitOfWork.Repository<TeamMember>()
                .FindAsync(tm => tm.TeamId == team.Id && tm.Role == TeamMemberRole.Leader);

            if (leader != null)
            {
                var student = await _unitOfWork.Repository<User>().GetByIdAsync(studentId);

                if (student != null)
                {
                    await _notificationService.SendNotificationAsync(
                        leader.StudentId,
                        "New Join Request",
                        $"{student.FirstName} {student.LastName} wants to join your team: {team.Name}",
                        NotificationType.Info,
                        request.Id,
                        ReferenceType.TeamRequest);
                }
            }
        }

        public async Task HandleRequestAsync(int leaderId, HandleRequestDto dto)
        {
            await _unitOfWork.BeginTransactionAsync();
            try
            {
                var request = await _unitOfWork.Repository<JoinRequest>().GetByIdAsync(dto.RequestId);
                if (request == null) throw new KeyNotFoundException("Request not found.");

                var leader = await _unitOfWork.Repository<TeamMember>().FindAsync(tm => tm.TeamId == request.TeamId && tm.StudentId == leaderId);
                if (leader == null || leader.Role != TeamMemberRole.Leader)
                    throw new UnauthorizedAccessException("Only the team leader can handle requests.");

                int userId = request.StudentId;
                string notifTitle, notifMessage;
                NotificationType notifType;

                if (dto.Accept)
                {
                    var currentCount = await _unitOfWork.Repository<TeamMember>()
                        .CountAsync(tm => tm.TeamId == request.TeamId);

                    var team = await _unitOfWork.Repository<Team>().GetByIdAsync(request.TeamId)
                        ?? throw new KeyNotFoundException("Team not found.");

                    if (currentCount >= team.MaxSize)
                        throw new InvalidOperationException("Team is already full. Cannot accept this request.");

                    request.Status = RequestStatus.Approved;
                    var newMember = new TeamMember
                    {
                        TeamId = request.TeamId,
                        StudentId = request.StudentId,
                        Role = TeamMemberRole.Member
                    };
                    await _unitOfWork.Repository<TeamMember>().AddAsync(newMember);

                    var otherPendingRequests = await _unitOfWork.Repository<JoinRequest>()
                        .GetAllAsync(r => r.StudentId == request.StudentId
                                       && r.Id != request.Id
                                       && r.Status == RequestStatus.Pending);

                    foreach (var other in otherPendingRequests)
                    {
                        other.Status = RequestStatus.Rejected;
                        _unitOfWork.Repository<JoinRequest>().Update(other);
                    }

                    notifTitle = "Join Request Accepted";
                    notifMessage = "Your request to join the team has been accepted.";
                    notifType = NotificationType.Success;
                }
                else
                {
                    request.Status = RequestStatus.Rejected;
                    notifTitle = "Join Request Rejected";
                    notifMessage = string.IsNullOrWhiteSpace(dto.FeedbackMessage)
                        ? "Your request to join the team has been rejected."
                        : $"Your request to join the team has been rejected. Feedback: {dto.FeedbackMessage}";
                    notifType = NotificationType.Error;
                }
                await _unitOfWork.CommitTransactionAsync();

                try
                {
                    await _notificationService.SendNotificationAsync(userId, notifTitle, notifMessage, notifType, request.Id, ReferenceType.TeamRequest);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send notification to user {UserId} after handling join request.", userId);
                }
            }
            catch (Exception)
            {
                await _unitOfWork.RollbackTransactionAsync();
                throw;
            }
        }
    }
}