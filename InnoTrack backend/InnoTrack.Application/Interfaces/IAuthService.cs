using InnoTrack.Application.DTOs.Auth;

namespace InnoTrack.Application.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request);
        Task<AuthResponseDto> LoginAsync(LoginRequestDto request);
        Task ForgotPasswordAsync(ForgotPasswordDto dto);
        Task VerifyResetTokenAsync(VerifyResetTokenDto dto);
        Task ResetPasswordAsync(ResetPasswordDto dto);
        Task LogoutAsync(int userId);
        Task<AuthResponseDto> RefreshTokenAsync(string token, string refreshToken);
        Task<bool> IsEmailRegisteredAsync(string email);
    }
}
