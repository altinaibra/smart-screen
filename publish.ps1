<#
  Publikon Smart Screen (backend .NET + frontend React) në një dosje të vetme.

  Shembuj:
    .\publish.ps1                          # -> .\publish (kërkon .NET 9 Runtime në server)
    .\publish.ps1 -SelfContained           # -> përfshin .NET brenda, s'ka nevojë për instalim
    .\publish.ps1 -Output D:\Sites\SmartScreen
#>
param(
    [string]$Output = "$PSScriptRoot\publish",
    [switch]$SelfContained,
    [string]$Runtime = "win-x64"
)

$ErrorActionPreference = 'Stop'
$project = "$PSScriptRoot\backend\SmartScreen.Api\SmartScreen.Api.csproj"

$publishArgs = @('publish', $project, '-c', 'Release', '-o', $Output)
if ($SelfContained) { $publishArgs += @('-r', $Runtime, '--self-contained', 'true') }

Write-Host "==> Ndërtimi i frontend-it + backend-it..." -ForegroundColor Cyan
& dotnet @publishArgs
if ($LASTEXITCODE -ne 0) { throw "dotnet publish dështoi." }

Write-Host ""
Write-Host "==> Gati: $Output" -ForegroundColor Green
Write-Host "    Para se ta nisni në server, ndryshoni te appsettings.json: Jwt:Key dhe Admin:Password."
Write-Host "    Nisja pa IIS:  cd `"$Output`"; .\SmartScreen.Api.exe"
