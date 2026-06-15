using InnoTrack.Application.Interfaces;
using System.Security.Cryptography;

namespace InnoTrack.Infrastructure.Helpers
{
    public class JoinCodeGenerator : IJoinCodeGenerator
    {
        private const string Chars = "0123456789";
        public string GenerateJoinCode(int length = 6)
        {
            var bytes = new byte[length];
            RandomNumberGenerator.Fill(bytes); // cryptographically secure
            return new string(bytes.Select(b => Chars[b % Chars.Length]).ToArray());
        }
    }
}
