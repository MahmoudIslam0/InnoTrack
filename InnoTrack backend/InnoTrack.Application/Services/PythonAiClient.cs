using InnoTrack.Application.DTOs.AI;
using InnoTrack.Application.Exceptions;
using InnoTrack.Application.Interfaces;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;
using System.Text.Json;

namespace InnoTrack.Application.Services
{
    public class PythonAiClient : IPythonAiClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<PythonAiClient> _logger;

        public PythonAiClient(HttpClient httpClient, ILogger<PythonAiClient> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<PythonAiResponseDto> AnalyzeProjectAsync(PythonAiRequestDto request)
        {
            var response = await _httpClient.PostAsJsonAsync("analyze", request);
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                
                // Try to parse FastAPI validation error
                if (response.StatusCode == System.Net.HttpStatusCode.UnprocessableEntity)
                {
                    try
                    {
                        var json = JsonDocument.Parse(errorContent);
                        if (json.RootElement.TryGetProperty("detail", out var detailArray) && detailArray.ValueKind == JsonValueKind.Array && detailArray.GetArrayLength() > 0)
                        {
                            var firstError = detailArray[0];
                            if (firstError.TryGetProperty("msg", out var msgElement))
                            {
                                var fieldName = "Field";
                                if (firstError.TryGetProperty("loc", out var locArray) && locArray.ValueKind == JsonValueKind.Array && locArray.GetArrayLength() > 1)
                                {
                                    var locVal = locArray[1].GetString();
                                    if (!string.IsNullOrEmpty(locVal))
                                    {
                                        fieldName = char.ToUpper(locVal[0]) + locVal.Substring(1);
                                    }
                                }
                                throw new ExternalServiceException($"{fieldName}: {msgElement.GetString()}");
                            }
                        }
                    }
                    catch (JsonException) { /* Fallback to raw error if parsing fails */ }
                }

                throw new ExternalServiceException($"AI Service Error ({response.StatusCode}): {errorContent}");
            }

            var result = await response.Content.ReadFromJsonAsync<PythonAiResponseDto>();

            if (result == null)
                throw new ExternalServiceException("AI Service returned an empty or invalid response.");

            return result;
        }

        public async Task<GenerateAbstractResponseDto> GenerateProjectAbstractAsync(GenerateAbstractRequestDto request)
        {
            try
            {
                var response = await _httpClient.PostAsJsonAsync("/generate-abstract", request);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("AI Service returned {StatusCode} when generating abstract.", response.StatusCode);
                    throw new Exception("AI Service is currently unavailable. Please try again later.");
                }

                var result = await response.Content.ReadFromJsonAsync<GenerateAbstractResponseDto>();
                if (result == null || string.IsNullOrWhiteSpace(result.GeneratedAbstract))
                {
                    throw new Exception("AI Service returned an empty abstract.");
                }

                return result;
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Failed to connect to the Python AI microservice.");
                throw new ExternalServiceException("Could not connect to the AI Assistant. Make sure the AI service is running.");
            }
        }
    }
}
