using InnoTrack.Application.DTOs.Feedback;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Entities.Enums;
using InnoTrack.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.Application.Services
{
    public class FeedbackService : IFeedbackService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly INotificationService _notificationService;

        public FeedbackService(IUnitOfWork unitOfWork, INotificationService notificationService)
        {
            _unitOfWork = unitOfWork;
            _notificationService = notificationService;
        }

        public async Task AddFeedbackAsync(int professorId, int projectId, string content)
        {
            var project = await _unitOfWork.Repository<Project>().GetByIdAsync(projectId);
            if (project == null)
                throw new KeyNotFoundException("Project not found.");

            var feedback = new Feedback
            {
                ProfessorId = professorId,
                ProjectId = projectId,
                Content = content
            };
            await _unitOfWork.Repository<Feedback>().AddAsync(feedback);
            await _unitOfWork.CompleteAsync();

            var message = "A professor has added feedback to your project.";
            var notifType = NotificationType.Info;

            var teamMembers = await _unitOfWork.Repository<TeamMember>()
                .GetAllAsync(tm => tm.TeamId == project.TeamId);

            foreach (var member in teamMembers)
            {
                await _notificationService.SendNotificationAsync(
                    member.StudentId, "New Feedback",
                    message,
                    notifType,
                    project.Id,
                    ReferenceType.Project);
            }
        }

        public async Task MarkFeedbackAsReadAsync(int feedbackId, int userId)
        {
            var feedback = await _unitOfWork.Repository<Feedback>().GetByIdAsync(feedbackId);
            if (feedback == null) throw new KeyNotFoundException("Feedback not found.");

            var project = await _unitOfWork.Repository<Project>().GetByIdAsync(feedback.ProjectId);
            if (project == null)
                throw new KeyNotFoundException("Project not found.");

            var isMember = await _unitOfWork.Repository<TeamMember>()
                .AnyAsync(tm => tm.TeamId == project.TeamId && tm.StudentId == userId);
            if (!isMember) throw new UnauthorizedAccessException("You cannot read this feedback.");

            feedback.IsRead = true;
            _unitOfWork.Repository<Feedback>().Update(feedback);
            await _unitOfWork.CompleteAsync();
        }

        public async Task<IReadOnlyList<FeedbackHistoryItemDto>> GetFeedbackHistoryAsync(int professorId)
        {
            var feedback = await _unitOfWork.Repository<Feedback>().GetQueryable()
                .AsNoTracking()
                .Include(f => f.Project)
                .Where(f => f.ProfessorId == professorId)
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync();

            return feedback.Select(f => new FeedbackHistoryItemDto(
                f.Id,
                f.ProjectId,
                f.Project?.Title ?? "Unknown Project",
                f.Content,
                f.CreatedAt,
                f.IsRead
            )).ToList().AsReadOnly();
        }
    }
}
