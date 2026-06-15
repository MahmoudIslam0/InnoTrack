using System.Threading.Tasks;

namespace InnoTrack.Application.Interfaces
{
    public interface IOtpService
    {
        Task<bool> GenerateAndSendOtpAsync(string email);
        Task<bool> VerifyOtpAsync(string email, string plainOtp);
    }
}
