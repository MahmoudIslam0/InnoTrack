using InnoTrack.Application.DTOs.Admin;
using InnoTrack.Application.DTOs.Students;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.Application.Services
{
    public class StudentService : IStudentService
    {
        private readonly IUnitOfWork _unitOfWork;

        public StudentService(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        public async Task<StudentProfileDto> GetStudentProfileAsync(int userId)
        {
            var student = await _unitOfWork.Repository<Student>().GetByIdAsync(userId);
            if (student == null)
                throw new KeyNotFoundException("Student profile not found.");

            var department = await _unitOfWork.Repository<Department>().GetByIdAsync(student.DepartmentId);

            var hasTeam = await _unitOfWork.Repository<TeamMember>().AnyAsync(tm => tm.StudentId == userId);

            var skills = await GetStudentSkillNamesAsync(userId);

            return new StudentProfileDto(
                student.Id,
                student.FirstName,
                student.LastName,
                student.Email,
                student.DepartmentId,
                department?.Name ?? string.Empty,
                student.GPA,
                student.GraduationYear,
                hasTeam,
                skills,
                student.ProfilePictureURL,
                student.ProfileBannerColor
                );
        }

        public async Task PatchStudentProfileAsync(int studentId, PatchStudentProfileDto dto)
        {
            var student = await _unitOfWork.Repository<Student>().GetByIdAsync(studentId);
            if (student == null) throw new KeyNotFoundException("Student not found.");

            if (dto.GPA.HasValue)
                student.GPA = dto.GPA.Value;

            if (dto.ProfileBannerColor != null)
                student.ProfileBannerColor = dto.ProfileBannerColor;

            _unitOfWork.Repository<Student>().Update(student);

            if (dto.Skills != null)
            {
                var oldSkills = await _unitOfWork.Repository<StudentSkill>()
                    .GetAllAsync(ss => ss.StudentId == studentId);

                foreach (var oldSkill in oldSkills)
                {
                    _unitOfWork.Repository<StudentSkill>().Delete(oldSkill);
                }

                var uniqueSkills = dto.Skills.Select(s => s.Trim().ToLower()).Distinct().ToList();

                foreach (var skillName in uniqueSkills)
                {
                    if (string.IsNullOrWhiteSpace(skillName)) continue;

                    var existingSkill = await _unitOfWork.Repository<Skill>()
                        .GetQueryable()
                        .FirstOrDefaultAsync(s => s.Name.ToLower() == skillName);

                    int skillId;

                    if (existingSkill == null)
                    {
                        var newSkill = new Skill { Name = skillName };
                        await _unitOfWork.Repository<Skill>().AddAsync(newSkill);
                        await _unitOfWork.CompleteAsync();
                        skillId = newSkill.Id;
                    }
                    else
                    {
                        skillId = existingSkill.Id;
                    }

                    var studentSkill = new StudentSkill { StudentId = studentId, SkillId = skillId };
                    await _unitOfWork.Repository<StudentSkill>().AddAsync(studentSkill);
                }
            }

            await _unitOfWork.CompleteAsync();
        }
        public async Task<StudentPublicProfileDto> GetPublicStudentProfileAsync(int studentId)
        {
            var student = await _unitOfWork.Repository<Student>().GetByIdAsync(studentId);
            if (student == null)
                throw new KeyNotFoundException("Student not found.");

            var department = await _unitOfWork.Repository<Department>().GetByIdAsync(student.DepartmentId);

            var skills = await GetStudentSkillNamesAsync(studentId);

            var hasTeam = await _unitOfWork.Repository<TeamMember>().AnyAsync(tm => tm.StudentId == studentId);

            return new StudentPublicProfileDto(
                student.Id,
                student.FullName,
                student.FirstName,
                student.LastName,
                student.Email,
                department?.Name ?? string.Empty,
                student.GPA,
                student.GraduationYear,
                hasTeam,
                skills,
                student.ProfilePictureURL,
                student.ProfileBannerColor
            );
        }
        private async Task<IReadOnlyList<string>> GetStudentSkillNamesAsync(int studentId)
        {
            var studentSkills = await _unitOfWork.Repository<StudentSkill>()
                .GetAllAsync(ss => ss.StudentId == studentId);

            var skills = new List<string>();
            foreach (var ss in studentSkills)
            {
                var skill = await _unitOfWork.Repository<Skill>().GetByIdAsync(ss.SkillId);
                if (skill != null) skills.Add(skill.Name);
            }
            return skills.AsReadOnly();
        }

        public async Task<IReadOnlyList<StudentAdminViewDto>> GetAllStudentsForAdminAsync()
        {
            var students = await _unitOfWork.Repository<Student>()
                .GetQueryable()
                .AsNoTracking()
                .OrderByDescending(s => s.Id)
                .Select(s => new StudentAdminViewDto(
                    s.Id,
                    s.FullName,
                    s.Email,
                    s.Department.Name,
                    s.GPA,
                    s.GraduationYear,
                    s.IsActive,
                    s.TeamMember != null,
                    s.TeamMember != null ? s.TeamMember.Team.Name : null
                ))
                .ToListAsync();

            return students.AsReadOnly();
        }
    }
}