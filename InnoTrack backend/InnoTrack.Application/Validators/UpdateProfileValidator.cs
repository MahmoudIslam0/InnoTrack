using FluentValidation;
using InnoTrack.Application.DTOs.Users;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Interfaces;

namespace InnoTrack.Application.Validators
{
    public class UpdateProfileValidator : AbstractValidator<UpdateProfileDto>
    {
        public UpdateProfileValidator(IUnitOfWork unitOfWork)
        {
            RuleFor(x => x.FirstName)
                .NotEmpty().WithMessage("First name is required.")
                .MinimumLength(2).MaximumLength(50);

            RuleFor(x => x.LastName)
                .NotEmpty().WithMessage("Last name is required.")
                .MinimumLength(2).MaximumLength(50);

            RuleFor(x => x.DepartmentId)
                .GreaterThan(0)
                .MustAsync(async (id, ct) =>
                    await unitOfWork.Repository<Department>().GetByIdAsync(id) is not null)
                .WithMessage("Department does not exist.");

            RuleFor(x => x.GraduationYear)
                .InclusiveBetween(DateTime.UtcNow.Year, DateTime.UtcNow.Year + 5)
                .WithMessage("Graduation year must be within the next 5 years.");
        }
    }

}
