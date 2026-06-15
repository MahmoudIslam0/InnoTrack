using InnoTrack.API.Attributes;
using InnoTrack.API.Hubs;
using InnoTrack.Application.DTOs.Teams;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Entities.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using static QuestPDF.Helpers.Colors;

namespace InnoTrack.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TeamsController : ControllerBase
    {
        private readonly ITeamService _teamService;
        private readonly ITeamReadService _teamReadService;
        private readonly IJoinRequestService _joinRequestService;
        private readonly IEmailService _emailService;
        private readonly IHubContext<ChatHub> _hubContext;


        public TeamsController(ITeamService teamService, ITeamReadService teamReadService, IJoinRequestService joinRequestService, IEmailService emailService, IHubContext<ChatHub> hubContext)
        {
            _teamService = teamService;
            _teamReadService = teamReadService;
            _joinRequestService = joinRequestService;
            _emailService = emailService;
            _hubContext = hubContext;
        }

        private int GetUserId()
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(claimValue) || !int.TryParse(claimValue, out int userId))
                throw new UnauthorizedAccessException("Invalid User Token.");
            return userId;
        }

        /// <summary>
        /// Creates a new team and assigns the authenticated student as the team leader.
        /// </summary>
        /// <param name="dto">
        /// The team creation request containing team configuration details.
        /// </param>
        /// <returns>
        /// Returns the newly created team information including the generated join code.
        /// </returns>
        /// <remarks>
        /// Team creation automatically initializes the team chat workspace.
        /// A student cannot belong to more than one team.
        /// </remarks>
        [AuthorizeRoles(UserRole.Student)]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateTeamDto dto)
        {
            var userId = GetUserId();
            var result = await _teamService.CreateTeamAsync(userId, dto);
            return Ok(result);
        }

        /// <summary>
        /// Sends a request to join a specific team.
        /// </summary>
        /// <param name="dto">
        /// The join request containing the target team and optional message.
        /// </param>
        /// <returns>
        /// Returns a confirmation message after the request is submitted.
        /// </returns>
        /// <remarks>
        /// Join requests are only allowed for students
        /// who are not currently members of another team.
        /// </remarks>
        [AuthorizeRoles(UserRole.Student)]
        [HttpPost("join-request")]
        public async Task<IActionResult> JoinRequest(JoinRequestDto dto)
        {
            var userId = GetUserId();
            await _joinRequestService.RequestToJoinAsync(userId, dto);
            return Ok(new { message = "Request sent successfully." });
        }

        /// <summary>
        /// Allows the team leader to approve or reject a pending join request.
        /// </summary>
        /// <param name="dto">
        /// The request handling payload containing the target request
        /// and the approval decision.
        /// </param>
        /// <returns>
        /// Returns a confirmation message indicating the request result.
        /// </returns>
        /// <remarks>
        /// Accepting a request automatically rejects the student's
        /// other pending join requests.
        /// </remarks>
        [AuthorizeRoles(UserRole.Student)]
        [HttpPost("me/requests/{requestId:int}/handle")]
        public async Task<IActionResult> HandleJoinRequest([FromBody] HandleRequestDto dto)
        {
            var leaderId = GetUserId();
            var team = await _teamReadService.GetMyTeamAsync(leaderId);
            await _joinRequestService.HandleRequestAsync(leaderId, dto);
            if (dto.Accept && team != null)
            {
                await _hubContext.Clients.Group($"Team_{team.Id}").SendAsync("TeamUpdated");
            }
            string action = dto.Accept ? "accepted" : "denied";
            return Ok(new { message = $"The join request has been successfully {action}." });
        }

        /// <summary>
        /// Removes a member from the authenticated team leader's team.
        /// </summary>
        /// <param name="memberId">The ID of the student to remove.</param>
        /// <returns>Returns a confirmation message after the member is removed.</returns>
        [AuthorizeRoles(UserRole.Student)]
        [HttpDelete("me/members/{memberId:int}")]
        public async Task<IActionResult> RemoveMember(int memberId)
        {
            var leaderId = GetUserId();
            var teamId = await _teamService.RemoveMemberAsync(leaderId, memberId);
            await _hubContext.Clients.Group($"Team_{teamId}").SendAsync("MemberRemoved", memberId);
            return Ok(new { message = "Member removed successfully." });
        }

        /// <summary>
        /// Allows a student to leave their current team.
        /// </summary>
        /// <returns>Returns a confirmation message after leaving the team.</returns>
        [AuthorizeRoles(UserRole.Student)]
        [HttpDelete("me/leave")]
        public async Task<IActionResult> LeaveTeam()
        {
            var studentId = GetUserId();
            var team = await _teamReadService.GetMyTeamAsync(studentId);
            await _teamService.LeaveTeamAsync(studentId);
            if (team != null)
            {
                await _hubContext.Clients.Group($"Team_{team.Id}").SendAsync("MemberRemoved", studentId);
            }
            return Ok(new { message = "You have successfully left the team." });
        }

        /// <summary>
        /// Retrieves the authenticated student's current team information.
        /// </summary>
        /// <returns>
        /// Returns the team details, project information,
        /// join code, member roles, and member skills.
        /// Returns null if the student is not assigned to a team.
        /// </returns>
        [AuthorizeRoles(UserRole.Student)]
        [HttpGet("me")]
        public async Task<IActionResult> GetMyTeam()
        {
            var userId = GetUserId();
            var result = await _teamReadService.GetMyTeamAsync(userId);
            return Ok(result);
        }

        /// <summary>
        /// Allows a student to instantly join a team using a valid join code.
        /// </summary>
        /// <param name="dto">
        /// The join code request.
        /// </param>
        /// <returns>
        /// Returns the joined team, project, and chat room identifiers.
        /// </returns>
        /// <remarks>
        /// Joining a team automatically removes the student's
        /// other pending join requests.
        /// </remarks>
        [AuthorizeRoles(UserRole.Student)]
        [HttpPost("join-by-code")]
        public async Task<IActionResult> DirectJoinByCode([FromBody] DirectJoinDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.JoinCode) || dto.JoinCode.Length != 6)
                return BadRequest("Invalid join code format.");

            var userId = GetUserId();
            var result = await _teamService.DirectJoinByCodeAsync(userId, dto.JoinCode);

            await _hubContext.Clients.Group($"Team_{result.TeamId}").SendAsync("TeamUpdated");
            return Ok(result);
        }

        /// <summary>
        /// Retrieves all pending join requests for the authenticated team leader.
        /// </summary>
        /// <returns>
        /// Returns pending join requests including student academic information,
        /// skills, GPA, and request messages.
        /// </returns>
        [AuthorizeRoles(UserRole.Student)]
        [HttpGet("me/join-requests")]
        public async Task<IActionResult> GetPendingRequests()
        {
            var userId = GetUserId();
            var result = await _teamReadService.GetPendingJoinRequestsAsync(userId);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves the number of pending join requests for the authenticated team leader.
        /// </summary>
        /// <returns>
        /// Returns the total count of pending join requests.
        /// </returns>
        [HttpGet("requests/count")]
        public async Task<IActionResult> GetPendingRequestsCount()
        {
            var leaderId = GetUserId();
            var count = await _teamReadService.GetPendingRequestsCountAsync(leaderId);
            return Ok(new { Count = count });
        }

        /// <summary>
        /// Generates a new temporary join code for the authenticated leader's team.
        /// </summary>
        /// <returns>
        /// Returns the newly generated join code.
        /// </returns>
        /// <remarks>
        /// Generated join codes automatically expire after 24 hours.
        /// Only team leaders may regenerate join codes.
        /// </remarks>
        [AuthorizeRoles(UserRole.Student)]
        [HttpPost("me/join-code/generate")]
        public async Task<IActionResult> GenerateJoinCode()
        {
            var userId = GetUserId();
            var result = await _teamService.RegenerateJoinCodeAsync(userId);
            return Ok(result);
        }

        /// <summary>
        /// Sends a team invitation email containing the team's join code.
        /// </summary>
        /// <param name="request">
        /// The invitation request containing the recipient email address.
        /// </param>
        /// <returns>
        /// Returns a confirmation message after the invitation email is sent.
        /// </returns>
        /// <remarks>
        /// Only team leaders can send invitations.
        /// The invitation email includes the team's temporary join code.
        /// </remarks>
        [AuthorizeRoles(UserRole.Student)]
        [HttpPost("me/invite")]
        public async Task<IActionResult> InviteByEmail([FromBody] TeamInvitationDto request)
        {
            var userId = GetUserId();

            var team = await _teamReadService.GetMyTeamAsync(userId);

            if (team == null)
                return BadRequest("You are not currently in a team.");

            if (!team.IsLeader)
                return Unauthorized("Only the team leader can send invitations.");

            string emailBody = $@"
                <h2>You're Invited to Join a Team on InnoTrack</h2>

                <p>You have been invited to join the team:</p>

                <p><strong>{team.Name}</strong></p>

                <p>Your team join code is:</p>

                <h1>{team.JoinCode}</h1>

                <p>You can join directly from the InnoTrack platform using this code.</p>

                <br/>
                <p>Best regards,<br/>InnoTrack Team</p>";

            await _emailService.SendEmailAsync(
                request.Email,
                "InnoTrack Team Invitation",
                emailBody);

            return Ok(new { message = "Invitation email sent successfully." });
        }

        /// <summary>
        /// Renames the authenticated team leader's team.
        /// </summary>
        /// <param name="dto">The rename request containing the new team name.</param>
        /// <returns>Returns a confirmation message after the team is renamed.</returns>
        [AuthorizeRoles(UserRole.Student)]
        [HttpPatch("me/rename")]
        public async Task<IActionResult> RenameTeam([FromBody] RenameTeamDto dto)
        {
            var userId = GetUserId();
            var team = await _teamReadService.GetMyTeamAsync(userId);
            await _teamService.RenameTeamAsync(userId, dto.Name);
            if (team != null)
            {
                await _hubContext.Clients.Group($"Team_{team.Id}").SendAsync("TeamRenamed", dto.Name);
            }
            return Ok(new { message = "Team renamed successfully." });
        }

        /// <summary>
        /// Deletes the authenticated team leader's team.
        /// </summary>
        /// <returns>Returns a confirmation message after the team is deleted.</returns>
        [AuthorizeRoles(UserRole.Student)]
        [HttpDelete("me")]
        public async Task<IActionResult> DeleteTeam()
        {
            var userId = GetUserId();
            var team = await _teamReadService.GetMyTeamAsync(userId);
            await _teamService.DeleteTeamAsync(userId);
            if (team != null)
            {
                await _hubContext.Clients.Group($"Team_{team.Id}").SendAsync("TeamDeleted");
            }
            return Ok(new { message = "Team deleted successfully." });
        }

    }
}
