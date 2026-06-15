namespace InnoTrack.Domain.Entities
{
    public class AcademicYear
    {
        public int Id { get; set; }

        public string Name { get; set; } = null!;

        public DateTime StartDate { get; set; }

        public DateTime EndDate { get; set; }

        public bool IsActive { get; set; }
        public ICollection<Project> Projects { get; set; } = new List<Project>();
    }
}
