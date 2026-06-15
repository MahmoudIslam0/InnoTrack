using AutoMapper;
using Castle.Core.Logging;
using InnoTrack.Application.DTOs.Teams;
using InnoTrack.Application.Interfaces;
using InnoTrack.Application.Services;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Interfaces;
using Moq;
using System.Linq.Expressions;

namespace InnoTrack.Tests
{
    public class TeamServiceTests
    {
        private readonly Mock<IUnitOfWork> _mockUnitOfWork;
        private readonly Mock<IMapper> _mockMapper;
        private readonly Mock<IJoinCodeGenerator> _mockCodeGenerator;
        private readonly Mock<INotificationService> _notificationService;
        private readonly Mock<Microsoft.Extensions.Logging.ILogger<TeamService>> _logger;
        private readonly TeamService _teamService;

        public TeamServiceTests()
        {
            _mockUnitOfWork = new Mock<IUnitOfWork>();
            _mockMapper = new Mock<IMapper>();
            _mockCodeGenerator = new Mock<IJoinCodeGenerator>();
            _notificationService = new Mock<INotificationService>();
            _teamService = new TeamService(_mockUnitOfWork.Object, _mockMapper.Object, _mockCodeGenerator.Object, _notificationService.Object, _logger.Object);
        }

        [Fact]
        public async Task CreateTeamAsync_ShouldThrowException_IfUserAlreadyInTeam()
        {
            int studentId = 1;
            var existingMember = new TeamMember { StudentId = studentId, TeamId = 5 };

            var mockRepo = new Mock<IGenericRepository<TeamMember>>();
            mockRepo.Setup(r => r.FindAsync(It.IsAny<Expression<Func<TeamMember, bool>>>()))
                .ReturnsAsync(existingMember);

            _mockUnitOfWork.Setup(u => u.Repository<TeamMember>()).Returns(mockRepo.Object);

            var dto = new CreateTeamDto("New Team", 5);

            var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => _teamService.CreateTeamAsync(studentId, dto));
            Assert.Equal("You are already a member of a team.", exception.Message);
        }
    }
}
