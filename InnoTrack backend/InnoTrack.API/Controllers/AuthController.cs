using InnoTrack.Application.DTOs.Auth;
using InnoTrack.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

namespace InnoTrack.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IOtpService _otpService;

        public AuthController(IAuthService authService, IOtpService otpService)
        {
            _authService = authService;
            _otpService = otpService;
        }

        /// <summary>
        /// Requests a 6-digit OTP code sent to the specified university email address.
        /// </summary>
        [HttpPost("request-otp")]
        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        public async Task<IActionResult> RequestOtp([FromBody] RequestOtpDto request)
        {
            if (await _authService.IsEmailRegisteredAsync(request.Email))
            {
                return Conflict(new { Message = "Email is already registered." });
            }

            await _otpService.GenerateAndSendOtpAsync(request.Email);
            return Ok(new { Message = "OTP sent successfully." });
        }

        /// <summary>
        /// Verifies the 6-digit OTP code sent to the email address.
        /// </summary>
        [HttpPost("verify-otp")]
        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpDto request)
        {
            try
            {
                var isValid = await _otpService.VerifyOtpAsync(request.Email, request.Otp);
                if (isValid)
                {
                    return Ok(new { Success = true, Message = "Email verified successfully." });
                }
                return BadRequest(new { Success = false, Message = "Verification failed." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }

        /// <summary>
        /// Registers a new student account and returns authentication tokens.
        /// </summary>
        /// <param name="request">The registration information for the new student.</param>
        /// <returns>
        /// Returns the generated access token, refresh token, and user information.
        /// </returns>
        [HttpPost("register")]
        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
        {
            var response = await _authService.RegisterAsync(request);
            return Ok(response);
        }

        /// <summary>
        /// Authenticates a user and returns JWT access and refresh tokens.
        /// </summary>
        /// <param name="request">The user login credentials.</param>
        /// <returns>
        /// Returns authentication tokens and basic user information.
        /// </returns>
        [HttpPost("login")]
        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            var response = await _authService.LoginAsync(request);
            return Ok(response);
        }

        /// <summary>
        /// Sends a password reset code to the user's email address.
        /// </summary>
        /// <param name="dto">The email address associated with the account.</param>
        /// <returns>
        /// Returns a confirmation message whether the reset request was processed.
        /// </returns>
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            await _authService.ForgotPasswordAsync(dto);
            return Ok(new { message = "If the email is registered, a reset code will be sent. Please check your Junk or Spam folder if you don't see the email in your inbox." });
        }

        /// <summary>
        /// Verifies if the provided reset code is valid and not expired.
        /// </summary>
        /// <param name="dto">The email address and token.</param>
        /// <returns>Returns Ok if valid, BadRequest if invalid.</returns>
        [HttpPost("verify-reset-code")]
        public async Task<IActionResult> VerifyResetCode([FromBody] VerifyResetTokenDto dto)
        {
            try
            {
                await _authService.VerifyResetTokenAsync(dto);
                return Ok(new { message = "Token is valid." });
            }
            catch (UnauthorizedAccessException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        /// <summary>
        /// Resets the user's password using the provided reset token.
        /// </summary>
        /// <param name="dto">The reset password request containing email, token, and new password.</param>
        /// <returns>
        /// Returns a success message if the password was reset successfully.
        /// </returns>
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            try
            {
                await _authService.ResetPasswordAsync(dto);
                return Ok(new { message = "Password has been reset successfully." });
            }
            catch (UnauthorizedAccessException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        /// <summary>
        /// Logs out the currently authenticated user and invalidates the refresh token.
        /// </summary>
        /// <returns>
        /// Returns no content after successful logout.
        /// </returns>
        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await _authService.LogoutAsync(userId);
            return NoContent();
        }

        /// <summary>
        /// Generates a new access token using a valid refresh token.
        /// </summary>
        /// <param name="request">The expired access token and refresh token.</param>
        /// <returns>
        /// Returns a new access token and refresh token pair.
        /// </returns>
        [HttpPost("refresh-token")]
        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto request)
        {
            var response = await _authService.RefreshTokenAsync(request.AccessToken, request.RefreshToken);
            return Ok(response);
        }
    }
}
