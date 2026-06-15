namespace InnoTrack.Application.DTOs.Auth
{
    public record ResetPasswordDto(
        string Email,
        string Token,
        string NewPassword
    );
}
