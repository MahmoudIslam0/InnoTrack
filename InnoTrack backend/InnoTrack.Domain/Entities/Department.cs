using System.ComponentModel.DataAnnotations;

namespace InnoTrack.Domain.Entities
{
    public class Department
    {
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string Name { get; set; }

        [Required, MaxLength(8)]
        public string Code { get; set; }

        public ICollection<Student> Students { get; set; } = new HashSet<Student>();
        public ICollection<Professor> Professors { get; set; } = new HashSet<Professor>();
    }
}
