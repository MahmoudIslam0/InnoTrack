using FluentValidation;
using InnoTrack.Application.DTOs.Lookups;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Interfaces;

namespace InnoTrack.Application.Validators
{
    public class CreateDepartmentValidator : AbstractValidator<CreateDepartmentDto>
    {
        public CreateDepartmentValidator(IUnitOfWork unitOfWork)
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Department name is required.")
                .MaximumLength(100).WithMessage("Department name cannot exceed 100 characters.");

            RuleFor(x => x.Code)
                .NotEmpty().WithMessage("Department code is required.")
                .MaximumLength(8).WithMessage("Department code cannot exceed 8 characters.")
                .MustAsync(async (code, ct) =>
                    await unitOfWork.Repository<Department>().FindAsync(d => d.Code == code) == null)
                .WithMessage("Department code already exists.");
        }
    }
}
