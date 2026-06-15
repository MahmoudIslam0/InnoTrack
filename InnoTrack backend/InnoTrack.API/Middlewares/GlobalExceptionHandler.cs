using InnoTrack.Application.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace InnoTrack.API.Middlewares
{
    public class GlobalExceptionHandler : IExceptionHandler
    {
        private readonly ILogger<GlobalExceptionHandler> _logger;
        private readonly IHostEnvironment _env;

        public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger, IHostEnvironment env)
        {
            _logger = logger;
            _env = env;
        }

        public async ValueTask<bool> TryHandleAsync
            (HttpContext httpContext,
             Exception exception,
             CancellationToken cancellationToken)
        {
            _logger.LogError(exception, "Exception occured: {Message}", exception.Message);

            var (statusCode, title) = exception switch
            {
                KeyNotFoundException => (StatusCodes.Status404NotFound, "Not Found"),
                UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Unauthorized"),

                ArgumentException => (StatusCodes.Status400BadRequest, "Bad Request"),

                InvalidOperationException => (StatusCodes.Status409Conflict, "Conflict"),
                Microsoft.EntityFrameworkCore.DbUpdateException => (StatusCodes.Status409Conflict, "Conflict"),

                AppException appEx => (appEx.StatusCode, appEx.GetType().Name.Replace("Exception", string.Empty)),

                _ => (StatusCodes.Status500InternalServerError, "Server Error")
            };

            var rootCause = exception.GetBaseException().Message;
            var detail = exception.Message;
            
            if (exception is Microsoft.EntityFrameworkCore.DbUpdateException && rootCause.Contains("IX_Users_Email"))
            {
                detail = "This email is already registered.";
            }
            else if (exception.InnerException != null && rootCause != exception.Message)
            {
                detail += $" (Inner issue: {rootCause})";
            }

            // Always return the detail so the frontend/user can see what caused the error
            // Previously this was hidden behind an IsDevelopment() check for 500 errors.

            var problemDetails = new ProblemDetails
            {
                Status = statusCode,
                Title = title,
                Detail = detail
            };

            httpContext.Response.StatusCode = statusCode;
            await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

            return true;
        }
    }
}
