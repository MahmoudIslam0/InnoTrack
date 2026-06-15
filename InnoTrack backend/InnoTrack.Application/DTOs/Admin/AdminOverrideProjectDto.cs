namespace InnoTrack.Application.DTOs.Admin
{
    /// <param name="Status">Target ProjectStatus enum name (case-insensitive).</param>
    /// <param name="Reason">Mandatory justification stored in the audit log.</param>
    public record AdminOverrideProjectDto(string Status, string Reason);
}