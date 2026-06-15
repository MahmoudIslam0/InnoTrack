using InnoTrack.Application.DTOs.AI;

namespace InnoTrack.Application.Interfaces
{
    public interface IPythonAiClient
    {
        Task<PythonAiResponseDto> AnalyzeProjectAsync(PythonAiRequestDto request);
        Task<GenerateAbstractResponseDto> GenerateProjectAbstractAsync(GenerateAbstractRequestDto request);
    }
}
