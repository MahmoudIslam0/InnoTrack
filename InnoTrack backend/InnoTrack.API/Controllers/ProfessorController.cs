// InnoTrack.API/Controllers/ProfessorController.cs
using InnoTrack.API.Attributes;
using InnoTrack.API.Hubs;
using InnoTrack.Application.DTOs.Chat;
using InnoTrack.Application.DTOs.Feedback;
using InnoTrack.Application.DTOs.Professors;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace InnoTrack.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProfessorController : ControllerBase
    {
        private readonly IProfessorProjectService _professorProjectService;
        private readonly IProfessorService _professorService;
        private readonly IFeedbackService _feedbackService;
        private readonly IAuditService _auditService;
        private readonly IChatService _chatService;
        private readonly IHubContext<ChatHub> _hubContext;

        public ProfessorController(
            IProfessorProjectService professorProjectService,
            IProfessorService professorService,
            IFeedbackService feedbackService,
            IAuditService auditService,
            IChatService chatService,
            IHubContext<ChatHub> hubContext)
        {
            _professorProjectService = professorProjectService;
            _professorService = professorService;
            _feedbackService = feedbackService;
            _auditService = auditService;
            _chatService = chatService;
            _hubContext = hubContext;
        }

        private int GetProfessorId()
        {
            var v = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(v) || !int.TryParse(v, out int id))
                throw new UnauthorizedAccessException("Invalid User Token.");
            return id;
        }


        /// <summary>
        /// Returns the authenticated professor's profile: department, team load,
        /// capacity ceiling, and active status.
        /// </summary>
        [AuthorizeRoles(UserRole.Professor)]
        [HttpGet("me")]
        public async Task<IActionResult> GetMyProfile()
        {
            var profId = GetProfessorId();
            var profile = await _professorService.GetProfileAsync(profId);
            return Ok(profile);
        }

        /// <summary>
        /// Updates the professor's supervision capacity (MaxTeamLoad).
        /// Cannot be reduced below the current active team count.
        /// Name and department changes require an admin via PUT /api/admin/professors/{id}.
        /// </summary>
        [AuthorizeRoles(UserRole.Professor)]
        [HttpPatch("me/profile")]
        public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateProfessorProfileDto dto)
        {
            var profId = GetProfessorId();
            await _professorService.UpdateProfileAsync(profId, dto);
            return NoContent();
        }


        /// <summary>
        /// Returns aggregate workload statistics: total teams, pending reviews,
        /// project status breakdown, average originality score, and 5 recent teams.
        /// </summary>
        [AuthorizeRoles(UserRole.Professor)]
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            var profId = GetProfessorId();
            var dashboard = await _professorProjectService.GetDashboardAsync(profId);
            return Ok(dashboard);
        }


        /// <summary>
        /// Returns all teams currently supervised by this professor,
        /// including each team's project status, originality score, and member list.
        /// Note: JoinCode is intentionally excluded from this response.
        /// </summary>
        [AuthorizeRoles(UserRole.Professor)]
        [HttpGet("teams")]
        public async Task<IActionResult> GetTeams()
        {
            var profId = GetProfessorId();
            var result = await _professorProjectService.GetSupervisedTeamsAsync(profId);
            return Ok(result);
        }


        /// <summary>
        /// Returns all projects supervised by this professor across all statuses,
        /// ordered by most recent submission. Includes domain and computed progress.
        /// </summary>
        [AuthorizeRoles(UserRole.Professor)]
        [HttpGet("projects")]
        public async Task<IActionResult> GetProjects()
        {
            var profId = GetProfessorId();
            var result = await _professorProjectService.GetSupervisedProjectsAsync(profId);
            return Ok(result);
        }

        /// <summary>
        /// Returns the complete proposal details for a single project.
        /// Includes full text (abstract, description, problem statement, proposed solution,
        /// objectives), team member profiles with GPA and skills, all feedback history,
        /// and whether an AI originality report has been generated.
        /// Use this before making a review decision.
        /// </summary>
        [AuthorizeRoles(UserRole.Professor)]
        [HttpGet("projects/{projectId:int}")]
        public async Task<IActionResult> GetProjectDetail(int projectId)
        {
            var profId = GetProfessorId();
            var detail = await _professorProjectService.GetProjectDetailAsync(profId, projectId);
            return Ok(detail);
        }

        /// <summary>
        /// Returns projects currently awaiting review (status = UnderReview), paginated.
        /// </summary>
        [AuthorizeRoles(UserRole.Professor)]
        [HttpGet("projects/pending")]
        public async Task<IActionResult> GetPendingProjects(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20)
        {
            var profId = GetProfessorId();
            var result = await _professorProjectService.GetPendingProjectsAsync(
                profId, pageNumber, pageSize);
            return Ok(result);
        }

        /// <summary>
        /// Approves or rejects a submitted project proposal.
        /// Project must have status UnderReview.
        /// On approval: status → In_Progress.
        /// On rejection: status → Rejected.
        /// All team members are notified via SignalR.
        /// </summary>
        [AuthorizeRoles(UserRole.Professor)]
        [HttpPost("projects/{projectId:int}/review")]
        public async Task<IActionResult> ReviewProject(
            int projectId, [FromBody] ReviewProjectRequestDto request)
        {
            var profId = GetProfessorId();
            await _professorProjectService.ReviewProjectAsync(profId, projectId, request.Approve);

            _auditService.LogAction(profId, "Project Review",
                $"Professor {(request.Approve ? "approved" : "rejected")} project ID {projectId}.");

            return Ok(new { message = "Project reviewed successfully." });
        }

        /// <summary>
        /// Returns the project to Draft status with a mandatory revision reason.
        /// The reason is persisted as a Feedback record (prefixed [REVISION REQUESTED])
        /// so the team can see exactly what needs to change.
        /// All team members are notified via SignalR.
        /// The team may edit the project and resubmit after this action.
        /// </summary>
        [AuthorizeRoles(UserRole.Professor)]
        [HttpPost("projects/{projectId:int}/request-revision")]
        public async Task<IActionResult> RequestRevision(
            int projectId, [FromBody] RequestRevisionDto dto)
        {
            var profId = GetProfessorId();
            await _professorProjectService.RequestRevisionAsync(profId, projectId, dto.Reason);

            _auditService.LogAction(profId, "Revision Requested",
                $"Professor requested revision for project ID {projectId}.");

            return Ok(new
            {
                message = "Revision requested. The project has been returned to Draft " +
                          "and the team has been notified."
            });
        }

        /// <summary>
        /// Adds a feedback comment to a project supervised by this professor.
        /// Can be used at any project status for ongoing guidance.
        /// All team members are notified via SignalR.
        /// </summary>
        [AuthorizeRoles(UserRole.Professor)]
        [HttpPost("projects/{projectId:int}/feedback")]
        public async Task<IActionResult> AddFeedback(
            int projectId, [FromBody] AddFeedbackRequestDto request)
        {
            var profId = GetProfessorId();
            await _feedbackService.AddFeedbackAsync(profId, projectId, request.Content);
            return Ok(new { message = "Feedback submitted successfully." });
        }

        /// <summary>
        /// Returns the professor's complete sent-feedback history, ordered by most recent.
        /// Includes the IsRead flag so the professor knows which feedback the team has seen.
        /// </summary>
        [AuthorizeRoles(UserRole.Professor)]
        [HttpGet("feedback")]
        public async Task<IActionResult> GetFeedbackHistory()
        {
            var profId = GetProfessorId();
            var result = await _feedbackService.GetFeedbackHistoryAsync(profId);
            return Ok(result);
        }


        /// <summary>
        /// Returns the last 50 chat messages for a supervised team's chat room.
        /// The professor is included in the members list but students' join codes
        /// are never exposed through this endpoint.
        /// </summary>
        [AuthorizeRoles(UserRole.Professor)]
        [HttpGet("teams/{teamId:int}/chat")]
        public async Task<IActionResult> GetTeamChat(int teamId)
        {
            var profId = GetProfessorId();
            var result = await _chatService.GetTeamChatForProfessorAsync(profId, teamId);
            return Ok(result);
        }

        /// <summary>
        /// Sends a chat message to a supervised team.
        /// The message is broadcast to all connected team members via SignalR.
        /// </summary>
        [AuthorizeRoles(UserRole.Professor)]
        [HttpPost("teams/{teamId:int}/chat/messages")]
        public async Task<IActionResult> SendMessage(
            int teamId, [FromBody] SendChatMessageDto dto)
        {
            var profId = GetProfessorId();
            var result = await _chatService.SendProfessorMessageAsync(profId, teamId, dto.Content);

            await _hubContext.Clients
                .Group($"Team_{teamId}")
                .SendAsync("ReceiveMessage", result);

            return Ok(result);
        }
    }
}