using InnoTrack.Domain.Entities.Enums;
using Microsoft.AspNetCore.Authorization;

namespace InnoTrack.API.Attributes
{
    public class AuthorizeRolesAttribute : AuthorizeAttribute
    {
        public AuthorizeRolesAttribute(params UserRole[] allowedRoles)
        {
            var allowedRolesAsStrings = allowedRoles.Select(x => Enum.GetName(typeof(UserRole), x));
            Roles = string.Join(",", allowedRolesAsStrings);
        }
    }
}
