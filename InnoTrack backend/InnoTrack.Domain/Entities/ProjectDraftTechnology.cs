namespace InnoTrack.Domain.Entities
{
    public class ProjectDraftTechnology
    {
        public int ProjectDraftId { get; set; }
        public ProjectDraft ProjectDraft { get; set; } = null!;

        public int TechnologyId { get; set; }
        public Technology Technology { get; set; } = null!;
    }
}