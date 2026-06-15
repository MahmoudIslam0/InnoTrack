namespace InnoTrack.Application.Interfaces
{
    public interface IAuditService
    {
        void LogAction(int userId, string action, string details);
    }
}
