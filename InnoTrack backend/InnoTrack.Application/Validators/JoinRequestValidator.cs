using FluentValidation;
using InnoTrack.Application.DTOs.Teams;

namespace InnoTrack.Application.Validators
{
    public class JoinRequestValidator : AbstractValidator<DirectJoinDto>
    {
        public JoinRequestValidator()
        {
            RuleFor(x => x.JoinCode)
                .NotEmpty().WithMessage("Join code is required.")
                .Length(6).WithMessage("Invalid join code format.");
        }
    }
}
