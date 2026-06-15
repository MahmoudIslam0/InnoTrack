using FluentValidation;
using InnoTrack.Application.DTOs.Projects;

namespace InnoTrack.Application.Validators
{
    public class CreateProjectValidator : AbstractValidator<CreateProjectDto>
    {
        public CreateProjectValidator()
        {
            RuleFor(x => x.Title)
                .NotEmpty().WithMessage("Project title is required.")
                .MaximumLength(200).WithMessage("Project title cannot exceed 200 characters.");

            RuleFor(x => x.Abstract)
                .NotEmpty().WithMessage("Project abstract is required.")
                .MinimumLength(50).WithMessage("The abstract is too short. It must be at least 50 characters to ensure evaluation quality.");

            RuleFor(x => x.Description)
                .NotEmpty().WithMessage("Project description is required.")
                .MinimumLength(50).WithMessage("The detailed description must be at least 50 characters.");

            RuleFor(x => x.TechnologyIds)
                .NotEmpty().WithMessage("At least one technology must be selected for the project.")
                .Must(ids => ids.All(id => id > 0))
                .WithMessage("All technology IDs must be valid positive integers.")
                .Must(ids => ids.Distinct().Count() == ids.Count)
                .WithMessage("Duplicate technology IDs are not allowed.");

            RuleFor(x => x.DomainId)
                .GreaterThan(0).WithMessage("A valid project domain must be selected.");
        }
    }
}