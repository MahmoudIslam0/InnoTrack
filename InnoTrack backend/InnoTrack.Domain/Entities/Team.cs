using System.ComponentModel.DataAnnotations;

namespace InnoTrack.Domain.Entities
{
    public class Team
    {
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string Name { get; set; }

        [Required, MaxLength(30)]
        public string JoinCode { get; set; }

        [Required, Range(2, 11)]
        public int MaxSize { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? JoinCodeExpiry { get; set; }

        public int? ProfessorId { get; set; }
        public Professor? Supervisor { get; set; }

        public Project? Project { get; set; }
        public ChatRoom? ChatRoom { get; set; }

        public ICollection<TeamMember> Members { get; set; } = new HashSet<TeamMember>();
        public ICollection<ProjectDraft> ProjectDrafts { get; set; } = new HashSet<ProjectDraft>();
    }
}
