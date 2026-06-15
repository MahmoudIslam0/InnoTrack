using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InnoTrack.Domain.Entities
{
    public class Feedback
    {
        public int Id { get; set; }

        [Required, Column(TypeName = "nvarchar(max)")]
        public string Content { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsRead { get; set; } = false;


        [Required]
        public int ProjectId { get; set; }
        public Project Project { get; set; } = null!;

        public int ProfessorId { get; set; }
        public Professor Professor { get; set; } = null!;
    }
}
