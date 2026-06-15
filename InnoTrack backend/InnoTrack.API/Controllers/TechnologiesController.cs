using InnoTrack.API.Attributes;
using InnoTrack.Application.DTOs.Lookups;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities.Enums;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace InnoTrack.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TechnologiesController : ControllerBase
    {
        private readonly ITechnologyService _technologyService;
        private readonly IAuditService _auditService;

        public TechnologiesController(ITechnologyService technologyService, IAuditService auditService)
        {
            _technologyService = technologyService;
            _auditService = auditService;
        }

        private int GetAdminId()
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(claimValue) || !int.TryParse(claimValue, out int adminId))
            {
                throw new UnauthorizedAccessException("Invalid User Token.");
            }
            return adminId;
        }

        /// <summary>
        /// Retrieves a paginated list of all available technologies.
        /// </summary>
        /// <param name="pageNumber">
        /// The page number to retrieve. Default value is 1.
        /// </param>
        /// <param name="pageSize">
        /// The number of technologies per page. Default value is 10.
        /// </param>
        /// <returns>
        /// Returns a paginated collection of technologies.
        /// </returns>
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            return Ok(await _technologyService.GetAllTechnologiesAsync(pageNumber, pageSize));
        }

        /// <summary>
        /// Retrieves a technology by its unique identifier.
        /// </summary>
        /// <param name="id">
        /// The technology identifier.
        /// </param>
        /// <returns>
        /// Returns the technology details if found.
        /// </returns>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            return Ok(await _technologyService.GetTechnologyByIdAsync(id));
        }

        /// <summary>
        /// Creates a new technology entry and records the action in the audit logs.
        /// </summary>
        /// <param name="request">
        /// The technology creation request.
        /// </param>
        /// <returns>
        /// Returns the newly created technology.
        /// </returns>
        [AuthorizeRoles(UserRole.Admin, UserRole.Student)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTechnologyDto request)
        {
            var result = await _technologyService.CreateTechnologyAsync(request);

            var userId = int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var parsedUserId)
                ? parsedUserId
                : 0;

            if (userId > 0)
            {
                _auditService.LogAction(
                    userId,
                    "Created Technology",
                    $"User created a new Technology with ID: {result.Id}");
            }

            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        /// <summary>
        /// Updates an existing technology and records the action in the audit logs.
        /// </summary>
        /// <param name="id">
        /// The identifier of the technology to update.
        /// </param>
        /// <param name="request">
        /// The updated technology information.
        /// </param>
        /// <returns>
        /// Returns no content after the technology is successfully updated.
        /// </returns>
        [AuthorizeRoles(UserRole.Admin)]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateTechnologyDto request)
        {
            await _technologyService.UpdateTechnologyAsync(id, request);

            var adminId = GetAdminId();
            _auditService.LogAction(
                adminId,
                "Updated Technology",
                $"Admin updated Technology with ID: {id}");

            return NoContent();
        }

        /// <summary>
        /// Deletes a technology and records the action in the audit logs.
        /// </summary>
        /// <param name="id">
        /// The identifier of the technology to delete.
        /// </param>
        /// <returns>
        /// Returns no content after the technology is successfully deleted.
        /// </returns>
        [AuthorizeRoles(UserRole.Admin)]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _technologyService.DeleteTechnologyAsync(id);

            var adminId = GetAdminId();
            _auditService.LogAction(
                adminId,
                "Deleted Technology",
                $"Admin deleted Technology with ID: {id}");

            return NoContent();
        }
    }
}
