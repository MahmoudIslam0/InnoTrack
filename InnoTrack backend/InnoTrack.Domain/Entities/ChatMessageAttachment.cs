using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InnoTrack.Domain.Entities
{
    public class ChatMessageAttachment
    {
        public int Id { get; set; }
        [Required, MaxLength(255)] public string FileName { get; set; } = null!;
        [MaxLength(50)] public string? FileType { get; set; }
        public long FileSize { get; set; }
        [Required, Column(TypeName = "nvarchar(max)")] public string FileUrl { get; set; } = null!;
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
        [Required] public int ChatMessageId { get; set; }
        public ChatMessage ChatMessage { get; set; } = null!;

    }
}
