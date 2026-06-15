using InnoTrack.Domain.Entities.Enums;
using System.ComponentModel.DataAnnotations;

namespace InnoTrack.Domain.Entities
{
    public class User
    {
        public int Id { get; set; }

        [Required, EmailAddress, MaxLength(255)]
        public string Email { get; set; }

        [Required, MaxLength(100)]
        public string PasswordHash { get; set; }

        [Required, MaxLength(50)]
        public string FirstName { get; set; }
        [Required, MaxLength(50)]
        public string LastName { get; set; }
        public string FullName => $"{FirstName} {LastName}";

        public bool IsActive { get; set; } = true;
        public bool IsDeleted { get; set; } = false;

        [MaxLength(2048)]
        public string? ProfilePictureURL { get; set; }
        [MaxLength(7)]
        public string? ProfileBannerColor { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastOnlineAt { get; set; }

        [Required]
        public UserRole Role { get; set; }

        [MaxLength(512)]
        public string? RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiryTime { get; set; }

        public string? ResetPasswordToken { get; set; }
        public DateTime? ResetPasswordTokenExpiry { get; set; }

    }
}
