namespace InnoTrack.Infrastructure.Models;

public partial class PreProcessedProject
{
    public int Id { get; set; }

    public DateTime? SubmittedAt { get; set; }

    public string? ProjectTitle { get; set; }

    public string? StudentNames { get; set; }

    public string? Supervisor { get; set; }

    public int? Year { get; set; }

    public string? Category { get; set; }

    public string? Technologies { get; set; }

    public string? Keywords { get; set; }

    public string? Abstract { get; set; }

    public string? Description { get; set; }

    public string? ProblemStatement { get; set; }

    public string? ProposedSolution { get; set; }

    public string? Objectives { get; set; }

    public string? AiSummary { get; set; }

    public string? FullContent { get; set; }

    public string? CleanText { get; set; }

    public int? WordCount { get; set; }

    public string? Features { get; set; }
}
