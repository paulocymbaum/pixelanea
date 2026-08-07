# Package Pixelanea for Windows (NSIS installer + portable zip).
#
# Usage:
#   .\scripts\package-windows.ps1
#
# Output:
#   dist\pixelanea-{version}-windows-x64-setup.exe
#   dist\pixelanea-{version}-windows-x64.zip
param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
$Version = (Get-Content -Raw (Join-Path $RootDir "VERSION")).Trim()
$TauriDir = Join-Path $RootDir "apps\desktop\src-tauri"
$DistDir = Join-Path $RootDir "dist"
$PortableDir = Join-Path $DistDir "pixelanea-$Version-windows-x64"
$PortableZip = Join-Path $DistDir "pixelanea-$Version-windows-x64.zip"
$SetupExe = Join-Path $DistDir "pixelanea-$Version-windows-x64-setup.exe"

function Ensure-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name not found"
    }
}

function Find-NsisInstaller {
    $BundleDir = Join-Path $TauriDir "target\release\bundle\nsis"
    if (-not (Test-Path $BundleDir)) {
        throw "NSIS bundle directory missing: $BundleDir"
    }
    $installer = Get-ChildItem -Path $BundleDir -Filter "*-setup.exe" -File | Select-Object -First 1
    if (-not $installer) {
        $installer = Get-ChildItem -Path $BundleDir -Filter "*.exe" -File | Select-Object -First 1
    }
    if (-not $installer) {
        throw "No NSIS installer found under $BundleDir"
    }
    return $installer.FullName
}

Ensure-Command cargo

if (-not $SkipBuild) {
    & (Join-Path $RootDir "scripts\build-desktop-windows.ps1")

    Write-Host "==> Staging Tauri bundle resources"
    & (Join-Path $RootDir "scripts\stage-windows-desktop.ps1") -BundleOnly

    Write-Host "==> Building pixelanea-shell (release, nsis bundle)"
    Push-Location $TauriDir
    try {
        if (-not $env:TAURI_CLI_VERSION) {
            $env:TAURI_CLI_VERSION = "2.0.0"
        }
        cargo tauri build --bundles nsis
    }
    finally {
        Pop-Location
    }

    Write-Host "==> Staging portable layout"
    & (Join-Path $RootDir "scripts\stage-windows-desktop.ps1") -PortableDir $PortableDir
}
else {
    if (-not (Test-Path $PortableDir)) {
        & (Join-Path $RootDir "scripts\stage-windows-desktop.ps1") -PortableDir $PortableDir
    }
}

New-Item -ItemType Directory -Force -Path $DistDir | Out-Null

$NsisSource = Find-NsisInstaller
Copy-Item -Force $NsisSource $SetupExe

if (Test-Path $PortableZip) {
    Remove-Item -Force $PortableZip
}
Compress-Archive -Path $PortableDir -DestinationPath $PortableZip -Force

Write-Host ""
Write-Host "Windows release package ready:"
Write-Host "  Installer: $SetupExe"
Write-Host "  Portable:  $PortableZip"
Write-Host ""
Write-Host "Portable run:"
Write-Host "  cd $PortableDir"
Write-Host "  .\pixelanea-shell.exe"
