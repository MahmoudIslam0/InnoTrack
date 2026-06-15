using InnoTrack.API.Attributes;
using InnoTrack.Application.DTOs.Projects;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities.Enums;
using InnoTrack.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
//using System.Reflection.Metadata;
using System.Security.Claims;

namespace InnoTrack.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProjectsController : ControllerBase
    {
        private readonly IProjectService _projectService;
        private readonly IFileService _fileService;
        private readonly IProjectAnalysisService _projectAnalysisService;
        private readonly IUnitOfWork _unitOfWork;

        public ProjectsController(IProjectService projectService, IFileService fileService, IProjectAnalysisService projectAnalysisService, IUnitOfWork unitOfWork)
        {
            _projectService = projectService;
            _fileService = fileService;
            _projectAnalysisService = projectAnalysisService;
            _unitOfWork = unitOfWork;
        }

        /// <summary>
        /// Uploads a project attachment file for the specified project.
        /// </summary>
        /// <param name="projectId">
        /// The identifier of the target project.
        /// </param>
        /// <param name="file">
        /// The file to upload.
        /// </param>
        /// <returns>
        /// Returns the uploaded attachment metadata including file identifier and access path.
        /// </returns>
        /// <remarks>
        /// Supported file types include documents, images, and compressed archives.
        /// File uploads are limited to 25 MB.
        /// </remarks>
        [HttpPost("{projectId}/upload")]
        [AuthorizeRoles(UserRole.Student)]
        public async Task<IActionResult> UploadAttachment(int projectId, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file was uploaded.");

            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            using var stream = file.OpenReadStream();
            var attachment = await _fileService.UploadFileAsync(
                stream,
                file.FileName,
                file.ContentType,
                file.Length,
                projectId,
                userId
            );

            return Ok(attachment);
        }

        /// <summary>
        /// Submits a project proposal for AI originality analysis and professor review.
        /// </summary>
        /// <param name="projectId">
        /// The identifier of the project to submit.
        /// </param>
        /// <param name="dto">
        /// The submission request containing supervisor assignment
        /// and proposal-related metadata.
        /// </param>
        /// <returns>
        /// Returns a confirmation message after successful submission.
        /// </returns>
        /// <remarks>
        /// Only team leaders may submit projects.
        /// The submission automatically triggers asynchronous AI originality analysis.
        /// </remarks>
        [HttpPost("{projectId}/submit")]
        [AuthorizeRoles(UserRole.Student)]
        public async Task<IActionResult> SubmitProject(int projectId, [FromBody] SubmitProjectRequestDto dto)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await _projectService.VerifyProjectForSubmissionAsync(projectId, userId, dto);
            return Ok(new { message = "Project submitted successfully. AI is generating the originality report." });
        }

        /// <summary>
        /// Generates and securely downloads the AI originality analysis report as a PDF document.
        /// Access is strictly restricted: ONLY the designated Team Leader or the assigned Supervisor can generate/download this report (Protected against IDOR).
        /// </summary>
        /// <param name="projectId">
        /// The identifier of the analyzed project.
        /// </param>
        /// <returns>
        /// Returns a downloadable PDF containing originality scores, AI analysis summary, and similar projects with its similarity percentage.
        /// </returns>
        /// <remarks>
        /// The report is dynamically generated using QuestPDF based on the stored AI analysis results. 
        /// Validates user roles and team associations dynamically from the JWT claims before processing.
        /// </remarks>
        /// <response code="200">Returns the generated PDF file.</response>
        /// <response code="401">If the user token is invalid or missing.</response>
        /// <response code="403">If the user is not the Team Leader or the assigned Supervisor for this specific project.</response>
        /// <response code="404">If the project or its AI analysis report does not exist.</response>        
        [HttpGet("{projectId}/originality-report/pdf")]
        [AuthorizeRoles(UserRole.Student, UserRole.Professor)]
        public async Task<IActionResult> DownloadReportPdf(int projectId)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var role = User.FindFirstValue(ClaimTypes.Role);

            if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out int userId))
                return Unauthorized("Invalid User Token.");

            var report = await _projectAnalysisService.GetOriginalityReportAsync(projectId, userId, role);

            var egyptTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Egypt Standard Time");
            var localGeneratedAt = TimeZoneInfo.ConvertTimeFromUtc(report.GeneratedAt, egyptTimeZone);

            var pdfDocument = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(2, Unit.Centimetre);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(11).FontFamily(Fonts.Arial));

                    page.Header().BorderBottom(2).BorderColor(Colors.Blue.Darken2).PaddingBottom(10).Row(row =>
                    {
                        row.RelativeItem().Column(col =>
                        {
                            col.Item().Text("InnoTrack System").FontSize(24).SemiBold().FontColor(Colors.Blue.Darken3);
                            col.Item().Text("Official AI Originality Report").FontSize(14).FontColor(Colors.Grey.Medium);
                        });
                        row.ConstantItem(100).AlignRight().Text($"#{report.ProjectId:D4}").FontSize(20).SemiBold().FontColor(Colors.Grey.Lighten1);
                    });

                    page.Content().PaddingVertical(15).Column(col =>
                    {
                        col.Item().Background(Colors.Grey.Lighten4).Padding(10).Column(inner =>
                        {
                            inner.Item().Text($"Project Title: {report.ProjectTitle}").SemiBold().FontSize(14);
                            inner.Item().Text($"Team: {report.TeamName}");
                            inner.Item().Text($"Supervisor: {report.SupervisorName ?? "Not Assigned"}");
                            inner.Item().Text($"Generated On: {localGeneratedAt:MMMM dd, yyyy - HH:mm}");
                        });

                        col.Item().PaddingVertical(15).LineHorizontal(1).LineColor(Colors.Grey.Lighten3);

                        var scoreColor = report.OverallScore >= 80 ? Colors.Green.Medium :
                                         report.OverallScore >= 50 ? Colors.Orange.Medium : Colors.Red.Medium;

                        var scoreVerdict = report.OverallScore >= 80 ? "Excellent Originality" :
                                           report.OverallScore >= 50 ? "Needs Review (Moderate Similarity)" :
                                           "High Similarity Detected (Warning)";

                        col.Item().AlignCenter().Column(inner =>
                        {
                            inner.Item().AlignCenter().Text("Overall Originality Score").FontSize(16).SemiBold();
                            inner.Item().AlignCenter().Text($"{report.OverallScore}%").FontSize(35).Black().FontColor(scoreColor);
                            inner.Item().AlignCenter().Text(scoreVerdict).FontSize(14).FontColor(scoreColor).SemiBold();
                        });

                        col.Item().PaddingVertical(15).LineHorizontal(1).LineColor(Colors.Grey.Lighten3);

                        col.Item().PaddingBottom(5).Text("AI Analysis Summary").FontSize(16).SemiBold().FontColor(Colors.Blue.Darken2);
                        col.Item().Background(Colors.Blue.Lighten5).BorderLeft(4).BorderColor(Colors.Blue.Medium).Padding(10)
                            .Text(report.Summary).FontSize(12).FontColor(Colors.Black);

                        col.Item().PaddingVertical(15);

                        col.Item().PaddingBottom(5).Text("Internal System Matches").FontSize(16).SemiBold().FontColor(Colors.Blue.Darken2);

                        if (report.SimilarProjects != null && report.SimilarProjects.Any())
                        {
                            col.Item().Table(table =>
                            {
                                table.ColumnsDefinition(columns =>
                                {
                                    columns.ConstantColumn(60);
                                    columns.RelativeColumn();
                                    columns.ConstantColumn(100);
                                });

                                table.Header(header =>
                                {
                                    header.Cell().Background(Colors.Grey.Darken3).Padding(5).Text("ID").FontColor(Colors.White).SemiBold();
                                    header.Cell().Background(Colors.Grey.Darken3).Padding(5).Text("Project Title").FontColor(Colors.White).SemiBold();
                                    header.Cell().Background(Colors.Grey.Darken3).Padding(5).Text("Match %").FontColor(Colors.White).SemiBold();
                                });

                                foreach (var sp in report.SimilarProjects)
                                {
                                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5).Text($"#{sp.Id}");
                                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5).Text(sp.Title);
                                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5).Text($"{sp.Similarity}%").FontColor(sp.Similarity > 40 ? Colors.Red.Medium : Colors.Black).SemiBold();
                                }
                            });
                        }
                        else
                        {
                            col.Item().Background(Colors.Grey.Lighten4).BorderLeft(4).BorderColor(Colors.Grey.Medium).Padding(10)
                                .Text("No similar projects found in the university database. Any low originality score above is likely due to external sources.")
                                .FontColor(Colors.Grey.Darken2).Italic();
                        }
                    });

                    page.Footer().AlignCenter().Text(x =>
                    {
                        x.Span("Page ");
                        x.CurrentPageNumber();
                        x.Span(" of ");
                        x.TotalPages();
                    });
                });
            });

            byte[] pdfBytes = pdfDocument.GeneratePdf();
            return File(pdfBytes, "application/pdf", $"OriginalityReport_PRJ{projectId}.pdf");
        }

        [HttpGet("{projectId}/logs")]
        [AuthorizeRoles(UserRole.Professor)]
        public async Task<IActionResult> GetProjectLogs(int projectId)
        {
            var logs = await _projectService.GetProjectLogsAsync(projectId);
            return Ok(logs);
        }

        [HttpPost("{projectId}/mute")]
        [AuthorizeRoles(UserRole.Professor)]
        public async Task<IActionResult> ToggleProjectMute(int projectId)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await _projectService.ToggleProjectMuteAsync(userId, projectId);
            return Ok(new { message = "Project mute state toggled successfully." });
        }
    }
}
