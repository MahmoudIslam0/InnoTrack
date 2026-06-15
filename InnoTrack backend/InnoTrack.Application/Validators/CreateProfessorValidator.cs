using FluentValidation;
using InnoTrack.Application.DTOs.Professors;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Interfaces;

namespace InnoTrack.Application.Validators
{
    public class CreateProfessorValidator : AbstractValidator<CreateProfessorDto>
    {
        public CreateProfessorValidator(IUnitOfWork unitOfWork)
        {
            RuleFor(x => x.FirstName)
                .NotEmpty().MinimumLength(2).MaximumLength(50);

            RuleFor(x => x.LastName)
                .NotEmpty().MinimumLength(2).MaximumLength(50);

            RuleFor(x => x.Email)
                .NotEmpty()
                .EmailAddress().WithMessage("A valid email address is required.")
                .MaximumLength(255);

            RuleFor(x => x.Password)
                .NotEmpty()
                .MinimumLength(8).WithMessage("Password must be at least 8 characters.")
                .Matches(@"[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
                .Matches(@"\d").WithMessage("Password must contain at least one digit.")
                .Matches(@"[^a-zA-Z0-9]").WithMessage("Password must contain at least one special character.");

            RuleFor(x => x.DepartmentId)
                .GreaterThan(0)
                .MustAsync(async (id, ct) =>
                    await unitOfWork.Repository<Department>().GetByIdAsync(id) is not null)
                .WithMessage("The specified department does not exist.");

            RuleFor(x => x.MaxTeamLoad)
                .InclusiveBetween(1, 11)
                .WithMessage("MaxTeamLoad must be between 1 and 11.");
        }
    }
}