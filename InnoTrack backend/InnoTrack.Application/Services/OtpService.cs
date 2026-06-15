using System;
using System.Linq;
using System.Threading.Tasks;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Interfaces;

namespace InnoTrack.Application.Services
{
    public class OtpService : IOtpService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IEmailService _emailService;
        private readonly IPasswordHasher _passwordHasher;

        public OtpService(IUnitOfWork unitOfWork, IEmailService emailService, IPasswordHasher passwordHasher)
        {
            _unitOfWork = unitOfWork;
            _emailService = emailService;
            _passwordHasher = passwordHasher;
        }

        public async Task<bool> GenerateAndSendOtpAsync(string email)
        {
            // 1. Invalidate previous unexpired OTPs to prevent spam
            var existingOtps = await _unitOfWork.Repository<OtpVerification>().GetAllAsync(x => x.Email == email && !x.IsUsed && x.ExpiryTime > DateTime.UtcNow);
            foreach (var existing in existingOtps)
            {
                existing.IsUsed = true;
                _unitOfWork.Repository<OtpVerification>().Update(existing);
            }

            // 2. Generate secure 6-digit OTP
            var random = new Random();
            string plainOtp = random.Next(100000, 999999).ToString();

            // 3. Hash OTP
            var otpEntity = new OtpVerification
            {
                Email = email,
                CreatedAt = DateTime.UtcNow,
                ExpiryTime = DateTime.UtcNow.AddMinutes(5),
                IsUsed = false,
                OtpHash = _passwordHasher.Hash(plainOtp)
            };

            await _unitOfWork.Repository<OtpVerification>().AddAsync(otpEntity);
            await _unitOfWork.CompleteAsync();

            // 4. Send Email
            string emailBody = $"Hello,\n\nYour registration verification code is: {plainOtp}\nThis code will expire in 5 minutes.";
            
            await _emailService.SendEmailAsync(email, "InnoTrack - Verification Code", emailBody);

            return true;
        }

        public async Task<bool> VerifyOtpAsync(string email, string plainOtp)
        {
            var activeOtps = await _unitOfWork.Repository<OtpVerification>().GetAllAsync(x => x.Email == email && !x.IsUsed);
            
            var latestOtp = activeOtps
                            .OrderByDescending(x => x.CreatedAt)
                            .FirstOrDefault();

            if (latestOtp == null || latestOtp.IsExpired)
                throw new Exception("OTP Expired or Not Found.");

            if (!_passwordHasher.Verify(plainOtp, latestOtp.OtpHash))
                throw new Exception("Invalid OTP.");

            latestOtp.IsUsed = true;
            _unitOfWork.Repository<OtpVerification>().Update(latestOtp);
            await _unitOfWork.CompleteAsync();

            return true;
        }
    }
}
