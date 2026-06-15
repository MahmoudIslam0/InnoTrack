# InnoTrack Backend

Welcome to the backend API for the InnoTrack System! This project is a robust, scalable backend built with .NET using Clean Architecture principles to manage business logic, data persistence, and real-time communication for the platform.

## 🚀 Tech Stack

- **Framework:** .NET (C#)
- **Architecture:** Clean Architecture
- **Database ORM:** Entity Framework Core
- **Database System:** SQL Server / Azure SQL (configured via connection strings)
- **Authentication/Authorization:** JWT (JSON Web Tokens) & BCrypt Password Hashing
- **Real-time Communication:** SignalR Hubs
- **Containerization:** Docker & Docker Compose

## 📁 Project Structure

The solution (`InnoTrack.slnx`) is divided into distinct layers following Clean Architecture principles:

- **`InnoTrack.Domain`**: Contains the core enterprise logic and entities (e.g., Users, Projects, Teams, Skills). This layer has no external dependencies.
- **`InnoTrack.Application`**: Contains the business logic, interfaces, services, and Data Transfer Objects (DTOs).
- **`InnoTrack.Infrastructure`**: Contains the database context (`ApplicationDbContext`), migrations, repositories, and external services (e.g., EmailService, Identity/JWT configurations).
- **`InnoTrack.API`**: The presentation layer. Contains the REST controllers, SignalR hubs, and application startup configuration (`Program.cs`, `appsettings.json`).
- **`InnoTrack.Tests`**: Contains unit and integration tests to ensure code reliability.

## 🛠️ Getting Started

### Prerequisites
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (or whichever version the `.csproj` specifies)
- [SQL Server](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) (or Docker to run SQL Server)
- [Visual Studio](https://visualstudio.microsoft.com/) / [Rider](https://www.jetbrains.com/rider/) or VS Code

### Configuration
1. Navigate to the `InnoTrack.API` folder.
2. Update the `appsettings.Development.json` or `appsettings.json` file to include your database connection string and JWT settings.

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=InnoTrackDb;Trusted_Connection=True;MultipleActiveResultSets=true;Encrypt=False"
  },
  "JwtSettings": {
    "Secret": "YourSuperSecretKeyHere",
    "Issuer": "InnoTrack",
    "Audience": "InnoTrackUsers"
  }
}
```

### Running the Application (Local)

1. **Apply Migrations**: Navigate to the `InnoTrack.Infrastructure` (or run from the API project targeting the infrastructure) to update the database schema.
   ```bash
   dotnet ef database update --project InnoTrack.Infrastructure --startup-project InnoTrack.API
   ```
2. **Start the API**:
   ```bash
   cd InnoTrack.API
   dotnet run
   ```
   The API will typically start on `http://localhost:5000` or `https://localhost:5001`.

### Running with Docker Compose

A `docker-compose.yml` file is provided in the root of the backend directory. To run the API and a database instance inside Docker containers:

```bash
docker-compose up -d --build
```

This will spin up all necessary services. Check the `docker-compose.yml` file for exposed ports and environment variables.
