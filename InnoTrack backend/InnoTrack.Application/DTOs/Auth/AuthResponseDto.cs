namespace InnoTrack.Application.DTOs.Auth
{
    public record AuthResponseDto
        (string AccessToken, string RefreshToken, DateTime RefreshTokenExpiration, string Name, string Role);
}
