param([ValidateSet('win-x64', 'win-arm64')][string]$Runtime = 'win-x64')
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location (Join-Path $Root 'frontend')
try {
    npm run build:screensaver
    if ($LASTEXITCODE -ne 0) { throw 'Screensaver asset build failed' }
} finally { Pop-Location }
$Output = Join-Path $Root "screensaver/build/windows/$Runtime"
dotnet publish (Join-Path $PSScriptRoot 'GutsyShinobi.csproj') -c Release -r $Runtime --self-contained true -o $Output
if ($LASTEXITCODE -ne 0) { throw 'Windows screensaver build failed' }
# A .scr is a renamed Windows apphost. Keep its managed DLL, runtime libraries,
# WebView2 loader and Web folder together when copying the resulting package.
Move-Item -Force (Join-Path $Output 'GutsyShinobi.exe') (Join-Path $Output 'GutsyShinobi.scr')
Write-Output "Built $Output/GutsyShinobi.scr. Keep all accompanying files."
# Build the offline payload and a self-contained .NET 10 Windows saver package.
# Run on Windows with Node/npm and the .NET SDK already installed. The target
# machine needs WebView2 Evergreen Runtime. This script does not install a saver,
# change registry/lock settings, or apply an Authenticode release signature.
