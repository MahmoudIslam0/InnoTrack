using AutoMapper;
using InnoTrack.Application.DTOs.Lookups;
using InnoTrack.Application.DTOs.Teams;
using InnoTrack.Domain.Entities;

namespace InnoTrack.Application.Mappings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            CreateMap<Department, DepartmentDto>().ReverseMap();
            CreateMap<Team, TeamResponseDto>().ReverseMap();
            CreateMap<Domain.Entities.Domain, DomainDto>().ReverseMap();
            CreateMap<Technology, TechnologyDto>();
        }
    }
}
