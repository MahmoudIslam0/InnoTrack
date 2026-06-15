# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["InnoTrack.API/InnoTrack.API.csproj", "InnoTrack.API/"]
COPY ["InnoTrack.Application/InnoTrack.Application.csproj", "InnoTrack.Application/"]
COPY ["InnoTrack.Domain/InnoTrack.Domain.csproj", "InnoTrack.Domain/"]
COPY ["InnoTrack.Infrastructure/InnoTrack.Infrastructure.csproj", "InnoTrack.Infrastructure/"]
RUN dotnet restore "InnoTrack.API/InnoTrack.API.csproj"
COPY . .
WORKDIR "/src/InnoTrack.API"
RUN dotnet build "InnoTrack.API.csproj" -c Release -o /app/build

# Publish Stage
FROM build AS publish
RUN dotnet publish "InnoTrack.API.csproj" -c Release -o /app/publish

# Final Run Stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

COPY --from=publish /app/publish .

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "InnoTrack.API.dll"]