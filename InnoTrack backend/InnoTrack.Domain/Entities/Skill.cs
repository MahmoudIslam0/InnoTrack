using System.ComponentModel.DataAnnotations;

namespace InnoTrack.Domain.Entities
{
    public class Skill
    {
        public int Id { get; set; }

        [Required, MaxLength(50)]
        public string Name { get; set; } = null!;

        public ICollection<StudentSkill> StudentSkills { get; set; } = new HashSet<StudentSkill>();
    }
}
