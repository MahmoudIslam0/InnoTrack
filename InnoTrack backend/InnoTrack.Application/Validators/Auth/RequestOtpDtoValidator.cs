using FluentValidation;
using InnoTrack.Application.DTOs.Auth;
using System;

namespace InnoTrack.Application.Validators.Auth
{
    public class RequestOtpDtoValidator : AbstractValidator<RequestOtpDto>
    {
        public RequestOtpDtoValidator()
        {
            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required.")
                .EmailAddress().WithMessage("A valid email format is required.")
                .Must(email => email.EndsWith("@fci.bu.edu.eg", StringComparison.OrdinalIgnoreCase))
                .WithMessage("Unauthorized domain. Registration is strictly restricted to @fci.bu.edu.eg email addresses.");
        }
    }
}
