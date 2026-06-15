using InnoTrack.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace InnoTrack.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class FilesController : ControllerBase
    {
        private readonly IFileService _fileService;
        private readonly IWebHostEnvironment _env;

        public FilesController(IFileService fileService, IWebHostEnvironment env)
        {
            _fileService = fileService;
            _env = env;
        }

        /// <summary>
        /// Downloads a project attachment if the authenticated user is authorized to access it.
        /// </summary>
        /// <param name="attachmentId">
        /// The identifier of the attachment to download.
        /// </param>
        /// <returns>
        /// Returns the requested file if the user belongs to the associated project team.
        /// </returns>
        [HttpGet("{attachmentId:int}")]
        public async Task<IActionResult> Download(int attachmentId)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var attachment = await _fileService.GetAttachmentIfAuthorizedAsync(attachmentId, userId);
            var fullPath = Path.Combine(_env.ContentRootPath, "private-uploads", attachment.FileName);

            if (!System.IO.File.Exists(fullPath))
                return NotFound("The physical file was not found on the server.");

            return PhysicalFile(fullPath, attachment.ContentType ?? "application/octet-stream", attachment.OriginalName);
        }
    }
}
