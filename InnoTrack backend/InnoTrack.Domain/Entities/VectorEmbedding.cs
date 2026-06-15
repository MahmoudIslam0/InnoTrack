using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InnoTrack.Domain.Entities
{
    public class VectorEmbedding
    {
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string ModelName { get; set; } = null!;

        [Required, Column(TypeName = "nvarchar(max)")]
        public string VectorData { get; set; } = null!;

        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public int ProjectId { get; set; }

        [ForeignKey(nameof(ProjectId))]
        public Project Project { get; set; } = null!;
    }
}
