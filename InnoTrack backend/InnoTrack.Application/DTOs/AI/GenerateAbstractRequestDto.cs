namespace InnoTrack.Application.DTOs.AI
{
    public record GenerateAbstractRequestDto(
            string Title,
            string Description,
            string ProblemStatement,
            string ProposedSolution
        );
}
