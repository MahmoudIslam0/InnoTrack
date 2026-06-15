using System.ComponentModel.DataAnnotations;

namespace InnoTrack.Domain.Entities
{
    public class Professor : User
    {
        [Required]
        public int DepartmentId { get; set; }
        public Department Department { get; set; } = null!;

        public int MaxTeamLoad { get; set; } = 5;

        public ICollection<Team> SupervisedTeams { get; set; } = new HashSet<Team>();
        public ICollection<Feedback> Feedbacks { get; set; } = new HashSet<Feedback>();
    }
}
