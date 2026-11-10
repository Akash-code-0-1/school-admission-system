FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["SchoolAdmission.Api/SchoolAdmission.Api.csproj", "SchoolAdmission.Api/"]
RUN dotnet restore "SchoolAdmission.Api/SchoolAdmission.Api.csproj"

COPY . .
WORKDIR "/src/SchoolAdmission.Api"
RUN dotnet publish "SchoolAdmission.Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "SchoolAdmission.Api.dll"]