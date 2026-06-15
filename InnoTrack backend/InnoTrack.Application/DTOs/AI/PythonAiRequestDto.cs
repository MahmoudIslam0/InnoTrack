using System.Text.Json.Serialization;

namespace InnoTrack.Application.DTOs.AI
{
    public class PythonAiRequestDto
    {
        [JsonPropertyName("title")]
        public string Title { get; set; }

        [JsonPropertyName("description")]
        public string Description { get; set; }

        [JsonPropertyName("abstract")]
        public string Abstract { get; set; }

        [JsonPropertyName("features")]
        public List<string> Features { get; set; } = new List<string>();

        [JsonPropertyName("top_k")]
        public int TopK { get; set; } = 5;

        public PythonAiRequestDto(string title, string description, string abstractText, List<string>? features = null, int topK = 5)
        {
            Title = title ?? string.Empty;
            Description = description ?? string.Empty;
            Abstract = abstractText ?? string.Empty;
            Features = features ?? new List<string>();
            TopK = topK;
        }
    }
}