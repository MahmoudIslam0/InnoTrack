using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InnoTrack.Domain.Entities
{
    public class OriginalityReport
    {
        public int Id { get; set; }

        [Required, Column(TypeName = "decimal(5,2)"), Range(0, 100)]
        public decimal OverallScore { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? Summary { get; set; }

        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public int ProjectId { get; set; }

        [ForeignKey(nameof(ProjectId))]
        public Project Project { get; set; } = null!;

        public ICollection<SimilarProject> SimilarProjects { get; set; } = new HashSet<SimilarProject>();


    }
}
