using InnoTrack.Application.DTOs.Projects;
using InnoTrack.Domain.Entities;

namespace InnoTrack.Application.Interfaces
{
    public interface IFileService
    {
        Task<ProjectAttachmentDto> UploadFileAsync(
                    Stream fileStream,
                    string fileName,
                    string contentType,
                    long fileSize,
                    int projectId,
                    int uploaderId);

        Task<ProjectAttachment> GetAttachmentIfAuthorizedAsync(int attachmentId, int userId);
    }
}
