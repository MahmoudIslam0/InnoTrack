
using InnoTrack.Domain.Entities.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InnoTrack.Domain.Entities
{
    public class Project
    {
        public int Id { get; set; }

        [Required, MaxLength(255)]
        public string Title { get; set; }

        [Required, Column(TypeName = "nvarchar(max)")]
        public string Abstract { get; set; }

        [Required, Column(TypeName = "nvarchar(max)")]
        public string Description { get; set; }

        [Required]
        public ProjectStatus Status { get; set; }
        public bool IsPublicShowcase { get; set; } = false;

        [Column(TypeName = "decimal(5,2)")]
        [Range(0, 100)]
        public decimal? OriginalityScore { get; set; }

        public int? Year { get; set; }

        public string? StudentNames { get; set; }
        public string? AbandonReason { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }

        public int? TeamId { get; set; }
        public Team? Team { get; set; }

        public int DomainId { get; set; }
        public Domain Domain { get; set; }

        [Required]
        public int AcademicYearId { get; set; }
        public AcademicYear AcademicYear { get; set; } = null!;


        [Column(TypeName = "nvarchar(max)")]
        public string? ProblemStatement { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? ProposedSolution { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? Objectives { get; set; }

        [MaxLength(200)]
        public string? ProposalDepartment { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? ProposalTeamMembers { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? ProposalMessage { get; set; }

        public int? ProposedSupervisorId { get; set; }
        public Professor? ProposedSupervisor { get; set; }

        public ICollection<ProjectTechnology> ProjectTechnologies { get; set; } = new HashSet<ProjectTechnology>();
        public ICollection<ProjectAttachment> Attachments { get; set; } = new HashSet<ProjectAttachment>();
        public ICollection<Feedback> Feedbacks { get; set; } = new HashSet<Feedback>();
        public VectorEmbedding? VectorEmbedding { get; set; }
        public ICollection<OriginalityReport> OriginalityReports { get; set; } = new HashSet<OriginalityReport>();
    }
}
