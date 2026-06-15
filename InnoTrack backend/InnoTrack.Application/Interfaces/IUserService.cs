using InnoTrack.Application.DTOs.Users;

namespace InnoTrack.Application.Interfaces
{
    public interface IUserService
    {
        Task UpdateProfileAsync(int userId, UpdateProfileDto request);
        Task ChangePasswordAsync(int userId, ChangePasswordDto request);
        Task<string> UploadProfilePictureAsync(int userId, Stream fileStream, string fileName, string contentType, long fileSize);
        Task RemoveProfilePictureAsync(int userId);
    }
}
