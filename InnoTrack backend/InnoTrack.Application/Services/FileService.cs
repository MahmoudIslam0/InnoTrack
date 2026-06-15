using InnoTrack.Application.DTOs.Projects;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Entities.Enums;
using InnoTrack.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.Application.Services
{
    public class FileService : IFileService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly INotificationService _notificationService;

        public FileService(IUnitOfWork unitOfWork, INotificationService notificationService)
        {
            _unitOfWork = unitOfWork;
            _notificationService = notificationService;
        }
        private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".pdf", ".doc", ".docx", ".txt", ".png", ".jpg", ".jpeg", ".zip"
        };
        private static readonly long MaxFileSizeBytes = 25 * 1024 * 1024;
        public async Task<ProjectAttachmentDto> UploadFileAsync(
            Stream fileStream, string fileName, string contentType, long fileSize, int projectId, int uploaderId)
        {
            var safeFileName = Path.GetFileName(fileName);
            var extension = Path.GetExtension(safeFileName).ToLowerInvariant();

            if (!AllowedExtensions.Contains(extension))
                throw new ArgumentException($"File type '{extension}' is not allowed.");

            if (fileSize > MaxFileSizeBytes)
                throw new ArgumentException("File exceeds the maximum allowed size of 25 MB.");

            var uniqueFileName = $"{Guid.NewGuid()}_{safeFileName}";

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "private-uploads");
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var fileStreamOutput = new FileStream(filePath, FileMode.Create))
            {
                await fileStream.CopyToAsync(fileStreamOutput);
            }

            var attachment = new ProjectAttachment
            {
                FileName = uniqueFileName,
                OriginalName = fileName,
                ContentType = contentType,
                FilePath = $"/api/files/{uniqueFileName}",
                ProjectId = projectId,
                UploaderId = uploaderId,
                UploadDate = DateTime.UtcNow,
                FileSize = fileSize
            };

            await _unitOfWork.Repository<ProjectAttachment>().AddAsync(attachment);

            // Fetch project details including the supervising professor
            var project = await _unitOfWork.Repository<Project>().GetQueryable()
                .Include(p => p.Team)
                .FirstOrDefaultAsync(p => p.Id == projectId);

            // Get uploader name
            var uploaderName = "Team Member";
            var student = await _unitOfWork.Repository<Student>().GetByIdAsync(uploaderId);
            if (student != null)
            {
                uploaderName = student.FullName;
            }
            else
            {
                var professor = await _unitOfWork.Repository<Professor>().GetByIdAsync(uploaderId);
                if (professor != null)
                {
                    uploaderName = professor.FullName;
                }
            }

            // Create project activity log
            var log = new ProjectActivityLog
            {
                ProjectId = projectId,
                Type = "update",
                Message = $"File uploaded: {fileName}",
                ActorName = uploaderName,
                IconName = "FileText",
                ColorClass = "text-blue-500",
                BgClass = "bg-blue-500/10",
                Timestamp = DateTime.UtcNow
            };

            await _unitOfWork.Repository<ProjectActivityLog>().AddAsync(log);
            await _unitOfWork.CompleteAsync();

            // Broadcast activity log live
            try
            {
                await _notificationService.SendProjectActivityLogAsync(
                    projectId,
                    log.Type,
                    log.Message,
                    log.ActorName,
                    log.IconName ?? "FileText",
                    log.ColorClass ?? "text-blue-500",
                    log.BgClass ?? "bg-blue-500/10"
                );
            }
            catch { }

            // Notify supervisor if assigned
            if (project?.Team?.ProfessorId != null)
            {
                try
                {
                    await _notificationService.SendNotificationAsync(
                        userId: project.Team.ProfessorId.Value,
                        title: "New File Uploaded",
                        message: $"A new file '{fileName}' was uploaded to project '{project.Title}' by {uploaderName}.",
                        type: NotificationType.Info,
                        referenceId: project.Id,
                        referenceType: ReferenceType.Project
                    );
                }
                catch { }
            }

            return new ProjectAttachmentDto(attachment.Id, attachment.OriginalName, attachment.FilePath);
        }

        public async Task<ProjectAttachment> GetAttachmentIfAuthorizedAsync(int attachmentId, int userId)
        {
            var attachment = await _unitOfWork.Repository<ProjectAttachment>().GetByIdAsync(attachmentId);
            if (attachment == null)
                throw new KeyNotFoundException("Attachment not found.");

            var project = await _unitOfWork.Repository<Project>().GetByIdAsync(attachment.ProjectId);
            if (project == null) throw new KeyNotFoundException("Project not found.");

            var isMember = await _unitOfWork.Repository<TeamMember>()
                .FindAsync(tm => tm.TeamId == project.TeamId && tm.StudentId == userId);
            if (isMember == null)
                throw new UnauthorizedAccessException("You are not authorized to download this file. Only team members can access it.");

            return attachment;
        }
    }
}
