using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InnoTrack.Domain.Entities
{
    public class ChatMessageHidden
    {
        public int Id { get; set; }

        [Required]
        public int ChatMessageId { get; set; }
        [ForeignKey(nameof(ChatMessageId))]
        public ChatMessage ChatMessage { get; set; } = null!;

        [Required]
        public int UserId { get; set; }
        [ForeignKey(nameof(UserId))]
        public User User { get; set; } = null!;

        public DateTime HiddenAt { get; set; } = DateTime.UtcNow;
    }
}
