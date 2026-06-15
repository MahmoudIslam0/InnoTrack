using FluentValidation;
using InnoTrack.Application.DTOs.Users;

namespace InnoTrack.Application.Validators
{
    public class ChangePasswordValidator : AbstractValidator<ChangePasswordDto>
    {
        public ChangePasswordValidator()
        {
            RuleFor(x => x.OldPassword).NotEmpty();

            RuleFor(x => x.NewPassword)
                .NotEmpty()
                .MinimumLength(8)
                .Matches("[A-Z]").WithMessage("Must contain uppercase.")
                .Matches("[a-z]").WithMessage("Must contain lowercase.")
                .Matches("[0-9]").WithMessage("Must contain a digit.")
                .Matches("[^a-zA-Z0-9]").WithMessage("Must contain a special character.")
                .NotEqual(x => x.OldPassword).WithMessage("New password must differ from old password.");
        }
    }

}
