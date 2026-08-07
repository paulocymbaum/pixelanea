# Stage Windows desktop assets for Tauri NSIS bundle and portable zip.
#
# Usage:
#   .\scripts\stage-windows-desktop.ps1
#   .\scripts\stage-windows-desktop.ps1 -PortableDir dist\pixelanea-1.1.0-windows-x64
#   .\scripts\stage-windows-desktop.ps1 -BundleOnly
param(
    [string]$PortableDir = "",
    [switch]$BundleOnly
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
$Version = (Get-Content -Raw (Join-Path $RootDir "VERSION")).Trim()
$TauriDir = Join-Path $RootDir "apps\desktop\src-tauri"
$BundleResources = Join-Path $TauriDir "bundle-resources\pixelanea"
$ServerExe = Join-Path $RootDir "server\build\pixelanea-server.exe"
$WebDist = Join-Path $RootDir "apps\web\dist"
$ShellExe = Join-Path $TauriDir "target\release\pixelanea-shell.exe"

function Test-BuildInputs {
    if (-not (Test-Path $ServerExe)) {
        throw "Missing $ServerExe — run .\scripts\build-desktop-windows.ps1 first"
    }
    if (-not (Test-Path (Join-Path $WebDist "index.html"))) {
        throw "Missing $WebDist\index.html — run .\scripts\build-desktop-windows.ps1 first"
    }
}

function Copy-CoreAssets {
    param([string]$TargetDir)

    New-Item -ItemType Directory -Force -Path (Join-Path $TargetDir "web") | Out-Null
    Copy-Item -Force $ServerExe (Join-Path $TargetDir "pixelanea-server.exe")
    Copy-Item -Recurse -Force (Join-Path $WebDist "*") (Join-Path $TargetDir "web")
    if (Test-Path (Join-Path $WebDist ".pixelanea-assets-hash")) {
        Remove-Item -Force (Join-Path $TargetDir "web\.pixelanea-assets-hash") -ErrorAction SilentlyContinue
    }
    Copy-Item -Force (Join-Path $RootDir "brand\logo-glyph.svg") (Join-Path $TargetDir "logo-glyph.svg")
    Copy-Item -Force (Join-Path $RootDir "brand\app-icon.svg") (Join-Path $TargetDir "app-icon.svg")
}

function Stage-ShellBinary {
    param([string]$TargetDir)

    if (-not (Test-Path $ShellExe)) {
        throw "Missing $ShellExe — build pixelanea-shell (cargo tauri build) before staging portable layout"
    }
    Copy-Item -Force $ShellExe (Join-Path $TargetDir "pixelanea-shell.exe")
}

Test-BuildInputs

if (Test-Path $BundleResources) {
    Remove-Item -Recurse -Force $BundleResources
}
New-Item -ItemType Directory -Force -Path $BundleResources | Out-Null
Copy-CoreAssets -TargetDir $BundleResources
Write-Host "Staged Tauri bundle resources: $BundleResources"

if ($BundleOnly) {
    return
}

if ([string]::IsNullOrWhiteSpace($PortableDir)) {
    $PortableDir = Join-Path $RootDir "dist\pixelanea-$Version-windows-x64"
}

if (Test-Path $PortableDir) {
    Remove-Item -Recurse -Force $PortableDir
}
New-Item -ItemType Directory -Force -Path $PortableDir | Out-Null
Copy-CoreAssets -TargetDir $PortableDir
Stage-ShellBinary -TargetDir $PortableDir

$Readme = @"
Pixelanea $Version — Windows x64

Quick start (portable — no install):
  Extract this folder, then double-click pixelanea-shell.exe

Requires: Windows 10 x64 or later, Microsoft Edge WebView2 runtime (preinstalled on current Windows).

Release assets:
  Installer: pixelanea-$Version-windows-x64-setup.exe
  Portable:  pixelanea-$Version-windows-x64.zip
"@
Set-Content -Path (Join-Path $PortableDir "README.txt") -Value $Readme -Encoding UTF8

Write-Host "Staged portable layout: $PortableDir"
