using InnoTrack.Application.DTOs.Feedback;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Interfaces;

namespace InnoTrack.Application.Services
{
    public class FeedbackReadService : IFeedbackReadService
    {
        private readonly IUnitOfWork _unitOfWork;

        public FeedbackReadService(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        public async Task<IReadOnlyList<FeedbackHistoryItemDto>> GetMyFeedbackAsync(int userId)
        {
            var teamMember = await _unitOfWork.Repository<TeamMember>()
                .FindAsync(tm => tm.StudentId == userId);

            if (teamMember == null)
                return Array.Empty<FeedbackHistoryItemDto>();

            var project = await _unitOfWork.Repository<Project>()
                .FindAsync(p => p.TeamId == teamMember.TeamId);

            if (project == null)
                return Array.Empty<FeedbackHistoryItemDto>();

            var feedbacks = await _unitOfWork.Repository<Feedback>()
                .GetAllAsync(f => f.ProjectId == project.Id);

            var result = feedbacks
                .OrderByDescending(f => f.CreatedAt)
                .Select(f => new FeedbackHistoryItemDto(
                    f.Id,
                    project.Id,
                    project.Title,
                    f.Content,
                    f.CreatedAt,
                    false
                ))
                .ToList();

            return result.AsReadOnly();
        }
    }
}