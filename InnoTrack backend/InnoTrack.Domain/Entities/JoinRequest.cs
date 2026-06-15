using InnoTrack.Domain.Entities.Enums;
using System.ComponentModel.DataAnnotations;

namespace InnoTrack.Domain.Entities
{
    public class JoinRequest
    {
        public int Id { get; set; }

        [Required]
        public int StudentId { get; set; }
        public Student Student { get; set; }

        [Required]
        public int TeamId { get; set; }
        public Team Team { get; set; }

        public RequestStatus Status { get; set; } = RequestStatus.Pending;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(1000)]
        public string? Message { get; set; }
    }
}
