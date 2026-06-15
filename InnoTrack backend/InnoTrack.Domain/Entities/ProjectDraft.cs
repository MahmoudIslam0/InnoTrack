using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InnoTrack.Domain.Entities
{
    public class ProjectDraft
    {
        public int Id { get; set; }

        [Required, MaxLength(255)]
        public string Title { get; set; } = string.Empty;

        [Required, Column(TypeName = "nvarchar(max)")]
        public string Abstract { get; set; } = string.Empty;

        [Required, Column(TypeName = "nvarchar(max)")]
        public string Description { get; set; } = string.Empty;

        public int Year { get; set; }
        public string? StudentNames { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        [Range(0, 100)]
        public decimal? OriginalityScore { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        [Required]
        public int TeamId { get; set; }
        public Team Team { get; set; } = null!;

        [Required]
        public int CreatedByUserId { get; set; }
        public User CreatedByUser { get; set; } = null!;

        public int DomainId { get; set; }
        public Domain Domain { get; set; } = null!;

        [Column(TypeName = "nvarchar(max)")]
        public string? ProblemStatement { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? ProposedSolution { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? Objectives { get; set; }

        public ICollection<ProjectDraftTechnology> DraftTechnologies { get; set; } = new HashSet<ProjectDraftTechnology>();
    }
}
