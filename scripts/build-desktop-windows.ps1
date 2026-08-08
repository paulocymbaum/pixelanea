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
$ResolvedVcpkgRoot = ""

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

    $vcpkgExe = Join-Path $Root "vcpkg.exe"
    if (-not (Test-Path $vcpkgExe)) {
        if (-not (Test-Path (Join-Path $Root ".git"))) {
            Write-Host "==> Cloning vcpkg to $Root"
            $cloneOutput = & git clone https://github.com/microsoft/vcpkg.git $Root 2>&1
            $cloneOutput | Write-Host
            if ($LASTEXITCODE -ne 0) {
                throw "git clone vcpkg failed"
            }
        }
        Write-Host "==> Bootstrapping vcpkg"
        $bootstrap = Join-Path $Root "bootstrap-vcpkg.bat"
        $bootstrapLog = Join-Path $env:TEMP "pixelanea-vcpkg-bootstrap.log"
        $bootstrapErr = Join-Path $env:TEMP "pixelanea-vcpkg-bootstrap.err"
        if (Test-Path $bootstrapLog) { Remove-Item -Force $bootstrapLog }
        if (Test-Path $bootstrapErr) { Remove-Item -Force $bootstrapErr }
        $proc = Start-Process -FilePath $bootstrap `
            -ArgumentList "-disableMetrics" `
            -Wait -PassThru -NoNewWindow `
            -RedirectStandardOutput $bootstrapLog `
            -RedirectStandardError $bootstrapErr
        if (Test-Path $bootstrapLog) {
            Get-Content $bootstrapLog | Write-Host
        }
        if (Test-Path $bootstrapErr) {
            Get-Content $bootstrapErr | Write-Host
        }
        if ($proc.ExitCode -ne 0) {
            throw "vcpkg bootstrap failed (exit $($proc.ExitCode))"
        }
    }

    if (-not (Test-Path $vcpkgExe)) {
        throw "vcpkg bootstrap failed at $Root"
    }

    $script:ResolvedVcpkgRoot = $Root
}

function Test-StaleCMakeCache {
    param([string]$Dir)

    $cache = Join-Path $Dir "CMakeCache.txt"
    if (-not (Test-Path $cache)) {
        return $false
    }
    if (Test-Path (Join-Path $Dir "build.ninja")) {
        return $false
    }
    if (Test-Path (Join-Path $Dir "Makefile")) {
        return $false
    }
    $vcProj = Get-ChildItem -Path $Dir -Filter "*.vcxproj" -File -ErrorAction SilentlyContinue
    if ($vcProj) {
        return $false
    }
    return $true
}

function Get-CMakeGeneratorArgs {
    if (Get-Command ninja -ErrorAction SilentlyContinue) {
        return @("-G", "Ninja")
    }

    $vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    if (Test-Path $vswhere) {
        return @("-G", "Visual Studio 17 2022", "-A", "x64")
    }

    throw "CMake requires ninja or Visual Studio 2022 (Desktop C++)"
}

function Invoke-ServerCMakeBuild {
    param([string]$Dir)

    if (Test-Path (Join-Path $Dir "build.ninja")) {
        cmake --build $Dir --target pixelanea-server
    }
    else {
        cmake --build $Dir --config Release --target pixelanea-server
    }
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
Ensure-Vcpkg -Root $VcpkgRoot
if ([string]::IsNullOrWhiteSpace($script:ResolvedVcpkgRoot)) {
    throw "Ensure-Vcpkg did not resolve VCPKG_ROOT"
}
$VcpkgRoot = $script:ResolvedVcpkgRoot
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
            if ((Test-StaleCMakeCache $BuildDir) -or $cache -notmatch [regex]::Escape($Triplet)) {
                Remove-Item -Recurse -Force $BuildDir
            }
        }
    }
    if (-not (Test-Path $BuildDir)) {
        New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null
    }

    if (-not (Test-Path (Join-Path $BuildDir "CMakeCache.txt"))) {
        Write-Host "==> Configuring pixelanea-server ($Triplet, Release)"
        $generatorArgs = Get-CMakeGeneratorArgs
        cmake @generatorArgs `
            -S (Join-Path $RootDir "server") `
            -B $BuildDir `
            -DCMAKE_BUILD_TYPE=Release `
            -DCMAKE_TOOLCHAIN_FILE="$Toolchain" `
            -DVCPKG_TARGET_TRIPLET="$Triplet"
    }

    Write-Host "==> Compiling pixelanea-server"
    Invoke-ServerCMakeBuild -Dir $BuildDir

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
