using InnoTrack.Application.DTOs.Users;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Interfaces;

namespace InnoTrack.Application.Services
{
    public class UserService : IUserService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IPasswordHasher _passwordHasher;

        public UserService(IUnitOfWork unitOfWork, IPasswordHasher passwordHasher)
        {
            _unitOfWork = unitOfWork;
            _passwordHasher = passwordHasher;
        }

        public async Task UpdateProfileAsync(int userId, UpdateProfileDto request)
        {
            var user = await _unitOfWork.Repository<User>().GetByIdAsync(userId);
            if (user == null) throw new KeyNotFoundException("User not found.");

            user.FirstName = request.FirstName;
            user.LastName = request.LastName;
            if (user is Student student)
            {
                student.DepartmentId = request.DepartmentId;
                student.GraduationYear = request.GraduationYear;
            }
            else if (user is Professor professor)
            {
                professor.DepartmentId = request.DepartmentId;
            }

            _unitOfWork.Repository<User>().Update(user);
            await _unitOfWork.CompleteAsync();
        }

        public async Task ChangePasswordAsync(int userId, ChangePasswordDto request)
        {
            var user = await _unitOfWork.Repository<User>().GetByIdAsync(userId);
            if (user == null)
                throw new KeyNotFoundException("User not found.");

            if (!_passwordHasher.Verify(request.OldPassword, user.PasswordHash))
                throw new ArgumentException("Incorrect old password.");

            user.PasswordHash = _passwordHasher.Hash(request.NewPassword);

            _unitOfWork.Repository<User>().Update(user);
            await _unitOfWork.CompleteAsync();
        }

        private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".png", ".jpg", ".jpeg", ".webp"
        };
        private static readonly long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB

        public async Task<string> UploadProfilePictureAsync(int userId, Stream fileStream, string fileName, string contentType, long fileSize)
        {
            var user = await _unitOfWork.Repository<User>().GetByIdAsync(userId);
            if (user == null)
                throw new KeyNotFoundException("User not found.");

            var safeFileName = Path.GetFileName(fileName);
            var extension = Path.GetExtension(safeFileName).ToLowerInvariant();

            if (!AllowedExtensions.Contains(extension))
                throw new ArgumentException($"File type '{extension}' is not allowed for profile pictures.");

            if (fileSize > MaxFileSizeBytes)
                throw new ArgumentException("File exceeds the maximum allowed size of 5 MB.");

            var uniqueFileName = $"{Guid.NewGuid()}_{safeFileName}";
            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "profiles");

            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var fileStreamOutput = new FileStream(filePath, FileMode.Create))
            {
                await fileStream.CopyToAsync(fileStreamOutput);
            }

            var relativePath = $"/uploads/profiles/{uniqueFileName}";
            user.ProfilePictureURL = relativePath;

            _unitOfWork.Repository<User>().Update(user);
            await _unitOfWork.CompleteAsync();

            return relativePath;
        }

        public async Task RemoveProfilePictureAsync(int userId)
        {
            var user = await _unitOfWork.Repository<User>().GetByIdAsync(userId);
            if (user == null)
                throw new KeyNotFoundException("User not found.");

            if (!string.IsNullOrEmpty(user.ProfilePictureURL))
            {
                var currentDir = Directory.GetCurrentDirectory();
                // ProfilePictureURL is typically /uploads/profiles/file.png
                // We need to convert it to a physical path
                var relativePath = user.ProfilePictureURL.TrimStart('/');
                var filePath = Path.Combine(currentDir, relativePath);

                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                }

                user.ProfilePictureURL = null;
                _unitOfWork.Repository<User>().Update(user);
                await _unitOfWork.CompleteAsync();
            }
        }
    }
}
