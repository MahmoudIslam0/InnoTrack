namespace InnoTrack.Application.DTOs.Auth
{
    public class VerifyResetTokenDto
    {
        public string Email { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
    }
}
