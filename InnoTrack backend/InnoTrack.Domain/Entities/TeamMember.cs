using InnoTrack.Domain.Entities.Enums;
using System.ComponentModel.DataAnnotations;

namespace InnoTrack.Domain.Entities
{
    public class TeamMember
    {
        public int Id { get; set; }

        [Required]
        public int TeamId { get; set; }
        public Team Team { get; set; }

        [Required]
        public int StudentId { get; set; }
        public Student Student { get; set; }

        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public TeamMemberRole Role { get; set; }
    }
}
