namespace InnoTrack.Infrastructure.Models;

public partial class ProjectsBackup
{
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public string Abstract { get; set; } = null!;

    public string Description { get; set; } = null!;

    public string Status { get; set; } = null!;

    public decimal? OriginalityScore { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? SubmittedAt { get; set; }

    public int TeamId { get; set; }

    public int DomainId { get; set; }

    public int AcademicYearId { get; set; }

    public bool IsPublicShowcase { get; set; }

    public string? Objectives { get; set; }

    public string? ProblemStatement { get; set; }

    public string? ProposalDepartment { get; set; }

    public string? ProposalMessage { get; set; }

    public string? ProposalTeamMembers { get; set; }

    public string? ProposedSolution { get; set; }

    public string? StudentNames { get; set; }

    public int? Year { get; set; }
}
