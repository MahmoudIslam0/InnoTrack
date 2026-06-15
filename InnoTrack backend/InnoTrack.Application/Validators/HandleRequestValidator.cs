using FluentValidation;
using InnoTrack.Application.DTOs.Teams;

namespace InnoTrack.Application.Validators
{
    public class HandleRequestValidator : AbstractValidator<HandleRequestDto>
    {
        public HandleRequestValidator()
        {
            RuleFor(x => x.RequestId)
                .GreaterThan(0).WithMessage("A valid request ID is required.");
        }
    }

}
