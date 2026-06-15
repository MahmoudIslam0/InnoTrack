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
    public class DepartmentsController : ControllerBase
    {
        private readonly IDepartmentService _departmentService;
        private readonly IAuditService _auditService;
        public DepartmentsController(IDepartmentService departmentService, IAuditService auditService)
        {
            _departmentService = departmentService;
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
        /// Retrieves a paginated list of all departments.
        /// </summary>
        /// <param name="pageNumber">
        /// The page number to retrieve. Default value is 1.
        /// </param>
        /// <param name="pageSize">
        /// The number of departments per page. Default value is 10.
        /// </param>
        /// <returns>
        /// Returns a paginated collection of departments.
        /// </returns>
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            var result = await _departmentService.GetAllDepartmentsAsync(pageNumber, pageSize);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves a department by its unique identifier.
        /// </summary>
        /// <param name="id">The department identifier.</param>
        /// <returns>
        /// Returns the department details if found.
        /// </returns>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _departmentService.GetDepartmentByIdAsync(id);
            return Ok(result);
        }

        /// <summary>
        /// Creates a new department and records the action in the audit logs.
        /// </summary>
        /// <param name="request">
        /// The department creation request containing the department name and code.
        /// </param>
        /// <returns>
        /// Returns the newly created department.
        /// </returns>
        [AuthorizeRoles(UserRole.Admin)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateDepartmentDto request)
        {
            var result = await _departmentService.CreateDepartmentAsync(request);

            var adminId = GetAdminId();
            _auditService.LogAction(
                adminId,
                "Created Department",
                $"Admin created a new Department with ID: {result.Id}");

            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        /// <summary>
        /// Updates an existing department and records the action in the audit logs.
        /// </summary>
        /// <param name="id">The identifier of the department to update.</param>
        /// <param name="request">
        /// The updated department information.
        /// </param>
        /// <returns>
        /// Returns no content after the department is successfully updated.
        /// </returns>
        [AuthorizeRoles(UserRole.Admin)]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateDepartmentDto request)
        {
            await _departmentService.UpdateDepartmentAsync(id, request);

            var adminId = GetAdminId();
            _auditService.LogAction(
                adminId,
                "Updated Department",
                $"Admin updated Department with ID: {id}");

            return NoContent();
        }

        /// <summary>
        /// Deletes a department and records the action in the audit logs.
        /// </summary>
        /// <param name="id">The identifier of the department to delete.</param>
        /// <returns>
        /// Returns no content after the department is successfully deleted.
        /// </returns>
        [AuthorizeRoles(UserRole.Admin)]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            //In the future, check if department has students at it or not
            await _departmentService.DeleteDepartmentAsync(id);

            var adminId = GetAdminId();
            _auditService.LogAction(
                adminId,
                "Deleted Department",
                $"Admin deleted Department with ID: {id}");

            return NoContent();
        }

    }
}
