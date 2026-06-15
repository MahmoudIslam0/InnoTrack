using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Entities.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace InnoTrack.Infrastructure.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
                    : base(options)
        {
        }

        // --- 1. Users & Roles (Inheritance TPH) ---
        public DbSet<User> Users { get; set; }
        public DbSet<Student> Students { get; set; }
        public DbSet<Professor> Professors { get; set; }

        // --- 2. Academic Structure ---
        public DbSet<Department> Departments { get; set; }
        public DbSet<Skill> Skills { get; set; }
        public DbSet<StudentSkill> StudentSkills { get; set; }

        // --- 3. Teams & Workflow ---
        public DbSet<Team> Teams { get; set; }
        public DbSet<TeamMember> TeamMembers { get; set; }
        public DbSet<JoinRequest> JoinRequests { get; set; }

        // --- 4. Projects & AI Core ---
        public DbSet<Project> Projects { get; set; }
        public DbSet<ProjectDraft> ProjectDrafts { get; set; }
        public DbSet<ProjectDraftTechnology> ProjectDraftTechnologies { get; set; }
        public DbSet<Domain.Entities.Domain> Domains { get; set; }
        public DbSet<Technology> Technologies { get; set; }
        public DbSet<ProjectTechnology> ProjectTechnologies { get; set; }
        public DbSet<ProjectAttachment> ProjectAttachments { get; set; }
        public DbSet<ProjectActivityLog> ProjectActivityLogs { get; set; }
        public DbSet<ProjectNotificationPreference> ProjectNotificationPreferences { get; set; }

        // --- 5. AI Analysis Data ---
        public DbSet<VectorEmbedding> VectorEmbeddings { get; set; }
        public DbSet<OriginalityReport> OriginalityReports { get; set; }
        public DbSet<SimilarProject> SimilarProjects { get; set; }

        // --- 6. Communication & Feedback ---
        public DbSet<ChatRoom> ChatRooms { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<ChatMessageAttachment> ChatMessageAttachments { get; set; }
        public DbSet<ChatMessageReaction> ChatMessageReactions { get; set; }
        public DbSet<ChatMessageHidden> ChatMessageHiddens { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<Feedback> Feedbacks { get; set; }

        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<AcademicYear> AcademicYears { get; set; }
        public DbSet<OtpVerification> OtpVerifications { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder); // Always call base first

            foreach (var relationship in modelBuilder.Model.GetEntityTypes()
                                                          .SelectMany(e => e.GetForeignKeys()))
            {
                relationship.DeleteBehavior = DeleteBehavior.Restrict;
            }

            modelBuilder.Entity<User>()
                        .ToTable("Users")
                        .HasDiscriminator(u => u.Role)
                        .HasValue<Student>(UserRole.Student)
                        .HasValue<Professor>(UserRole.Professor)
                        .HasValue<User>(UserRole.Admin);


            modelBuilder.Entity<User>()
                        .HasIndex(u => u.Email)
                        .IsUnique()
                        .HasFilter("[IsDeleted] = 0");

            modelBuilder.Entity<Team>()
                        .HasIndex(t => t.JoinCode)
                        .IsUnique();

            modelBuilder.Entity<Department>()
                        .HasIndex(d => d.Code)
                        .IsUnique();

            modelBuilder.Entity<TeamMember>()
                        .HasIndex(tm => tm.StudentId)
                        .IsUnique();

            modelBuilder.Entity<JoinRequest>()
                        .HasIndex(r => new { r.StudentId, r.TeamId })
                        .IsUnique()
                        .HasFilter("[Status] = 'Pending'");

            modelBuilder.Entity<Skill>()
                        .HasIndex(s => s.Name)
                        .IsUnique();

            modelBuilder.Entity<Domain.Entities.Domain>()
                        .HasIndex(d => d.Name)
                        .IsUnique();

            modelBuilder.Entity<Technology>()
                        .HasIndex(t => t.Name)
                        .IsUnique();

            // Notification inbox query — the most frequent read in the app:
            modelBuilder.Entity<Notification>()
                        .HasIndex(n => new { n.UserId, n.IsRead, n.CreatedAt });

            // Finding a team's project (used on every project page load):
            modelBuilder.Entity<Project>()
                        .HasIndex(p => p.TeamId)
                        .IsUnique()
                        .HasFilter("[TeamId] IS NOT NULL");

            // Similarity engine — fetching embeddings by project:
            modelBuilder.Entity<VectorEmbedding>()
                        .HasIndex(v => v.ProjectId);

            // Checking pending requests:
            modelBuilder.Entity<JoinRequest>()
                        .HasIndex(r => new { r.TeamId, r.Status });

            // Chat history — most recent messages first:
            modelBuilder.Entity<ChatMessage>()
                        .HasIndex(m => new { m.ChatRoomId, m.SentAt });

            // Reports ordered by generation time:
            modelBuilder.Entity<OriginalityReport>()
                        .HasIndex(r => new { r.ProjectId, r.GeneratedAt });

            modelBuilder.Entity<AuditLog>(b =>
            {
                b.Property(a => a.Action)
                 .IsRequired()
                 .HasMaxLength(100);

                b.Property(a => a.Details)
                 .HasMaxLength(2000);

                b.HasIndex(a => a.UserId);
                b.HasIndex(a => a.Timestamp);

                b.HasIndex(a => new { a.UserId, a.Timestamp });

            });
            modelBuilder.Entity<AuditLog>()
                        .HasOne<User>()
                        .WithMany()
                        .HasForeignKey(a => a.UserId)
                        .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<User>().HasQueryFilter(u => !u.IsDeleted);

            modelBuilder.Entity<JoinRequest>()
                        .Property(r => r.Status)
                        .HasConversion<string>()
                        .HasMaxLength(20);

            modelBuilder.Entity<Project>()
                        .ToTable(tb => tb.HasTrigger("SomeTrigger"))
                        .Property(p => p.Status)
                        .HasConversion<string>()
                        .HasMaxLength(20);

            modelBuilder.Entity<Notification>()
                        .Property(n => n.Type)
                        .HasConversion<string>()
                        .HasMaxLength(20);

            modelBuilder.Entity<Notification>()
                        .Property(n => n.ReferenceType)
                        .HasConversion<string>()
                        .HasMaxLength(20);

            modelBuilder.Entity<User>()
                        .Property(u => u.Role)
                        .HasConversion<string>()
                        .HasMaxLength(20);

            modelBuilder.Entity<TeamMember>()
                        .Property(m => m.Role)
                        .HasConversion<string>()
                        .HasMaxLength(25);


            modelBuilder.Entity<ChatMessage>()
                        .Property(m => m.Type)
                        .HasConversion<string>()
                        .HasMaxLength(20);


            modelBuilder.Entity<ProjectTechnology>()
                        .HasKey(pt => new { pt.ProjectId, pt.TechnologyId });

            modelBuilder.Entity<ProjectDraftTechnology>()
                        .HasKey(dt => new { dt.ProjectDraftId, dt.TechnologyId });

            modelBuilder.Entity<ProjectDraftTechnology>()
                        .HasOne(dt => dt.ProjectDraft)
                        .WithMany(d => d.DraftTechnologies)
                        .HasForeignKey(dt => dt.ProjectDraftId)
                        .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectDraftTechnology>()
                        .HasOne(dt => dt.Technology)
                        .WithMany()
                        .HasForeignKey(dt => dt.TechnologyId)
                        .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ProjectDraft>()
                        .HasOne(d => d.Team)
                        .WithMany(t => t.ProjectDrafts)
                        .HasForeignKey(d => d.TeamId)
                        .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectDraft>()
                        .HasOne(d => d.CreatedByUser)
                        .WithMany()
                        .HasForeignKey(d => d.CreatedByUserId)
                        .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ProjectDraft>()
                        .HasOne(d => d.Domain)
                        .WithMany()
                        .HasForeignKey(d => d.DomainId)
                        .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ProjectTechnology>()
                        .HasOne(pt => pt.Technology)
                        .WithMany(t => t.ProjectTechnologies)
                        .HasForeignKey(pt => pt.TechnologyId);

            modelBuilder.Entity<StudentSkill>()
                        .HasKey(ss => new { ss.StudentId, ss.SkillId });

            modelBuilder.Entity<StudentSkill>()
                        .HasOne(ss => ss.Student)
                        .WithMany(s => s.StudentSkills)
                        .HasForeignKey(ss => ss.StudentId);

            modelBuilder.Entity<StudentSkill>()
                        .HasOne(ss => ss.Skill)
                        .WithMany(s => s.StudentSkills)
                        .HasForeignKey(ss => ss.SkillId);

            modelBuilder.Entity<Team>()
                        .HasOne(t => t.Supervisor)
                        .WithMany(p => p.SupervisedTeams)
                        .HasForeignKey(t => t.ProfessorId)
                        .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Project>()
                        .HasOne(p => p.VectorEmbedding)
                        .WithOne(v => v.Project)
                        .HasForeignKey<VectorEmbedding>(v => v.ProjectId)
                        .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<OriginalityReport>()
                        .HasOne(r => r.Project)
                        .WithMany(p => p.OriginalityReports)
                        .HasForeignKey(r => r.ProjectId)
                        .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Team>()
                        .HasOne(t => t.ChatRoom)
                        .WithOne(c => c.Team)
                        .HasForeignKey<ChatRoom>(c => c.TeamId)
                        .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Team>()
                        .HasOne(t => t.Project)
                        .WithOne(p => p.Team)
                        .HasForeignKey<Project>(p => p.TeamId)
                        .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<ChatMessage>()
                        .HasOne(m => m.Sender)
                        .WithMany()
                        .HasForeignKey(m => m.SenderId)
                        .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Notification>()
                        .HasOne(n => n.User)
                        .WithMany()
                        .HasForeignKey(n => n.UserId)
                        .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectAttachment>()
                        .HasOne(pa => pa.Project)
                        .WithMany(p => p.Attachments)
                        .HasForeignKey(pa => pa.ProjectId)
                        .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectActivityLog>()
                        .HasOne(l => l.Project)
                        .WithMany()
                        .HasForeignKey(l => l.ProjectId)
                        .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectNotificationPreference>()
                        .HasIndex(p => new { p.UserId, p.ProjectId })
                        .IsUnique();

            modelBuilder.Entity<ProjectNotificationPreference>()
                        .HasOne(p => p.Project)
                        .WithMany()
                        .HasForeignKey(p => p.ProjectId)
                        .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectNotificationPreference>()
                        .HasOne(p => p.User)
                        .WithMany()
                        .HasForeignKey(p => p.UserId)
                        .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectTechnology>()
                        .HasOne(pt => pt.Project)
                        .WithMany(p => p.ProjectTechnologies)
                        .HasForeignKey(pt => pt.ProjectId)
                        .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SimilarProject>()
                        .HasOne(sp => sp.OriginalityReport)
                        .WithMany(r => r.SimilarProjects)
                        .HasForeignKey(sp => sp.OriginalityReportId)
                        .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SimilarProject>()
                         .HasOne(sp => sp.ReferencedProject)
                         .WithMany() // المشروع المرجعي ملوش 'كوليكشن' تشير للمشاريع اللي بتشبهه. *مش محتاجينها
                         .HasForeignKey(sp => sp.ReferencedProjectId)
                         .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Feedback>()
                        .HasOne(f => f.Project)
                        .WithMany(p => p.Feedbacks)
                        .HasForeignKey(f => f.ProjectId)
                        .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Feedback>()
                        .HasOne(f => f.Professor)
                        .WithMany(p => p.Feedbacks)
                        .HasForeignKey(f => f.ProfessorId)
                        .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ChatMessage>()
                        .HasOne(m => m.ChatRoom)
                        .WithMany(r => r.ChatMessages)
                        .HasForeignKey(m => m.ChatRoomId)
                        .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatMessageAttachment>()
                        .HasOne(a => a.ChatMessage)
                        .WithMany(m => m.Attachments)
                        .HasForeignKey(a => a.ChatMessageId)
                        .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatMessageReaction>()
                        .HasOne(r => r.ChatMessage)
                        .WithMany(m => m.Reactions)
                        .HasForeignKey(r => r.ChatMessageId)
                        .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatMessageReaction>()
                        .HasOne(r => r.User)
                        .WithMany()
                        .HasForeignKey(r => r.UserId)
                        .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ChatMessageHidden>()
                        .HasOne(h => h.ChatMessage)
                        .WithMany(m => m.HiddenForUsers)
                        .HasForeignKey(h => h.ChatMessageId)
                        .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatMessageHidden>()
                        .HasOne(h => h.User)
                        .WithMany()
                        .HasForeignKey(h => h.UserId)
                        .OnDelete(DeleteBehavior.Restrict);


            modelBuilder.Entity<User>().Ignore(u => u.FullName);

            modelBuilder.Entity<Student>()
                        .Property(s => s.GPA)
                        .HasPrecision(3, 2);

            modelBuilder.Entity<Project>()
                        .Property(p => p.OriginalityScore)
                        .HasPrecision(5, 2);

            modelBuilder.Entity<ProjectDraft>()
                        .Property(d => d.OriginalityScore)
                        .HasPrecision(5, 2);

            modelBuilder.Entity<OriginalityReport>()
                        .Property(r => r.OverallScore)
                        .HasPrecision(5, 2);

            modelBuilder.Entity<SimilarProject>()
                        .Property(s => s.SimilarityPercentage)
                        .HasPrecision(5, 2);

            modelBuilder.Entity<AcademicYear>(b =>
            {
                b.Property(a => a.Name).IsRequired().HasMaxLength(20);
                b.HasIndex(a => a.IsActive);
            });

            modelBuilder.Entity<Project>()
                .HasOne(p => p.AcademicYear)
                .WithMany(a => a.Projects)
                .HasForeignKey(p => p.AcademicYearId)
                .OnDelete(DeleteBehavior.Restrict);

            var dateTimeConverter = new ValueConverter<DateTime, DateTime>(
                v => v,
                v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

            var nullableDateTimeConverter = new ValueConverter<DateTime?, DateTime?>(
                v => v,
                v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);

            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entityType.GetProperties())
                {
                    if (property.ClrType == typeof(DateTime))
                    {
                        property.SetValueConverter(dateTimeConverter);
                    }
                    else if (property.ClrType == typeof(DateTime?))
                    {
                        property.SetValueConverter(nullableDateTimeConverter);
                    }
                }
            }
        }
    }
}
