FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src
COPY FinancialMonitor.Api/FinancialMonitor.Api.csproj FinancialMonitor.Api/
RUN dotnet restore FinancialMonitor.Api
COPY FinancialMonitor.Api/ FinancialMonitor.Api/
RUN dotnet publish FinancialMonitor.Api -c Release --no-restore -o /app /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app
COPY --from=build /app .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "FinancialMonitor.Api.dll"]
