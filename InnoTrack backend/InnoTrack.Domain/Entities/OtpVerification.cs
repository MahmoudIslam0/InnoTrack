using System;

namespace InnoTrack.Domain.Entities
{
    public class OtpVerification
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string OtpHash { get; set; } = string.Empty;
        public DateTime ExpiryTime { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsUsed { get; set; }

        public bool IsExpired => DateTime.UtcNow > ExpiryTime;
    }
}
