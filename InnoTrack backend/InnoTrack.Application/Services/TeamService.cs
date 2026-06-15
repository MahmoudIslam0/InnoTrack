using AutoMapper;
using InnoTrack.Application.DTOs.Teams;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Entities.Enums;
using InnoTrack.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace InnoTrack.Application.Services
{
    public class TeamService : ITeamService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        private readonly IJoinCodeGenerator _codeGenerator;
        private readonly INotificationService _notificationService;
        private readonly ILogger<TeamService> _logger;
    
        public TeamService(IUnitOfWork unitOfWork, IMapper mapper, IJoinCodeGenerator codeGenerator, INotificationService notificationService, ILogger<TeamService> logger)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
            _codeGenerator = codeGenerator;
            _notificationService = notificationService;
            _logger = logger;
        }

        public async Task<TeamResponseDto> CreateTeamAsync(int leaderStudentId, CreateTeamDto request)
        {
            var alreadyInTeam = await _unitOfWork.Repository<TeamMember>().FindAsync(tm => tm.StudentId == leaderStudentId);
            if (alreadyInTeam != null)
                throw new InvalidOperationException("You are already a member of a team.");

            await _unitOfWork.BeginTransactionAsync();
            try
            {
                string code;
                const int maxAttempts = 5;
                int attempt = 0;
                do
                {
                    if (++attempt > maxAttempts)
                        throw new InvalidOperationException("Failed to generate a unique join code. Try again.");
                    code = _codeGenerator.GenerateJoinCode();
                }
                while (await _unitOfWork.Repository<Team>().FindAsync(t => t.JoinCode == code) != null);

                var team = new Team
                {
                    Name = request.Name,
                    MaxSize = request.MaxSize,
                    JoinCode = code
                };
                await _unitOfWork.Repository<Team>().AddAsync(team);
                await _unitOfWork.CompleteAsync();

                var member = new TeamMember
                {
                    TeamId = team.Id,
                    StudentId = leaderStudentId,
                    Role = TeamMemberRole.Leader
                };
                await _unitOfWork.Repository<TeamMember>().AddAsync(member);

                var chatRoom = new ChatRoom
                {
                    TeamId = team.Id,
                    CreatedAt = DateTime.UtcNow
                };
                await _unitOfWork.Repository<ChatRoom>().AddAsync(chatRoom);

                await _unitOfWork.CommitTransactionAsync();

                return _mapper.Map<TeamResponseDto>(team);
            }
            catch (Exception)
            {
                await _unitOfWork.RollbackTransactionAsync();
                throw;
            }
        }

        public async Task<GenerateJoinCodeResponseDto> RegenerateJoinCodeAsync(int userId)
        {
            var leaderRecord = await _unitOfWork.Repository<TeamMember>()
                .FindAsync(tm => tm.StudentId == userId && tm.Role == TeamMemberRole.Leader);
            if (leaderRecord == null)
                throw new UnauthorizedAccessException("Only the team leader can regenerate the join code.");

            var team = await _unitOfWork.Repository<Team>().GetByIdAsync(leaderRecord.TeamId)
                ?? throw new KeyNotFoundException("Team not found.");

            string newCode;
            const int maxAttempts = 5;
            int attempt = 0;
            do
            {
                if (++attempt > maxAttempts)
                    throw new InvalidOperationException("Failed to generate a unique join code. Please try again.");

                newCode = _codeGenerator.GenerateJoinCode();
            }
            while (await _unitOfWork.Repository<Team>()
                .AnyAsync(t => t.JoinCode == newCode && t.Id != team.Id));

            team.JoinCode = newCode;
            team.JoinCodeExpiry = DateTime.UtcNow.AddHours(24);

            _unitOfWork.Repository<Team>().Update(team);
            await _unitOfWork.CompleteAsync();

            return new GenerateJoinCodeResponseDto(newCode);
        }

        public async Task<DirectJoinResponseDto> DirectJoinByCodeAsync(int userId, string joinCode)
        {
            var team = await _unitOfWork.Repository<Team>()
                .FindAsync(t => t.JoinCode == joinCode);
            if (team == null)
                throw new KeyNotFoundException("Invalid join code.");

            if (team.JoinCodeExpiry.HasValue && team.JoinCodeExpiry.Value < DateTime.UtcNow)
                throw new UnauthorizedAccessException("This join code has expired. Ask the leader to generate a new one.");

            if (await _unitOfWork.Repository<TeamMember>().AnyAsync(tm => tm.StudentId == userId))
                throw new InvalidOperationException("You are already in a team.");

            var currentCount = await _unitOfWork.Repository<TeamMember>()
                .CountAsync(tm => tm.TeamId == team.Id);
            if (currentCount >= team.MaxSize)
                throw new InvalidOperationException("Team is full.");

            await _unitOfWork.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
            try
            {
                var newMember = new TeamMember
                {
                    TeamId = team.Id,
                    StudentId = userId,
                    Role = TeamMemberRole.Member
                };
                await _unitOfWork.Repository<TeamMember>().AddAsync(newMember);

                var pendingRequests = await _unitOfWork.Repository<JoinRequest>()
                    .GetAllAsync(r => r.StudentId == userId && r.Status == RequestStatus.Pending);

                foreach (var request in pendingRequests)
                {
                    request.Status = RequestStatus.Rejected;
                    _unitOfWork.Repository<JoinRequest>().Update(request);
                }
                var project = await _unitOfWork.Repository<Project>()
                    .FindAsync(p => p.TeamId == team.Id);

                var chatRoom = await _unitOfWork.Repository<ChatRoom>()
                    .FindAsync(c => c.TeamId == team.Id);

                await _unitOfWork.CommitTransactionAsync();

                try
                {
                    var leader = await _unitOfWork.Repository<TeamMember>()
                        .FindAsync(tm => tm.TeamId == team.Id && tm.Role == TeamMemberRole.Leader);

                    var studentJoining = await _unitOfWork.Repository<Student>().GetByIdAsync(userId);

                    if (leader != null && studentJoining != null)
                    {
                        await _notificationService.SendNotificationAsync(
                            leader.StudentId,
                            "New Team Member",
                            $"{studentJoining.FullName} has joined your team using the join code.",
                            NotificationType.Success, team.Id, ReferenceType.System);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send notification when joining team {TeamId}.", team.Id);
                }

                return new DirectJoinResponseDto(
                    team.Id,
                    project?.Id,
                    chatRoom?.Id,
                    "Successfully joined the team."
                );
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync();
                throw;
            }
        }

        public async Task RenameTeamAsync(int userId, string newName)
        {
            if (string.IsNullOrWhiteSpace(newName))
                throw new ArgumentException("Team name cannot be empty.");

            var leaderRecord = await _unitOfWork.Repository<TeamMember>()
                .FindAsync(tm => tm.StudentId == userId && tm.Role == TeamMemberRole.Leader);

            if (leaderRecord == null)
                throw new UnauthorizedAccessException("Only the team leader can rename the team.");

            var team = await _unitOfWork.Repository<Team>().GetByIdAsync(leaderRecord.TeamId)
                ?? throw new KeyNotFoundException("Team not found.");

            string oldName = team.Name;
            team.Name = newName.Trim();

            _unitOfWork.Repository<Team>().Update(team);
            await _unitOfWork.CompleteAsync();

            var teamMembers = await _unitOfWork.Repository<TeamMember>()
                .GetAllAsync(tm => tm.TeamId == team.Id);

            foreach (var member in teamMembers.Where(m => m.StudentId != userId))
            {
                try
                {
                    await _notificationService.SendNotificationAsync(
                        userId: member.StudentId,
                        title: "Team Renamed",
                        message: $"Your team '{oldName}' has been renamed to '{team.Name}' by the leader.",
                        type: NotificationType.Info,
                        referenceId: team.Id,
                        referenceType: ReferenceType.System
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send rename notification to user {UserId}.", member.StudentId);
                }
            }
        }

        public async Task<int> RemoveMemberAsync(int leaderId, int memberIdToRemove)
        {
            var leaderRecord = await _unitOfWork.Repository<TeamMember>()
                .FindAsync(tm => tm.StudentId == leaderId && tm.Role == TeamMemberRole.Leader);

            if (leaderRecord == null)
                throw new UnauthorizedAccessException("Only the team leader can remove members.");

            if (leaderId == memberIdToRemove)
                throw new InvalidOperationException("The team leader cannot be removed.");

            var memberToRemove = await _unitOfWork.Repository<TeamMember>()
                .FindAsync(tm => tm.StudentId == memberIdToRemove && tm.TeamId == leaderRecord.TeamId);

            if (memberToRemove == null)
                throw new KeyNotFoundException("Member not found in your team.");

            var team = await _unitOfWork.Repository<Team>().GetByIdAsync(leaderRecord.TeamId);
            _unitOfWork.Repository<TeamMember>().Delete(memberToRemove);
            await _unitOfWork.CompleteAsync();
            
            try 
            {
                await _notificationService.SendNotificationAsync(
                                    userId: memberIdToRemove,
                                    title: "Removed from Team",
                                    message: $"You have been removed from the team '{team?.Name}'.",
                                    type: NotificationType.Warning,
                                    referenceId: null, 
                                    referenceType: ReferenceType.System
                                );
            }
            catch (Exception ex) 
            { 
                _logger.LogWarning(ex, "Failed to send notification for removal of member {MemberId} from team {TeamId}.", memberIdToRemove, leaderRecord.TeamId);
            }

            return leaderRecord.TeamId;
        }

        public async Task LeaveTeamAsync(int studentId)
        {
            var memberRecord = await _unitOfWork.Repository<TeamMember>()
                .FindAsync(tm => tm.StudentId == studentId);

            if (memberRecord == null)
                throw new KeyNotFoundException("You are not part of any team.");

            if (memberRecord.Role == TeamMemberRole.Leader)
                throw new InvalidOperationException("The team leader cannot leave. You must delete the team instead.");

            _unitOfWork.Repository<TeamMember>().Delete(memberRecord);
            await _unitOfWork.CompleteAsync();

            try
            {
                var leader = await _unitOfWork.Repository<TeamMember>()
                    .FindAsync(tm => tm.TeamId == memberRecord.TeamId && tm.Role == TeamMemberRole.Leader);
                var student = await _unitOfWork.Repository<Student>().GetByIdAsync(studentId);

                if (leader != null && student != null)
                {
                    await _notificationService.SendNotificationAsync(
                        userId: leader.StudentId,
                        title: "Member Left",
                        message: $"{student.FullName} has left the team.",
                        type: NotificationType.Warning,
                        referenceId: memberRecord.TeamId,
                        referenceType: ReferenceType.System
                    );
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send notification when member {StudentId} left team {TeamId}.", studentId, memberRecord.TeamId);
            }
        }

        public async Task DeleteTeamAsync(int userId)
        {
            var leaderRecord = await _unitOfWork.Repository<TeamMember>()
                .FindAsync(tm => tm.StudentId == userId && tm.Role == TeamMemberRole.Leader);
            if (leaderRecord == null)
                throw new UnauthorizedAccessException("Only the team leader can delete the team.");

            var teamId = leaderRecord.TeamId;

            var activeProject = await _unitOfWork.Repository<Project>()
                .FindAsync(p => p.TeamId == teamId && p.Status != ProjectStatus.Abandoned);
            if (activeProject != null)
                throw new InvalidOperationException("You cannot delete a team that has an active project. Please abandon the project first.");

            var abandonedProject = await _unitOfWork.Repository<Project>()
                .FindAsync(p => p.TeamId == teamId && p.Status == ProjectStatus.Abandoned);
            if (abandonedProject != null)
            {
                abandonedProject.TeamId = null;
                _unitOfWork.Repository<Project>().Update(abandonedProject);
            }

            var projectDrafts = await _unitOfWork.Repository<ProjectDraft>()
                .GetAllAsync(pd => pd.TeamId == teamId);
            foreach (var draft in projectDrafts)
            {
                _unitOfWork.Repository<ProjectDraft>().Delete(draft);
            }

            var teamMembers = await _unitOfWork.Repository<TeamMember>()
                .GetAllAsync(tm => tm.TeamId == teamId);
            foreach (var member in teamMembers)
            {
                _unitOfWork.Repository<TeamMember>().Delete(member);
            }

            var joinRequests = await _unitOfWork.Repository<JoinRequest>()
                .GetAllAsync(jr => jr.TeamId == teamId);
            foreach (var request in joinRequests)
            {
                _unitOfWork.Repository<JoinRequest>().Delete(request);
            }

            var team = await _unitOfWork.Repository<Team>().GetByIdAsync(teamId);
            if (team != null)
            {
                _unitOfWork.Repository<Team>().Delete(team);
            }

            await _unitOfWork.CompleteAsync();

            try
            {
                foreach (var member in teamMembers.Where(m => m.StudentId != userId))
                {
                    await _notificationService.SendNotificationAsync(
                        userId: member.StudentId,
                        title: "Team Deleted",
                        message: $"The team '{team?.Name}' has been deleted by the leader.",
                        type: NotificationType.Error,
                        referenceId: null,
                        referenceType: ReferenceType.System
                    );
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send team deletion notifications for team {TeamId}.", teamId);
            }
        }
    }
}
