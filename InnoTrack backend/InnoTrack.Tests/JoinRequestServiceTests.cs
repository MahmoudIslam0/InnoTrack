using InnoTrack.Application.DTOs.Teams;
using InnoTrack.Application.Interfaces;
using InnoTrack.Application.Services;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Entities.Enums;
using InnoTrack.Domain.Interfaces;
using Microsoft.Extensions.Logging;
using Moq;
using System.Linq.Expressions;

namespace InnoTrack.Tests
{
    public class JoinRequestServiceTests
    {
        private readonly Mock<IUnitOfWork> _mockUnitOfWork;
        private readonly Mock<ILogger<JoinRequestService>> _mockLogger;
        private readonly Mock<INotificationService> _mockNotificationService;
        private readonly JoinRequestService _joinRequestService;


        public JoinRequestServiceTests()
        {
            _mockUnitOfWork = new Mock<IUnitOfWork>();
            _mockLogger = new Mock<ILogger<JoinRequestService>>();
            _mockNotificationService = new Mock<INotificationService>();
            _joinRequestService = new JoinRequestService(_mockUnitOfWork.Object, _mockNotificationService.Object, _mockLogger.Object);
        }

        [Fact]
        public async Task HandleRequest_WhenTeamFullAtAcceptTime_ShouldThrowInvalidOperation()
        {
            var request = new JoinRequest { Id = 1, TeamId = 10, StudentId = 99, Status = RequestStatus.Pending };
            var leader = new TeamMember { TeamId = 10, StudentId = 5, Role = TeamMemberRole.Leader };
            var team = new Team { Id = 10, MaxSize = 3 };

            var mockJoinRepo = new Mock<IGenericRepository<JoinRequest>>();
            mockJoinRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(request);

            var mockMemberRepo = new Mock<IGenericRepository<TeamMember>>();

            mockMemberRepo.Setup(r => r.FindAsync(It.IsAny<Expression<Func<TeamMember, bool>>>()))
                .ReturnsAsync(leader);
            mockMemberRepo.Setup(r => r.CountAsync(It.IsAny<Expression<Func<TeamMember, bool>>>()))
                .ReturnsAsync(3);

            var mockTeamRepo = new Mock<IGenericRepository<Team>>();
            mockTeamRepo.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(team);

            _mockUnitOfWork.Setup(u => u.Repository<JoinRequest>()).Returns(mockJoinRepo.Object);
            _mockUnitOfWork.Setup(u => u.Repository<TeamMember>()).Returns(mockMemberRepo.Object);
            _mockUnitOfWork.Setup(u => u.Repository<Team>()).Returns(mockTeamRepo.Object);

            var dto = new HandleRequestDto(RequestId: 1, Accept: true, "You are rejected");

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _joinRequestService.HandleRequestAsync(5, dto));
            Assert.Equal("Team is already full. Cannot accept this request.", ex.Message);

        }

    }
}
