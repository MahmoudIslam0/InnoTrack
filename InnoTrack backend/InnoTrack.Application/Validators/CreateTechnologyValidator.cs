using FluentValidation;
using InnoTrack.Application.DTOs.Lookups;

namespace InnoTrack.Application.Validators
{
    public class CreateTechnologyValidator : AbstractValidator<CreateTechnologyDto>
    {
        public CreateTechnologyValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Technology name is required.")
                .MaximumLength(100).WithMessage("Technology name cannot exceed 100 characters.");
        }
    }
}
