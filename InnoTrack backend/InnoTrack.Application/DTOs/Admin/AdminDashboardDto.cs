namespace InnoTrack.Application.DTOs.Admin
{
    public record AdminDashboardDto(
        // ── User Stats ───────────────────────────────────────────────────────────
        int TotalStudents,
        int ActiveStudents,
        int TotalProfessors,
        int ActiveProfessors,
        int NewStudentsThisWeek,
        // ── Team Stats ───────────────────────────────────────────────────────────
        int TotalTeams,
        int TeamsWithoutSupervisor,
        // ── Project Stats ────────────────────────────────────────────────────────
        int TotalProjects,
        int DraftCount,
        int UnderReviewCount,
        int InProgressCount,
        int ApprovedCount,
        int RejectedCount,
        int CompletedCount,
        decimal? AverageOriginalityScore,   // Task 1: always returned as 0–100
                                            // ── Academic Year ────────────────────────────────────────────────────────
        bool HasActiveAcademicYear,
        string? ActiveAcademicYearName,
        // ── Additional Stats ─────────────────────────────────────────────────────
        int TotalTechnologies,
        int TotalDomains,
        // ── Quick Action Flags (Task 3) ───────────────────────────────────────────
        /// <summary>
        /// Count of projects stuck in UnderReview for 48+ hours with no AI score.
        /// Front-end should show a badge on the "Reset Stuck" button and disable it when 0.
        /// </summary>
        int StuckProjectsCount,
        /// <summary>
        /// True when an academic year is active and can be closed.
        /// Front-end should enable the "Close Academic Year" button only when true.
        /// </summary>
        bool CanCloseAcademicYear,
        // ── Chart Data (Task 2) ───────────────────────────────────────────────────
        IReadOnlyList<ChartDataPointDto> ProjectsByStatus,
        IReadOnlyList<ChartDataPointDto> ProjectsByDomain,
        // ── Alerts and Activity ──────────────────────────────────────────────────
        IReadOnlyList<SystemAlertDto> Alerts,
        IReadOnlyList<RecentAuditEntryDto> RecentActivity
    );

    public record SystemAlertDto(string Severity, string Message, int Count);

    public record RecentAuditEntryDto(
        int Id,
        string ActorName,
        string Action,
        string Details,
        DateTime Timestamp
    );
}