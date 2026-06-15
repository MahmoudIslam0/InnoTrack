using System.ComponentModel.DataAnnotations;

namespace InnoTrack.Domain.Entities
{
    public class Technology
    {
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string Name { get; set; }


        public ICollection<ProjectTechnology> ProjectTechnologies { get; set; } = new HashSet<ProjectTechnology>();

    }
}
