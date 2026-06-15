using InnoTrack.Domain.Entities;
using System.Security.Claims;

namespace InnoTrack.Application.Interfaces
{
    public interface ITokenService
    {
        string GenerateAccessToken(User user);
        (string rawToken, string hashedToken, DateTime expiryDate) GenerateRefreshToken();
        ClaimsPrincipal GetPrincipalFromExpiredToken(string token);
    }
}
