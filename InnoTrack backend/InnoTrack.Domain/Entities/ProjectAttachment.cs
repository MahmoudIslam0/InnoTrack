using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InnoTrack.Domain.Entities
{
    public class ProjectAttachment
    {
        public int Id { get; set; }

        [Required, MaxLength(255)]
        public string FileName { get; set; } = null!;

        [Required, MaxLength(255)]
        public string OriginalName { get; set; } = null!;


        [MaxLength(50)]
        public string? ContentType { get; set; } // (pdf, docx, zip)

        public long FileSize { get; set; } // Bytes حجم الملف بالـ

        [Required, Column(TypeName = "nvarchar(max)")] // الـ URL ممكن يكون طويل جداً لو بتستخدم Cloud Storage
        public string FilePath { get; set; } = null!;

        public DateTime UploadDate { get; set; } = DateTime.UtcNow;

        [Required]
        public int UploaderId { get; set; }

        [ForeignKey(nameof(UploaderId))]
        public User Uploader { get; set; } = null!; // عشان نعرف مين الطالب اللي رفع الملف

        [Required]
        public int ProjectId { get; set; }

        [ForeignKey(nameof(ProjectId))]
        public virtual Project Project { get; set; } = null!;

    }
}
