using InnoTrack.API.Attributes;
using InnoTrack.Application.DTOs.AI;
using InnoTrack.Application.DTOs.Projects;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace InnoTrack.API.Controllers
{
    [Route("api/projects")]
    [ApiController]
    [Authorize]
    public class ProjectCatalogController : ControllerBase
    {
        private readonly IProjectCatalogService _catalogService;

        public ProjectCatalogController(IProjectCatalogService catalogService)
        {
            _catalogService = catalogService;
        }

        private int GetUserId()
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(claimValue) || !int.TryParse(claimValue, out int userId))
                throw new UnauthorizedAccessException("Invalid User Token.");
            return userId;
        }

        /// <summary>
        /// Retrieves the project catalog with support for advanced filtering,
        /// searching, pagination, and academic-year classification.
        /// </summary>
        /// <param name="filter">
        /// The filtering criteria including domain, supervisor, technology,
        /// status, originality score, search keywords, and academic year.
        /// </param>
        /// <param name="pageNumber">
        /// The page number to retrieve. Default value is 1.
        /// </param>
        /// <param name="pageSize">
        /// The number of projects per page. Default value is 10.
        /// </param>
        /// <returns>
        /// Returns a paginated list of publicly visible projects excluding drafts and rejected projects.
        /// </returns>
        [HttpGet]
        public async Task<IActionResult> GetProjects(
            [FromQuery] ProjectCatalogFilterDto filter,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _catalogService.GetProjectsAsync(filter, pageNumber, pageSize);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves complete details for a specific project in the catalog.
        /// </summary>
        /// <param name="projectId">
        /// The identifier of the project.
        /// </param>
        /// <returns>
        /// Returns detailed project information including team members,
        /// supervisor, technologies, originality score, and academic metadata.
        /// </returns>
        [HttpGet("{projectId:int}")]
        public async Task<IActionResult> GetProjectById(int projectId)
        {
            int? userId = null;
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrEmpty(claimValue) && int.TryParse(claimValue, out int parsedUserId))
                userId = parsedUserId;

            var result = await _catalogService.GetProjectByIdAsync(projectId, userId);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves all available supervisors along with their department
        /// and current supervision workload information.
        /// </summary>
        /// <returns>
        /// Returns a list of professors available for project supervision.
        /// </returns>
        [HttpGet("supervisors")]
        public async Task<IActionResult> GetSupervisors([FromQuery] int? departmentId = null)
        {
            var result = await _catalogService.GetSupervisorsAsync(departmentId);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves the authenticated student's current project and team information.
        /// </summary>
        /// <returns>
        /// Returns the student's project details, team members, technologies,
        /// supervisor information, originality score, and project status.
        /// </returns>
        [HttpGet("me")]
        [AuthorizeRoles(UserRole.Student)]
        public async Task<IActionResult> GetMyProject()
        {
            var userId = GetUserId();
            var result = await _catalogService.GetMyProjectAsync(userId);
            return Ok(result);
        }

        [HttpGet("drafts")]
        [AuthorizeRoles(UserRole.Student)]
        public async Task<IActionResult> GetMyDrafts()
        {
            var userId = GetUserId();
            var result = await _catalogService.GetMyDraftsAsync(userId);
            return Ok(result);
        }

        [HttpGet("drafts/{draftId:int}")]
        [AuthorizeRoles(UserRole.Student)]
        public async Task<IActionResult> GetDraftById(int draftId)
        {
            var userId = GetUserId();
            var result = await _catalogService.GetDraftByIdAsync(draftId, userId);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves the number of projects grouped by current academic year
        /// and previous academic years.
        /// </summary>
        /// <returns>
        /// Returns catalog statistics for project tab navigation.
        /// </returns>
        [HttpGet("tabs-count")]
        public async Task<IActionResult> GetTabsCount()
        {
            var counts = await _catalogService.GetCatalogTabsCountAsync();
            return Ok(counts);
        }

        /// <summary>
        /// Creates a new project draft for the authenticated team leader.
        /// </summary>
        /// <param name="dto">
        /// The draft project information including project details,
        /// technologies, and academic content.
        /// </param>
        /// <returns>
        /// Returns the newly created draft project information.
        /// </returns>
        /// <remarks>
        /// Only team leaders can create project drafts,
        /// and each team may own only one project.
        /// </remarks>
        [HttpPost("drafts")]
        [AuthorizeRoles(UserRole.Student)]
        public async Task<IActionResult> SaveDraft([FromBody] SaveProjectDraftDto dto)
        {
            var userId = GetUserId();
            var result = await _catalogService.SaveDraftAsync(userId, dto);
            return CreatedAtAction(nameof(GetProjectById), new { projectId = result.Id }, result);
        }

        /// <summary>
        /// Updates an existing draft project owned by the authenticated team leader.
        /// </summary>
        /// <param name="draftId">
        /// The identifier of the draft project.
        /// </param>
        /// <param name="dto">
        /// The updated draft project information.
        /// </param>
        /// <returns>
        /// Returns the updated draft information.
        /// </returns>
        /// <remarks>
        /// Updating core textual content automatically resets
        /// the originality score to require re-analysis.
        /// </remarks>
        [HttpPut("drafts/{draftId:int}")]
        [AuthorizeRoles(UserRole.Student)]
        public async Task<IActionResult> UpdateDraft(int draftId, [FromBody] SaveProjectDraftDto dto)
        {
            var userId = GetUserId();
            var result = await _catalogService.UpdateDraftAsync(draftId, userId, dto);
            return Ok(result);
        }

        /// <summary>
        /// Permanently deletes a draft project owned by the authenticated team leader.
        /// </summary>
        /// <param name="draftId">
        /// The identifier of the draft project.
        /// </param>
        /// <returns>
        /// Returns no content after the draft is successfully deleted.
        /// </returns>
        /// <remarks>
        /// Only projects in Draft status can be deleted.
        /// </remarks>
        [HttpDelete("drafts/{draftId:int}")]
        [AuthorizeRoles(UserRole.Student)]
        public async Task<IActionResult> DeleteDraft(int draftId)
        {
            var userId = GetUserId();
            await _catalogService.DeleteDraftAsync(draftId, userId);
            return NoContent();
        }

        /// <summary>
        /// Performs an AI-powered similarity and originality analysis on project content.
        /// </summary>
        /// <param name="dto">
        /// The project content used for redundancy and similarity analysis.
        /// </param>
        /// <returns>
        /// Returns the originality score and a list of similar existing projects.
        /// </returns>
        /// <remarks>
        /// This endpoint integrates with the Python AI microservice
        /// responsible for redundancy reduction and similarity detection.
        /// </remarks>
        [HttpPost("similarity-check")]
        [AuthorizeRoles(UserRole.Student)]
        public async Task<IActionResult> RunSimilarityCheck([FromBody] SimilarityCheckRequestDto dto)
        {
            var result = await _catalogService.RunSimilarityCheckAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Updates project details while automatically enforcing
        /// workflow editing restrictions based on project status.
        /// </summary>
        /// <param name="projectId">
        /// The identifier of the project to update.
        /// </param>
        /// <param name="dto">
        /// The updated project details.
        /// </param>
        /// <returns>
        /// Returns a success message after the project is updated.
        /// </returns>
        /// <remarks>
        /// Limited editing mode is automatically applied for projects
        /// currently in progress.
        /// </remarks>
        [HttpPatch("{projectId:int}/details")]
        [AuthorizeRoles(UserRole.Student)]
        public async Task<IActionResult> UpdateProjectDetails(int projectId, [FromBody] UpdateProjectDetailsDto dto)
        {
            var userId = GetUserId();
            await _catalogService.UpdateProjectDetailsAsync(projectId, userId, dto);
            return Ok(new { message = "Project details updated successfully." });
        }

        /// <summary>
        /// Recalls a submitted project and returns it to Draft status.
        /// </summary>
        /// <param name="projectId">
        /// The identifier of the submitted project.
        /// </param>
        /// <returns>
        /// Returns the updated project status after recall.
        /// </returns>
        /// <remarks>
        /// Only projects currently under review may be recalled.
        /// </remarks>
        [HttpDelete("{projectId:int}/submission")]
        [AuthorizeRoles(UserRole.Student)]
        public async Task<IActionResult> RecallSubmission(int projectId)
        {
            var userId = GetUserId();
            await _catalogService.RecallSubmissionAsync(projectId, userId);
            return Ok(new { projectId, status = "draft" });
        }

        /// <summary>
        /// Retrieves a list of top-rated completed projects approved for public showcase.
        /// </summary>
        /// <remarks>
        /// This endpoint is completely public (AllowAnonymous). It allows external visitors, 
        /// companies, and other students to browse the university's best graduation projects.
        /// </remarks>
        /// <returns>A list of showcased projects containing basic details and team members.</returns>
        /// <response code="200">Returns the list of showcased projects successfully.</response>
        [AllowAnonymous]
        [HttpGet("showcase")]
        public async Task<IActionResult> GetPublicShowcase()
        {
            var showcaseProjects = await _catalogService.GetPublicShowcaseAsync();
            return Ok(showcaseProjects);
        }

        /// <summary>
        /// Generates an academic project abstract using the AI service.
        /// </summary>
        /// <param name="dto">
        /// The project details used for AI abstract generation.
        /// </param>
        /// <returns>
        /// Returns an AI-generated academic abstract.
        /// </returns>
        /// <remarks>
        /// Only team leaders may generate AI abstracts,
        /// and sufficient project details must be provided.
        /// </remarks>
        [HttpPost("generate-abstract")]
        [AuthorizeRoles(UserRole.Student)]
        public async Task<IActionResult> GenerateAbstract([FromBody] GenerateAbstractRequestDto dto)
        {
            var userId = GetUserId();
            var generatedAbstract = await _catalogService.GenerateAiAbstractAsync(userId, dto);
            return Ok(new { Abstract = generatedAbstract });
        }

        /// <summary>
        /// Permanently marks a project as abandoned and notifies team members and supervisors.
        /// </summary>
        /// <param name="projectId">
        /// The identifier of the project to abandon.
        /// </param>
        /// <param name="request">
        /// The abandonment request containing the reason for abandoning the project.
        /// </param>
        /// <returns>
        /// Returns a confirmation message after the project is abandoned.
        /// </returns>
        /// <remarks>
        /// Only the team leader may abandon a project.
        /// Completed projects cannot be abandoned.
        /// </remarks>
        [HttpPost("{projectId:int}/abandon")]
        [AuthorizeRoles(UserRole.Student)]
        public async Task<IActionResult> AbandonProject(int projectId, [FromBody] AbandonProjectRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Reason))
                return BadRequest("A reason for abandoning the project is required.");

            var userId = GetUserId();
            await _catalogService.AbandonProjectAsync(projectId, userId, request.Reason);
            return Ok(new { message = "Project has been marked as abandoned." });
        }
    }
}
