namespace InnoTrack.Application.DTOs.Professors
{
    /// <summary>
    /// All fields are optional — only non-null values are applied.
    /// </summary>
    public record UpdateProfessorAdminDto(
        string? FirstName,
        string? LastName,
        int? DepartmentId,
        int? MaxTeamLoad,
        bool? IsActive
    );
}