using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InnoTrack.Domain.Entities
{
    public class ProjectActivityLog
    {
        public int Id { get; set; }
        
        [Required]
        public int ProjectId { get; set; }
        
        [ForeignKey(nameof(ProjectId))]
        public Project Project { get; set; } = null!;

        [Required, MaxLength(50)]
        public string Type { get; set; } = "update"; // update, status, warning, etc.

        [Required, MaxLength(500)]
        public string Message { get; set; } = null!;

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        [Required, MaxLength(100)]
        public string ActorName { get; set; } = "System";

        // Optional UI hints
        [MaxLength(50)]
        public string? IconName { get; set; }

        [MaxLength(50)]
        public string? ColorClass { get; set; }

        [MaxLength(50)]
        public string? BgClass { get; set; }
    }
}
