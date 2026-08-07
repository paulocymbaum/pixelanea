# Build Pixelanea server + web for Windows desktop (Release, static vcpkg triplet).
#
# Usage:
#   .\scripts\build-desktop-windows.ps1
#
# Output:
#   server\build\pixelanea-server.exe
#   apps\web\dist\
param(
    [string]$VcpkgRoot = $env:VCPKG_ROOT,
    [string]$Triplet = "x64-windows-static"
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
$BuildDir = Join-Path $RootDir "server\build"
$WebDist = Join-Path $RootDir "apps\web\dist"

function Ensure-Bash {
    if (-not (Get-Command bash -ErrorAction SilentlyContinue)) {
        throw "bash not found — install Git for Windows or run on windows-latest CI"
    }
}

function Ensure-Vcpkg {
    param([string]$Root)

    if ([string]::IsNullOrWhiteSpace($Root)) {
        $Root = Join-Path $env:USERPROFILE "vcpkg"
    }

    if (-not (Test-Path (Join-Path $Root "vcpkg.exe"))) {
        if (-not (Test-Path (Join-Path $Root ".git"))) {
            Write-Host "==> Cloning vcpkg to $Root"
            git clone https://github.com/microsoft/vcpkg.git $Root
        }
        Write-Host "==> Bootstrapping vcpkg"
        & (Join-Path $Root "bootstrap-vcpkg.bat") -disableMetrics
    }

    if (-not (Test-Path (Join-Path $Root "vcpkg.exe"))) {
        throw "vcpkg bootstrap failed at $Root"
    }

    return $Root
}

function Ensure-Pnpm {
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        return
    }
    if (Get-Command corepack -ErrorAction SilentlyContinue) {
        corepack enable 2>$null
        corepack prepare pnpm@9.15.4 --activate 2>$null
    }
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        throw "pnpm not found — install Node 20+ and enable corepack"
    }
}

Ensure-Bash
$VcpkgRoot = Ensure-Vcpkg -Root $VcpkgRoot
$env:VCPKG_ROOT = $VcpkgRoot
$env:VCPKG_DEFAULT_TRIPLET = $Triplet
$env:CMAKE_BUILD_TYPE = "Release"

Push-Location $RootDir
try {
    Write-Host "==> Installing frontend dependencies"
    & bash ./scripts/deps-cache.sh install

    Ensure-Pnpm

    Write-Host "==> Building API client + web bundle (Release)"
    & bash ./scripts/assets-cache.sh ensure-api
    & bash ./scripts/assets-cache.sh ensure-web --build-type Release

    if (-not (Test-Path (Join-Path $WebDist "index.html"))) {
        throw "Frontend build missing $WebDist\index.html"
    }

    $Toolchain = Join-Path $VcpkgRoot "scripts\buildsystems\vcpkg.cmake"
    if (-not (Test-Path $Toolchain)) {
        throw "Missing vcpkg toolchain: $Toolchain"
    }

    if (Test-Path $BuildDir) {
        $cacheFile = Join-Path $BuildDir "CMakeCache.txt"
        if (Test-Path $cacheFile) {
            $cache = Get-Content $cacheFile -Raw
            if ($cache -notmatch [regex]::Escape($Triplet)) {
                Remove-Item -Recurse -Force $BuildDir
            }
        }
    }
    if (-not (Test-Path $BuildDir)) {
        New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null
    }

    if (-not (Test-Path (Join-Path $BuildDir "CMakeCache.txt"))) {
        Write-Host "==> Configuring pixelanea-server ($Triplet, Release)"
        cmake -S (Join-Path $RootDir "server") -B $BuildDir `
            -G "Visual Studio 17 2022" -A x64 `
            -DCMAKE_BUILD_TYPE=Release `
            -DCMAKE_TOOLCHAIN_FILE="$Toolchain" `
            -DVCPKG_TARGET_TRIPLET="$Triplet"
    }

    Write-Host "==> Compiling pixelanea-server"
    cmake --build $BuildDir --config Release --target pixelanea-server

    $ServerExe = Join-Path $BuildDir "pixelanea-server.exe"
    if (-not (Test-Path $ServerExe)) {
        $ServerExe = Join-Path $BuildDir "Release\pixelanea-server.exe"
    }
    if (-not (Test-Path $ServerExe)) {
        throw "pixelanea-server.exe not found under $BuildDir"
    }

    Write-Host ""
    Write-Host "Windows desktop build ready:"
    Write-Host "  Server:   $ServerExe"
    Write-Host "  Frontend: $WebDist"
}
finally {
    Pop-Location
}
