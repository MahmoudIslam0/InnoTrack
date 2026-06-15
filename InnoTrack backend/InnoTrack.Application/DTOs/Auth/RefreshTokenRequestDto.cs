namespace InnoTrack.Application.DTOs.Auth
{
    public record RefreshTokenRequestDto(string AccessToken, string RefreshToken);
}
