using InnoTrack.Application.DTOs.Auth;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Entities.Enums;
using InnoTrack.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;


namespace InnoTrack.Application.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ITokenService _tokenService;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IEmailService _emailService;

        public AuthService(IUnitOfWork unitOfWork, ITokenService tokenService, IPasswordHasher passwordHasher, IEmailService emailService)
        {
            _unitOfWork = unitOfWork;
            _tokenService = tokenService;
            _passwordHasher = passwordHasher;
            _emailService = emailService;
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request)
        {
            var existingUser = await _unitOfWork.Repository<User>().FindAsync(u => u.Email == request.Email);
            var passwordHash = _passwordHasher.Hash(request.Password);
            var refreshTokens = _tokenService.GenerateRefreshToken();

            Student studentToSave;

            if (existingUser != null)
            {
                if (!existingUser.IsDeleted)
                {
                    throw new InvalidOperationException("Email is already registered.");
                }
                else
                {
                    if (existingUser is not Student existingStudent)
                    {
                        throw new InvalidOperationException("This email is associated with a non-student account.");
                    }

                    existingStudent.IsDeleted = false;
                    existingStudent.IsActive = true;
                    existingStudent.FirstName = request.FirstName;
                    existingStudent.LastName = request.LastName;
                    existingStudent.PasswordHash = passwordHash;
                    existingStudent.DepartmentId = request.DepartmentId;
                    existingStudent.GraduationYear = request.GraduationYear;
                    existingStudent.GPA = request.GPA;
                    existingStudent.RefreshToken = refreshTokens.hashedToken;
                    existingStudent.RefreshTokenExpiryTime = refreshTokens.expiryDate;

                    _unitOfWork.Repository<Student>().Update(existingStudent);
                    studentToSave = existingStudent;
                }
            }
            else
            {
                studentToSave = new Student
                {
                    FirstName = request.FirstName,
                    LastName = request.LastName,
                    Email = request.Email,
                    PasswordHash = passwordHash,
                    DepartmentId = request.DepartmentId,
                    GraduationYear = request.GraduationYear,
                    GPA = request.GPA,
                    CreatedAt = DateTime.UtcNow,
                    Role = UserRole.Student,
                    IsActive = true,
                    RefreshToken = refreshTokens.hashedToken,
                    RefreshTokenExpiryTime = refreshTokens.expiryDate
                };

                await _unitOfWork.Repository<Student>().AddAsync(studentToSave);
            }

            await _unitOfWork.CompleteAsync();

            var accessToken = _tokenService.GenerateAccessToken(studentToSave);

            return new AuthResponseDto(accessToken, refreshTokens.rawToken, studentToSave.RefreshTokenExpiryTime.Value, studentToSave.FullName, studentToSave.Role.ToString());
        }

        public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request)
        {
            var user = await _unitOfWork.Repository<User>().FindAsync(u => u.Email == request.Email);
            if (user == null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
                throw new UnauthorizedAccessException("Invalid email or password.");

            var accessToken = _tokenService.GenerateAccessToken(user);
            var refreshTokens = _tokenService.GenerateRefreshToken();

            user.RefreshToken = refreshTokens.hashedToken;
            user.RefreshTokenExpiryTime = refreshTokens.expiryDate;

            _unitOfWork.Repository<User>().Update(user);
            await _unitOfWork.CompleteAsync();

            return new AuthResponseDto(accessToken, refreshTokens.rawToken, user.RefreshTokenExpiryTime.Value, user.FullName, user.Role.ToString());
        }

        public async Task ForgotPasswordAsync(ForgotPasswordDto dto)
        {
            var user = await _unitOfWork.Repository<User>()
                .GetQueryable()
                .FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower());

            if (user == null)
                return;

            string otp = RandomNumberGenerator.GetInt32(100000, 999999).ToString();

            user.ResetPasswordToken = otp;
            user.ResetPasswordTokenExpiry = DateTime.UtcNow.AddMinutes(15);

            _unitOfWork.Repository<User>().Update(user);
            await _unitOfWork.CompleteAsync();

            string emailBody = $"Hello {user.FirstName},\n\nYour password reset code is: {otp}\nThis code will expire in 15 minutes.";
            await _emailService.SendEmailAsync(user.Email, "InnoTrack - Password Reset", emailBody);
        }

        public async Task VerifyResetTokenAsync(VerifyResetTokenDto dto)
        {
            var user = await _unitOfWork.Repository<User>()
                .GetQueryable()
                .FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower());

            if (user == null)
                throw new UnauthorizedAccessException("Invalid email or token.");

            if (user.ResetPasswordToken != dto.Token || user.ResetPasswordTokenExpiry < DateTime.UtcNow)
                throw new UnauthorizedAccessException("Invalid or expired reset token.");
        }

        public async Task ResetPasswordAsync(ResetPasswordDto dto)
        {
            var user = await _unitOfWork.Repository<User>()
                .GetQueryable()
                .FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower());

            if (user == null)
                throw new UnauthorizedAccessException("Invalid email or token.");

            if (user.ResetPasswordToken != dto.Token || user.ResetPasswordTokenExpiry < DateTime.UtcNow)
                throw new UnauthorizedAccessException("Invalid or expired reset token.");

            user.PasswordHash = _passwordHasher.Hash(dto.NewPassword);

            user.ResetPasswordToken = null;
            user.ResetPasswordTokenExpiry = null;

            _unitOfWork.Repository<User>().Update(user);
            await _unitOfWork.CompleteAsync();
        }

        public async Task LogoutAsync(int userId)
        {
            var user = await _unitOfWork.Repository<User>().GetByIdAsync(userId);
            if (user == null) return;

            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = null;

            _unitOfWork.Repository<User>().Update(user);
            await _unitOfWork.CompleteAsync();
        }

        public async Task<AuthResponseDto> RefreshTokenAsync(string token, string refreshToken)
        {
            var principal = _tokenService.GetPrincipalFromExpiredToken(token);
            var userEmail = principal.FindFirst(ClaimTypes.Email)?.Value
                         ?? principal.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Email)?.Value;

            var user = await _unitOfWork.Repository<User>().FindAsync(u => u.Email == userEmail);

            var hashedIncomingToken = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken)));

            if (user == null || user.RefreshToken != hashedIncomingToken || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
            {
                throw new UnauthorizedAccessException("Invalid client request or refresh token expired.");
            }

            var newAccessToken = _tokenService.GenerateAccessToken(user);
            var newRefreshTokens = _tokenService.GenerateRefreshToken();

            user.RefreshToken = newRefreshTokens.hashedToken;
            user.RefreshTokenExpiryTime = newRefreshTokens.expiryDate;

            _unitOfWork.Repository<User>().Update(user);
            await _unitOfWork.CompleteAsync();

            return new AuthResponseDto(newAccessToken, newRefreshTokens.rawToken, user.RefreshTokenExpiryTime.Value, user.FullName, user.Role.ToString());
        }

        public async Task<bool> IsEmailRegisteredAsync(string email)
        {
            var existingUser = await _unitOfWork.Repository<User>().FindAsync(u => u.Email == email && !u.IsDeleted);
            return existingUser != null;
        }
    }
}
