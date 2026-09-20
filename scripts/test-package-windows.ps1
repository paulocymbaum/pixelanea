# Smoke test Windows desktop packaging (artifact layout + optional silent install).
#
# Usage:
#   .\scripts\test-package-windows.ps1
#   .\scripts\test-package-windows.ps1 -SkipBuild
#   .\scripts\test-package-windows.ps1 -SkipBuild -InstallTest
param(
    [switch]$SkipBuild,
    [switch]$InstallTest
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
$Version = (Get-Content -Raw (Join-Path $RootDir "VERSION")).Trim()
$DistDir = Join-Path $RootDir "dist"
$SetupExe = Join-Path $DistDir "pixelanea-$Version-windows-x64-setup.exe"
$PortableZip = Join-Path $DistDir "pixelanea-$Version-windows-x64.zip"
$PortableDir = Join-Path $DistDir "pixelanea-$Version-windows-x64"
$HealthUrl = "http://127.0.0.1:8787/api/health"
$CreateUrl = "http://127.0.0.1:8787/api/projects"

function Assert-FileExists {
    param([string]$Path, [int]$MinBytes = 1)
    if (-not (Test-Path $Path)) {
        throw "Missing required artifact: $Path"
    }
    $size = (Get-Item $Path).Length
    if ($size -lt $MinBytes) {
        throw "Artifact too small ($size bytes): $Path"
    }
}

function Test-PortableLayout {
    param([string]$Dir)
    $required = @(
        "pixelanea-server.exe",
        "pixelanea-shell.exe",
        "web\index.html",
        "migrations\001_initial.sql",
        "logo-glyph.svg",
        "README.txt"
    )
    foreach ($rel in $required) {
        $full = Join-Path $Dir $rel
        if (-not (Test-Path $full)) {
            throw "Portable layout missing: $rel"
        }
    }
    $sql = Get-Content -Raw (Join-Path $Dir "migrations\001_initial.sql")
    if ($sql -notmatch "CREATE TABLE") {
        throw "Packaged 001_initial.sql is missing CREATE TABLE"
    }
}

function Resolve-InstalledServerDir {
    param([string]$InstallDir)
    $candidates = @(
        (Join-Path $InstallDir "resources\pixelanea"),
        (Join-Path $InstallDir "pixelanea"),
        $InstallDir
    )
    foreach ($dir in $candidates) {
        if ((Test-Path (Join-Path $dir "pixelanea-server.exe")) -and
            (Test-Path (Join-Path $dir "web\index.html")) -and
            (Test-Path (Join-Path $dir "migrations\001_initial.sql"))) {
            return $dir
        }
    }
    throw "Installed package missing pixelanea-server.exe, web, or migrations under $InstallDir"
}

function Wait-Health {
    param([string]$Url, [int]$Attempts = 50)
    for ($i = 0; $i -lt $Attempts; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                return
            }
        }
        catch {
            Start-Sleep -Milliseconds 200
        }
    }
    throw "Health check failed: $Url"
}

function Wait-CreateProject {
    $body = '{"name":"smoke","width":16,"height":16,"frameCount":1}'
    $response = Invoke-WebRequest -Uri $CreateUrl -Method POST -ContentType "application/json" `
        -Body $body -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -ne 201 -and $response.StatusCode -ne 200) {
        throw "POST /api/projects failed with status $($response.StatusCode)"
    }
    if ($response.Content -notmatch '"id"') {
        throw "Create project response missing id: $($response.Content)"
    }
}

if (-not $SkipBuild) {
    & (Join-Path $RootDir "scripts\package-windows.ps1")
}

Write-Host "==> Verifying release artifacts"
Assert-FileExists -Path $SetupExe -MinBytes 1000000
Assert-FileExists -Path $PortableZip -MinBytes 1000000
Test-PortableLayout -Dir $PortableDir

$tempExtract = Join-Path $env:TEMP "pixelanea-win-smoke-$Version"
if (Test-Path $tempExtract) {
    Remove-Item -Recurse -Force $tempExtract
}
Expand-Archive -Path $PortableZip -DestinationPath $tempExtract -Force
$extracted = Get-ChildItem -Path $tempExtract -Directory | Select-Object -First 1
if (-not $extracted) {
    throw "Portable zip did not contain a top-level directory"
}
Test-PortableLayout -Dir $extracted.FullName
Remove-Item -Recurse -Force $tempExtract

if ($InstallTest) {
    $InstallDir = Join-Path $env:TEMP "pixelanea-install-smoke-$Version"
    if (Test-Path $InstallDir) {
        Remove-Item -Recurse -Force $InstallDir
    }
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

    Write-Host "==> Silent install smoke test -> $InstallDir"
    try {
        $installArgs = @("/S", "/D=$InstallDir")
        $proc = Start-Process -FilePath $SetupExe -ArgumentList $installArgs -Wait -PassThru
        if ($proc.ExitCode -ne 0) {
            throw "Silent install failed with exit code $($proc.ExitCode)"
        }

        $installedShell = Join-Path $InstallDir "pixelanea-shell.exe"
        if (-not (Test-Path $installedShell)) {
            $installedShell = Join-Path $InstallDir "Pixelanea.exe"
        }
        if (-not (Test-Path $installedShell)) {
            throw "Installed shell missing under $InstallDir"
        }

        $serverDir = Resolve-InstalledServerDir -InstallDir $InstallDir
        $serverProc = Start-Process -FilePath (Join-Path $serverDir "pixelanea-server.exe") `
            -ArgumentList @("--host", "127.0.0.1", "--port", "8787", "--web-root", (Join-Path $serverDir "web")) `
            -PassThru
        try {
            Wait-Health -Url $HealthUrl
            Write-Host "==> Health check OK"
            Wait-CreateProject
            Write-Host "==> Create project OK"
        }
        finally {
            if ($serverProc -and -not $serverProc.HasExited) {
                Stop-Process -Id $serverProc.Id -Force -ErrorAction SilentlyContinue
            }
        }
    }
    finally {
        if (Test-Path $InstallDir) {
            Remove-Item -Recurse -Force $InstallDir -ErrorAction SilentlyContinue
        }
    }
}

Write-Host ""
Write-Host "Windows package smoke test passed:"
Write-Host "  $SetupExe"
Write-Host "  $PortableZip"
