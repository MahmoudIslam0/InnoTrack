using InnoTrack.Application.DTOs.Teams;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Entities.Enums;
using InnoTrack.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.Application.Services
{
    public class TeamReadService : ITeamReadService
    {
        private readonly IUnitOfWork _unitOfWork;

        public TeamReadService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<MyTeamDto?> GetMyTeamAsync(int userId)
        {
            var teamMember = await _unitOfWork.Repository<TeamMember>()
                .FindAsync(tm => tm.StudentId == userId);
            if (teamMember == null) return null;

            var team = await _unitOfWork.Repository<Team>()
                .GetByIdAsync(teamMember.TeamId);
            if (team == null) return null;

            var project = await _unitOfWork.Repository<Project>()
                .FindAsync(p => p.TeamId == team.Id);

            var allMembers = await _unitOfWork.Repository<TeamMember>()
                .GetAllAsync(tm => tm.TeamId == team.Id);

            var teamMemberIds = allMembers.Select(m => m.StudentId).ToList();
            var skillData = await _unitOfWork.Repository<StudentSkill>()
                .GetQueryable()
                .Where(ss => teamMemberIds.Contains(ss.StudentId))
                .Include(ss => ss.Skill)
                .GroupBy(ss => ss.StudentId)
                .ToDictionaryAsync(g => g.Key, g => g.Select(ss => ss.Skill.Name).ToList());

            var memberDetails = new List<TeamMemberDetailDto>();
            foreach (var member in allMembers)
            {
                var student = await _unitOfWork.Repository<Student>().GetByIdAsync(member.StudentId);
                if (student == null) continue;

                var skills = skillData.GetValueOrDefault(member.StudentId, new List<string>());

                memberDetails.Add(new TeamMemberDetailDto(
                    student.Id, student.FullName, member.Role.ToString(), student.Email, student.ProfilePictureURL, skills.AsReadOnly()
                ));
            }

            // Resolve supervisor name only if the team has an active project
            string? supervisorName = null;
            if (project != null && team.ProfessorId.HasValue)
            {
                var professor = await _unitOfWork.Repository<Professor>().GetByIdAsync(team.ProfessorId.Value);
                supervisorName = professor?.FullName;
            }

            // Resolve project technologies
            var technologies = new List<string>();
            if (project != null)
            {
                technologies = await _unitOfWork.Repository<ProjectTechnology>()
                    .GetQueryable()
                    .Where(pt => pt.ProjectId == project.Id)
                    .Include(pt => pt.Technology)
                    .Select(pt => pt.Technology.Name)
                    .ToListAsync();
            }

            return new MyTeamDto(
                team.Id,
                team.Name,
                project?.Id,
                project?.Title,
                team.JoinCode,
                teamMember.Role == TeamMemberRole.Leader,
                memberDetails.AsReadOnly(),
                supervisorName,
                technologies.AsReadOnly()
            );
        }

        public async Task<IReadOnlyList<PendingJoinRequestDetailDto>> GetPendingJoinRequestsAsync(int leaderId)
        {
            var leaderRecord = await _unitOfWork.Repository<TeamMember>()
                .FindAsync(tm => tm.StudentId == leaderId && tm.Role == TeamMemberRole.Leader);
            if (leaderRecord == null)
                throw new UnauthorizedAccessException("Only the team leader can view join requests.");

            var pendingRequests = await _unitOfWork.Repository<JoinRequest>()
                .GetAllAsync(r => r.TeamId == leaderRecord.TeamId && r.Status == RequestStatus.Pending);

            if (!pendingRequests.Any())
                return Array.Empty<PendingJoinRequestDetailDto>();

            var studentIds = pendingRequests.Select(r => r.StudentId).ToList();
            var students = await _unitOfWork.Repository<Student>()
                .GetQueryable()
                .AsNoTracking()
                .Include(s => s.Department)
                .Where(s => studentIds.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id);

            var skillData = await _unitOfWork.Repository<StudentSkill>()
                .GetQueryable()
                .AsNoTracking()
                .Where(ss => studentIds.Contains(ss.StudentId))
                .Include(ss => ss.Skill)
                .GroupBy(ss => ss.StudentId)
                .ToDictionaryAsync(g => g.Key, g => g.Select(ss => ss.Skill.Name).ToList());

            var result = new List<PendingJoinRequestDetailDto>();
            foreach (var request in pendingRequests)
            {
                if (!students.TryGetValue(request.StudentId, out var student)) continue;

                result.Add(new PendingJoinRequestDetailDto(
                    request.Id,
                    student.Id,
                    student.FullName,
                    student.Department?.Name ?? string.Empty,
                    student.GPA,
                    skillData.GetValueOrDefault(student.Id, new List<string>()).AsReadOnly(),
                    request.CreatedAt,
                    request.Message
                ));
            }

            return result.AsReadOnly();
        }

        public async Task<int> GetPendingRequestsCountAsync(int leaderId)
        {
            var leaderRecord = await _unitOfWork.Repository<TeamMember>()
                .FindAsync(tm => tm.StudentId == leaderId && tm.Role == TeamMemberRole.Leader);

            if (leaderRecord == null)
                return 0;

            var count = await _unitOfWork.Repository<JoinRequest>()
                .CountAsync(r => r.TeamId == leaderRecord.TeamId && r.Status == RequestStatus.Pending);

            return count;
        }
    }
}