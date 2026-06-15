using FluentValidation;
using InnoTrack.Application.DTOs.Auth;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Interfaces;

namespace InnoTrack.Application.Validators
{
    public class RegisterRequestValidator : AbstractValidator<RegisterRequestDto>
    {
        public RegisterRequestValidator(IUnitOfWork unitOfWork)
        {
            RuleFor(x => x.FirstName)
                .NotEmpty().WithMessage("First Name is required.")
                .MinimumLength(2).WithMessage("First Name must be at least 2 characters.")
                .MaximumLength(50).WithMessage("First Name must not exceed 50 characters.");
            RuleFor(x => x.LastName)
                .NotEmpty().WithMessage("Last Name is required.")
                .MinimumLength(2).WithMessage("Last Name must be at least 2 characters.")
                .MaximumLength(50).WithMessage("Last Name must not exceed 50 characters.");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required.")
                .EmailAddress().WithMessage("A valid email format is required.")
                .MaximumLength(100).WithMessage("Email must not exceed 100 characters.");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Password is required.")
                .MinimumLength(8).WithMessage("Password must be at least 8 characters.")
                .Matches("[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
                .Matches("[a-z]").WithMessage("Password must contain at least one lowercase letter.")
                .Matches("[0-9]").WithMessage("Password must contain at least one number.")
                .Matches("[^a-zA-Z0-9]").WithMessage("Password must contain at least one special character.");

            RuleFor(x => x.DepartmentId)
                .GreaterThan(0).WithMessage("Valid Department is required.")
                .MustAsync(async (id, ct) =>
                    await unitOfWork.Repository<Department>().GetByIdAsync(id) is not null)
                .WithMessage("The specified department does not exist.");

            RuleFor(x => x.GPA)
                .InclusiveBetween(0, 4.0m).WithMessage("GPA must be between 0 and 4.0");

            RuleFor(x => x.GraduationYear)
                .InclusiveBetween(DateTime.UtcNow.Year, DateTime.UtcNow.Year + 4)
                .WithMessage("Graduation year must be within the next 5 years.");

        }
    }
}
