using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace InnoTrack.Application.Services
{
    public class AuditService : IAuditService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<AuditService> _logger;

        public AuditService(IServiceScopeFactory scopeFactory, ILogger<AuditService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }
        public void LogAction(int userId, string action, string details)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
                    await uow.Repository<AuditLog>().AddAsync(new AuditLog
                    {
                        UserId = userId,
                        Action = action,
                        Details = details,
                        Timestamp = DateTime.UtcNow
                    });
                    await uow.CompleteAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to write audit log for user {UserId}, action {Action}",
                        userId, action);
                }
            });

        }
    }
}
