using InnoTrack.Domain.Entities.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InnoTrack.Domain.Entities
{
    public class ChatMessage
    {
        public int Id { get; set; }

        [Required, MaxLength(2000)]
        public string Content { get; set; } = null!;
        public MessageType Type { get; set; } = MessageType.Text;

        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        [Required]
        public int ChatRoomId { get; set; }
        public ChatRoom ChatRoom { get; set; } = null!;

        [Required]
        public int SenderId { get; set; }

        [ForeignKey(nameof(SenderId))]
        public User Sender { get; set; } = null!;
        public ICollection<ChatMessageAttachment> Attachments { get; set; } = new HashSet<ChatMessageAttachment>();

        public bool IsEdited { get; set; }
        public bool IsDeletedForAll { get; set; }
        public bool IsPinned { get; set; }

        public int? ParentMessageId { get; set; }
        [ForeignKey(nameof(ParentMessageId))]
        public ChatMessage? ParentMessage { get; set; }

        public ICollection<ChatMessageReaction> Reactions { get; set; } = new HashSet<ChatMessageReaction>();
        public ICollection<ChatMessageHidden> HiddenForUsers { get; set; } = new HashSet<ChatMessageHidden>();

    }
}
