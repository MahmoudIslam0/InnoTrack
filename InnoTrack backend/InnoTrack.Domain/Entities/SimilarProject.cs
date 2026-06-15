using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InnoTrack.Domain.Entities
{
    public class SimilarProject
    {
        public int Id { get; set; }

        [Column(TypeName = "decimal(5,2)"), Range(0, 100)]
        public decimal SimilarityPercentage { get; set; }

        public string ProjectTitle { get; set; } = string.Empty;
        [Required]
        public int OriginalityReportId { get; set; }
        public OriginalityReport OriginalityReport { get; set; } = null!;

        public int? ReferencedProjectId { get; set; }

        [ForeignKey(nameof(ReferencedProjectId))]
        public Project? ReferencedProject { get; set; }
    }
}
