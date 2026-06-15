using FluentValidation;
using InnoTrack.Application.DTOs.Lookups;

namespace InnoTrack.Application.Validators
{
    public class CreateDomainValidator : AbstractValidator<CreateDomainDto>
    {
        public CreateDomainValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Domain name is required.")
                .MaximumLength(100).WithMessage("Domain name cannot exceed 100 characters.");

            RuleFor(x => x.Description)
                .MaximumLength(500).When(x => x.Description is not null);
        }
    }
}
