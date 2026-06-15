using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Entities.Enums;
using InnoTrack.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace InnoTrack.Infrastructure.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAdminAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
            var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
            var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

            var adminEmail = configuration["AdminSeed:Email"]
                ?? throw new InvalidOperationException("AdminSeed:Email not configured.");

            var adminPassword = configuration["AdminSeed:Password"]
                ?? throw new InvalidOperationException("AdminSeed:Password not configured.");

            var adminExists = await unitOfWork.Repository<User>().FindAsync(u => u.Role == UserRole.Admin);

            if (adminExists == null)
            {
                var adminUser = new User
                {
                    FirstName = "System",
                    LastName = "Admin",
                    Email = adminEmail,
                    PasswordHash = passwordHasher.Hash(adminPassword),
                    Role = UserRole.Admin,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                await unitOfWork.Repository<User>().AddAsync(adminUser);
                await unitOfWork.CompleteAsync();
            }
        }

        public static async Task SeedProfessorAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
            var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

            var profEmail = "MAY.GALLAB@fci.bu.edu.eg";

            var profExists = await unitOfWork.Repository<User>().FindAsync(u => u.Email == profEmail);

            if (profExists == null)
            {
                var professor = new Professor
                {
                    FirstName = "Mai",
                    LastName = "Kamal",
                    Email = profEmail,
                    PasswordHash = passwordHasher.Hash("DrMai@Fci2026!"),
                    Role = UserRole.Professor,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = DateTime.UtcNow,

                    DepartmentId = 1,
                    MaxTeamLoad = 9
                };

                await unitOfWork.Repository<Professor>().AddAsync(professor);
                await unitOfWork.CompleteAsync();
            }
        }

        /// <summary>
        /// Seeds a default active academic year if none exists.
        /// Fixes Bug #3: without this, every student draft creation throws 409
        /// because Project.AcademicYearId is non-nullable.
        /// </summary>
        public static async Task SeedAcademicYearAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

            var hasActiveYear = await unitOfWork.Repository<AcademicYear>()
                .AnyAsync(y => y.IsActive);

            if (!hasActiveYear)
            {
                var now = DateTime.UtcNow;
                var currentYear = now.Year;

                // Convention: academic year runs Sept 1 → June 30 the following year
                var academicYear = new AcademicYear
                {
                    Name = $"{currentYear}/{currentYear + 1}",
                    StartDate = new DateTime(currentYear, 9, 1, 0, 0, 0, DateTimeKind.Utc),
                    EndDate = new DateTime(currentYear + 1, 6, 30, 0, 0, 0, DateTimeKind.Utc),
                    IsActive = true
                };

                await unitOfWork.Repository<AcademicYear>().AddAsync(academicYear);
                await unitOfWork.CompleteAsync();
            }

        }
    }
}