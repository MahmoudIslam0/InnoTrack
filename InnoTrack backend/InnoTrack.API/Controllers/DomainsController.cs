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
    public class DomainsController : ControllerBase
    {
        private readonly IDomainService _domainService;
        private readonly IAuditService _auditService;

        public DomainsController(IDomainService domainService, IAuditService auditService)
        {
            _domainService = domainService;
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
        /// Retrieves a paginated list of all project domains.
        /// </summary>
        /// <param name="pageNumber">
        /// The page number to retrieve. Default value is 1.
        /// </param>
        /// <param name="pageSize">
        /// The number of domains per page. Default value is 10.
        /// </param>
        /// <returns>
        /// Returns a paginated collection of project domains.
        /// </returns>
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            return Ok(await _domainService.GetAllDomainsAsync(pageNumber, pageSize));
        }

        /// <summary>
        /// Retrieves a project domain by its unique identifier.
        /// </summary>
        /// <param name="id">The domain identifier.</param>
        /// <returns>
        /// Returns the domain details if found.
        /// </returns>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            return Ok(await _domainService.GetDomainByIdAsync(id));
        }

        /// <summary>
        /// Creates a new project domain and records the action in the audit logs.
        /// </summary>
        /// <param name="request">
        /// The domain creation request containing the domain name and description.
        /// </param>
        /// <returns>
        /// Returns the newly created domain.
        /// </returns>
        [AuthorizeRoles(UserRole.Admin)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateDomainDto request)
        {
            var result = await _domainService.CreateDomainAsync(request);

            var adminId = GetAdminId();
            _auditService.LogAction(
                adminId,
                "Created Domain",
                $"Admin created a new Domain with ID: {result.Id}");

            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        /// <summary>
        /// Updates an existing project domain and records the action in the audit logs.
        /// </summary>
        /// <param name="id">The identifier of the domain to update.</param>
        /// <param name="request">
        /// The updated domain information.
        /// </param>
        /// <returns>
        /// Returns no content after the domain is successfully updated.
        /// </returns>
        [AuthorizeRoles(UserRole.Admin)]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateDomainDto request)
        {
            await _domainService.UpdateDomainAsync(id, request);

            var adminId = GetAdminId();
            _auditService.LogAction(
                adminId,
                "Updated Domain",
                $"Admin updated Domain with ID: {id}");

            return NoContent();
        }

        /// <summary>
        /// Deletes a project domain and records the action in the audit logs.
        /// </summary>
        /// <param name="id">The identifier of the domain to delete.</param>
        /// <returns>
        /// Returns no content after the domain is successfully deleted.
        /// </returns>
        [AuthorizeRoles(UserRole.Admin)]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _domainService.DeleteDomainAsync(id);

            var adminId = GetAdminId();
            _auditService.LogAction(
                adminId,
                "Deleted Domain",
                $"Admin deleted Domain with ID: {id}");

            return NoContent();
        }

    }
}
