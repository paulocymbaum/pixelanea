use std::fs::{self, File};
use std::io;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;

use serde::Serialize;

use crate::paths::{resolve_paths_flexible, InstallPaths};

const GITHUB_API: &str = "https://api.github.com";
const GITHUB_RAW: &str = "https://raw.githubusercontent.com";
const REPO: &str = "pixelanea/pixelanea";
const USER_AGENT: &str = "pixelanea-updater";
const RELEASES_PAGE: &str = "https://github.com/pixelanea/pixelanea/releases";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum InstallKind {
    UserLocal,
    Portable,
    SystemDeb,
    WindowsInstaller,
    WindowsPortable,
    MacAppBundle,
    MacPortable,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum UpdateErrorCode {
    PermissionDenied,
    Gatekeeper,
    Partial,
    Generic,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionStatus {
    pub connected: bool,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheckResult {
    pub current_version: String,
    pub latest_version: String,
    pub main_commit: String,
    pub update_available: bool,
    pub download_url: Option<String>,
    pub install_kind: InstallKind,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallResult {
    pub success: bool,
    pub message: String,
    pub requires_restart: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<UpdateErrorCode>,
}

impl InstallResult {
    fn success_restart(message: impl Into<String>) -> Self {
        Self {
            success: true,
            message: message.into(),
            requires_restart: true,
            error_code: None,
        }
    }

    fn failure(
        message: impl Into<String>,
        error_code: UpdateErrorCode,
    ) -> Self {
        Self {
            success: false,
            message: message.into(),
            requires_restart: false,
            error_code: Some(error_code),
        }
    }
}

pub fn check_connection() -> ConnectionStatus {
    match github_get("/repos/pixelanea/pixelanea/branches/main") {
        Ok(_) => ConnectionStatus {
            connected: true,
            message: "Connected to GitHub.".to_string(),
        },
        Err(error) => ConnectionStatus {
            connected: false,
            message: error,
        },
    }
}

pub fn check_for_updates(current_version: &str) -> Result<UpdateCheckResult, String> {
    let connection = check_connection();
    if !connection.connected {
        return Err(connection.message);
    }

    let latest_version = fetch_main_version()?;
    let main_commit = fetch_main_commit_sha()?;
    let paths = resolve_paths_flexible()?;
    let install_kind = detect_install_kind(&paths);
    let update_available = version_gt(&latest_version, current_version);
    let download_url = if update_available {
        resolve_download_url(&latest_version, install_kind)?
    } else {
        None
    };

    Ok(UpdateCheckResult {
        current_version: current_version.to_string(),
        latest_version,
        main_commit,
        update_available,
        download_url,
        install_kind,
    })
}

pub fn download_and_install(download_url: &str) -> Result<InstallResult, String> {
    let paths = resolve_paths_flexible()?;
    let install_kind = detect_install_kind(&paths);
    let temp_dir = tempfile_dir()?;

    if download_url.ends_with(".deb") {
        let deb_path = temp_dir.join("pixelanea-update.deb");
        download_file(download_url, &deb_path)?;
        return install_deb_package(&deb_path);
    }

    if download_url.ends_with("-setup.exe") {
        #[cfg(windows)]
        {
            return install_windows_installer(download_url, &temp_dir);
        }
        #[cfg(not(windows))]
        {
            return Err("Windows installer updates are only supported on Windows.".to_string());
        }
    }

    if download_url.ends_with(".zip") {
        #[cfg(windows)]
        {
            return install_windows_portable(download_url, &paths, &temp_dir);
        }
        #[cfg(target_os = "macos")]
        {
            return install_mac_portable_zip(download_url, &paths, install_kind, &temp_dir);
        }
        #[cfg(all(not(windows), not(target_os = "macos")))]
        {
            let _ = (download_url, &paths, install_kind, &temp_dir);
            return Err("Unexpected zip download on this platform.".to_string());
        }
    }

    if download_url.ends_with(".dmg") {
        #[cfg(target_os = "macos")]
        {
            return install_mac_dmg(download_url, &paths, &temp_dir);
        }
        #[cfg(not(target_os = "macos"))]
        {
            return Err("DMG updates are only supported on macOS.".to_string());
        }
    }

    if download_url.ends_with(".tar.gz") {
        let archive_path = temp_dir.join("pixelanea-update.tar.gz");
        download_file(download_url, &archive_path)?;
        let extract_dir = temp_dir.join("extracted");
        fs::create_dir_all(&extract_dir).map_err(|error| error.to_string())?;
        extract_tar_gz(&archive_path, &extract_dir)?;

        let package_root = find_package_root(&extract_dir)?;
        match install_kind {
            InstallKind::UserLocal | InstallKind::Portable => {
                install_portable_package(&package_root, &paths, install_kind)?;
            }
            InstallKind::SystemDeb => {
                return Err(
                    "System install detected but no .deb download URL was provided.".to_string(),
                );
            }
            _ => {
                return Err("Linux tar.gz update does not match this install type.".to_string());
            }
        }

        return Ok(InstallResult::success_restart(
            "Update installed. Restart Pixelanea to use the new version.",
        ));
    }

    Err("Unrecognized update download URL.".to_string())
}

fn detect_install_kind(paths: &InstallPaths) -> InstallKind {
    #[cfg(windows)]
    {
        return detect_install_kind_windows(paths);
    }
    #[cfg(target_os = "macos")]
    {
        return detect_install_kind_macos(paths);
    }
    #[cfg(all(not(windows), not(target_os = "macos")))]
    {
        detect_install_kind_linux(paths)
    }
}

#[cfg(all(not(windows), not(target_os = "macos")))]
fn detect_install_kind_linux(paths: &InstallPaths) -> InstallKind {
    let install = paths.install_dir.to_string_lossy();
    if install.starts_with("/usr/") {
        return InstallKind::SystemDeb;
    }

    if let Ok(home) = std::env::var("HOME") {
        let user_prefix = format!("{home}/.local/share/pixelanea");
        if install == user_prefix {
            return InstallKind::UserLocal;
        }
    }

    InstallKind::Portable
}

#[cfg(windows)]
fn detect_install_kind_windows(paths: &InstallPaths) -> InstallKind {
    let install = paths.install_dir.to_string_lossy();
    if install.contains("Program Files") {
        return InstallKind::WindowsInstaller;
    }
    InstallKind::WindowsPortable
}

#[cfg(target_os = "macos")]
fn detect_install_kind_macos(paths: &InstallPaths) -> InstallKind {
    let install = paths.install_dir.to_string_lossy();
    if install.contains(".app/Contents/Resources/pixelanea") {
        if install.starts_with("/Applications/")
            || install.contains("/Applications/Pixelanea.app/")
        {
            return InstallKind::MacAppBundle;
        }
        if let Ok(home) = std::env::var("HOME") {
            let user_apps = format!("{home}/Applications/Pixelanea.app/");
            if install.starts_with(&user_apps) {
                return InstallKind::MacAppBundle;
            }
        }
    }
    InstallKind::MacPortable
}

fn preferred_asset_suffix(version: &str, arch_label: &str, install_kind: InstallKind) -> String {
    match install_kind {
        InstallKind::SystemDeb => format!("_{version}_{arch_label}.deb"),
        InstallKind::UserLocal | InstallKind::Portable => {
            format!("-{version}-linux-{arch_label}.tar.gz")
        }
        InstallKind::WindowsInstaller => format!("-{version}-windows-x64-setup.exe"),
        InstallKind::WindowsPortable => format!("-{version}-windows-x64.zip"),
        InstallKind::MacAppBundle | InstallKind::MacPortable => {
            format!("-{version}-macos-{arch_label}.zip")
        }
    }
}

fn fetch_main_version() -> Result<String, String> {
    let url = format!("{GITHUB_RAW}/{REPO}/main/VERSION");
    let body = http_get_text(&url)?;
    let version = body.trim().trim_start_matches('v').to_string();
    if version.is_empty() {
        return Err("VERSION file on main branch is empty.".to_string());
    }
    Ok(version)
}

fn fetch_main_commit_sha() -> Result<String, String> {
    let body = github_get(&format!("/repos/{REPO}/commits/main"))?;
    let json: serde_json::Value =
        serde_json::from_str(&body).map_err(|error| format!("invalid commit response: {error}"))?;
    let sha = json
        .get("sha")
        .and_then(|value| value.as_str())
        .ok_or_else(|| "commit response missing sha".to_string())?;
    Ok(sha.chars().take(7).collect())
}

fn resolve_download_url(version: &str, install_kind: InstallKind) -> Result<Option<String>, String> {
    let arch_label = current_arch_label()?;
    let preferred_suffix = preferred_asset_suffix(version, arch_label, install_kind);
    let body = github_get(&format!("/repos/{REPO}/releases/tags/v{version}"))?;
    let release: serde_json::Value =
        serde_json::from_str(&body).map_err(|error| format!("invalid release response: {error}"))?;

    let assets = release
        .get("assets")
        .and_then(|value| value.as_array())
        .ok_or_else(|| "release response missing assets".to_string())?;

    for asset in assets {
        let name = asset
            .get("name")
            .and_then(|value| value.as_str())
            .unwrap_or_default();
        if name.ends_with(&preferred_suffix) {
            let url = asset
                .get("browser_download_url")
                .and_then(|value| value.as_str())
                .ok_or_else(|| format!("asset {name} missing download url"))?;
            return Ok(Some(url.to_string()));
        }
    }

    Err(format!(
        "No release asset found for version {version} ({arch_label}). \
         Check {RELEASES_PAGE}."
    ))
}

fn current_arch_label() -> Result<&'static str, String> {
    #[cfg(windows)]
    {
        match std::env::consts::ARCH {
            "x86_64" => Ok("x64"),
            other => Err(format!("unsupported architecture for updates: {other}")),
        }
    }
    #[cfg(target_os = "macos")]
    {
        match std::env::consts::ARCH {
            "aarch64" => Ok("arm64"),
            "x86_64" => Ok("x64"),
            other => Err(format!("unsupported architecture for updates: {other}")),
        }
    }
    #[cfg(all(not(windows), not(target_os = "macos")))]
    {
        match std::env::consts::ARCH {
            "x86_64" => Ok("amd64"),
            "aarch64" => Ok("arm64"),
            other => Err(format!("unsupported architecture for updates: {other}")),
        }
    }
}

#[cfg(windows)]
fn install_windows_installer(download_url: &str, temp_dir: &Path) -> Result<InstallResult, String> {
    let installer = temp_dir.join("pixelanea-update-setup.exe");
    download_file(download_url, &installer)?;

    let status = Command::new(&installer)
        .arg("/S")
        .status()
        .map_err(|error| format!("Could not run installer: {error}"))?;

    if status.success() {
        return Ok(InstallResult::success_restart(
            "Update installed. Restart Pixelanea to use the new version.",
        ));
    }

    Ok(InstallResult::failure(
        format!(
            "ERROR_UAC: Windows blocked the update installer. Approve the UAC prompt or download manually from {RELEASES_PAGE}."
        ),
        UpdateErrorCode::PermissionDenied,
    ))
}

#[cfg(windows)]
fn install_windows_portable(
    download_url: &str,
    paths: &InstallPaths,
    temp_dir: &Path,
) -> Result<InstallResult, String> {
    let archive_path = temp_dir.join("pixelanea-update.zip");
    download_file(download_url, &archive_path)?;

    let extract_dir = temp_dir.join("extracted");
    fs::create_dir_all(&extract_dir).map_err(|error| error.to_string())?;
    extract_zip(&archive_path, &extract_dir)?;

    let package_root = find_package_root(&extract_dir)?;
    copy_release_files(&package_root, &paths.install_dir)?;

    Ok(InstallResult::success_restart(
        "Update installed. Restart Pixelanea to use the new version.",
    ))
}

#[cfg(target_os = "macos")]
fn install_mac_portable_zip(
    download_url: &str,
    paths: &InstallPaths,
    install_kind: InstallKind,
    temp_dir: &Path,
) -> Result<InstallResult, String> {
    let archive_path = temp_dir.join("pixelanea-update.zip");
    download_file(download_url, &archive_path)?;

    let extract_dir = temp_dir.join("extracted");
    fs::create_dir_all(&extract_dir).map_err(|error| error.to_string())?;
    extract_zip(&archive_path, &extract_dir)?;

    if let Some(app_bundle) = find_app_bundle(&extract_dir) {
        return replace_mac_app_bundle(&app_bundle, paths, install_kind);
    }

    let package_root = find_package_root(&extract_dir)?;
    copy_release_files(&package_root, &paths.install_dir)?;

    Ok(InstallResult::success_restart(
        "Update installed. Restart Pixelanea to use the new version.",
    ))
}

#[cfg(target_os = "macos")]
fn install_mac_dmg(
    download_url: &str,
    paths: &InstallPaths,
    temp_dir: &Path,
) -> Result<InstallResult, String> {
    let dmg_path = temp_dir.join("pixelanea-update.dmg");
    download_file(download_url, &dmg_path)?;

    let mount_dir = temp_dir.join("mount");
    fs::create_dir_all(&mount_dir).map_err(|error| error.to_string())?;

    let mountpoint = mount_dir
        .to_str()
        .ok_or_else(|| "Invalid mount path.".to_string())?;

    let status = Command::new("hdiutil")
        .args(["attach", "-nobrowse", "-quiet", "-mountpoint", mountpoint])
        .arg(&dmg_path)
        .status()
        .map_err(|error| format!("Could not mount DMG: {error}"))?;

    if !status.success() {
        return Ok(InstallResult::failure(
            format!(
                "ERROR_GATEKEEPER: Could not open the update disk image. Download manually from {RELEASES_PAGE}."
            ),
            UpdateErrorCode::Gatekeeper,
        ));
    }

    let result = (|| {
        let app_bundle = find_app_bundle(&mount_dir)
            .ok_or_else(|| "Update disk image did not contain Pixelanea.app.".to_string())?;
        replace_mac_app_bundle(&app_bundle, paths, InstallKind::MacAppBundle)
    })();

    let _ = Command::new("hdiutil")
        .args(["detach", "-quiet", mountpoint])
        .status();

    result
}

#[cfg(target_os = "macos")]
fn replace_mac_app_bundle(
    source_app: &Path,
    paths: &InstallPaths,
    install_kind: InstallKind,
) -> Result<InstallResult, String> {
    let destination = mac_app_bundle_destination(paths, install_kind)?;

    if destination.exists() {
        if let Err(error) = fs::remove_dir_all(&destination) {
            return Ok(InstallResult::failure(
                format!(
                    "ERROR_PARTIAL: Update did not finish — your current version is still installed. \
                     Could not remove the existing app bundle at {}: {error}",
                    destination.display()
                ),
                UpdateErrorCode::Partial,
            ));
        }
    }

    if let Some(parent) = destination.parent() {
        if let Err(error) = fs::create_dir_all(parent) {
            return Ok(InstallResult::failure(
                format!(
                    "ERROR_PARTIAL: Update did not finish — your current version is still installed. {error}"
                ),
                UpdateErrorCode::Partial,
            ));
        }
    }

    if let Err(error) = copy_dir_recursive(source_app, &destination) {
        return Ok(InstallResult::failure(
            format!(
                "ERROR_PARTIAL: Update did not finish — your current version is still installed. {error} \
                 Download manually from {RELEASES_PAGE}."
            ),
            UpdateErrorCode::Partial,
        ));
    }

    Ok(InstallResult::success_restart(
        "Update installed. Restart Pixelanea to use the new version.",
    ))
}

#[cfg(target_os = "macos")]
fn mac_app_bundle_destination(
    paths: &InstallPaths,
    install_kind: InstallKind,
) -> Result<PathBuf, String> {
    if let Some(app_bundle) = app_bundle_from_install_dir(&paths.install_dir) {
        return Ok(app_bundle);
    }

    match install_kind {
        InstallKind::MacAppBundle => {
            if let Ok(home) = std::env::var("HOME") {
                let user_app = PathBuf::from(home)
                    .join("Applications")
                    .join("Pixelanea.app");
                if user_app.exists() {
                    return Ok(user_app);
                }
            }
            Ok(PathBuf::from("/Applications/Pixelanea.app"))
        }
        InstallKind::MacPortable => Err(
            "Could not locate the Pixelanea.app bundle to update.".to_string(),
        ),
        _ => Err("macOS app bundle destination is only valid on macOS.".to_string()),
    }
}

#[cfg(target_os = "macos")]
fn app_bundle_from_install_dir(install_dir: &Path) -> Option<PathBuf> {
    for ancestor in install_dir.ancestors() {
        if ancestor.extension().is_some_and(|ext| ext == "app") {
            return Some(ancestor.to_path_buf());
        }
    }
    None
}

#[cfg(target_os = "macos")]
fn find_app_bundle(search_root: &Path) -> Option<PathBuf> {
    let entries = fs::read_dir(search_root).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() && path.extension().is_some_and(|ext| ext == "app") {
            return Some(path);
        }
    }
    None
}

fn github_get(path: &str) -> Result<String, String> {
    let url = format!("{GITHUB_API}{path}");
    http_get_text(&url)
}

fn http_get_text(url: &str) -> Result<String, String> {
    ureq::get(url)
        .set("User-Agent", USER_AGENT)
        .set("Accept", "application/vnd.github+json")
        .timeout(Duration::from_secs(20))
        .call()
        .map_err(|error| format!("Could not reach GitHub: {error}"))?
        .into_string()
        .map_err(|error| format!("Failed to read GitHub response: {error}"))
}

fn download_file(url: &str, destination: &Path) -> Result<(), String> {
    let response = ureq::get(url)
        .set("User-Agent", USER_AGENT)
        .timeout(Duration::from_secs(120))
        .call()
        .map_err(|error| format!("Download failed: {error}"))?;

    let mut file =
        File::create(destination).map_err(|error| format!("Could not create download file: {error}"))?;
    io::copy(&mut response.into_reader(), &mut file)
        .map_err(|error| format!("Failed to save download: {error}"))?;
    Ok(())
}

fn extract_tar_gz(archive: &Path, destination: &Path) -> Result<(), String> {
    let status = Command::new("tar")
        .arg("-xzf")
        .arg(archive)
        .arg("-C")
        .arg(destination)
        .status()
        .map_err(|error| format!("Could not run tar: {error}"))?;

    if status.success() {
        Ok(())
    } else {
        Err("Failed to extract update archive.".to_string())
    }
}

#[cfg(any(windows, target_os = "macos"))]
fn extract_zip(archive: &Path, destination: &Path) -> Result<(), String> {
    let file = File::open(archive).map_err(|error| error.to_string())?;
    let mut archive =
        zip::ZipArchive::new(file).map_err(|error| format!("Invalid zip archive: {error}"))?;
    for index in 0..archive.len() {
        let mut file = archive
            .by_index(index)
            .map_err(|error| format!("Could not read zip entry: {error}"))?;
        let outpath = match file.enclosed_name() {
            Some(path) => destination.join(path),
            None => continue,
        };
        if file.name().ends_with('/') {
            fs::create_dir_all(&outpath).map_err(|error| error.to_string())?;
        } else {
            if let Some(parent) = outpath.parent() {
                fs::create_dir_all(parent).map_err(|error| error.to_string())?;
            }
            let mut outfile = File::create(&outpath).map_err(|error| error.to_string())?;
            io::copy(&mut file, &mut outfile).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

fn find_package_root(extract_dir: &Path) -> Result<PathBuf, String> {
    let mut candidates: Vec<PathBuf> = fs::read_dir(extract_dir)
        .map_err(|error| error.to_string())?
        .filter_map(|entry| entry.ok().map(|entry| entry.path()))
        .filter(|path| path.is_dir())
        .collect();

    candidates.sort();

    for candidate in &candidates {
        if candidate.join("pixelanea-server").is_file()
            || candidate.join("pixelanea-server.exe").is_file()
        {
            if candidate.join("web/index.html").is_file() {
                return Ok(candidate.clone());
            }
        }
    }

    if extract_dir.join("pixelanea-server").is_file()
        || extract_dir.join("pixelanea-server.exe").is_file()
    {
        return Ok(extract_dir.to_path_buf());
    }

    Err("Update archive did not contain a valid Pixelanea package.".to_string())
}

fn install_portable_package(
    package_root: &Path,
    paths: &InstallPaths,
    install_kind: InstallKind,
) -> Result<(), String> {
    if install_kind == InstallKind::UserLocal {
        let install_script = package_root.join("install.sh");
        if install_script.is_file() {
            let status = Command::new("bash")
                .arg(&install_script)
                .current_dir(package_root)
                .status()
                .map_err(|error| format!("Could not run install.sh: {error}"))?;
            if status.success() {
                return Ok(());
            }
            return Err("install.sh failed.".to_string());
        }
    }

    copy_release_files(package_root, &paths.install_dir)
}

fn copy_release_files(source: &Path, destination: &Path) -> Result<(), String> {
    fs::create_dir_all(destination).map_err(|error| error.to_string())?;

    let files = if cfg!(windows) {
        vec![
            "pixelanea-server.exe",
            "pixelanea-shell.exe",
            "pixelanea-browser.exe",
            "logo-glyph.svg",
        ]
    } else {
        vec![
            "pixelanea-server",
            "pixelanea-shell",
            "pixelanea-browser",
            "logo-glyph.svg",
        ]
    };

    for file in files {
        let from = source.join(file);
        if from.is_file() {
            install_file(&from, &destination.join(file), 0o755)?;
        }
    }

    let web_source = source.join("web");
    if web_source.is_dir() {
        let web_dest = destination.join("web");
        if web_dest.exists() {
            fs::remove_dir_all(&web_dest).map_err(|error| error.to_string())?;
        }
        copy_dir_recursive(&web_source, &web_dest)?;
    }

    Ok(())
}

fn install_file(source: &Path, destination: &Path, mode: u32) -> Result<(), String> {
    fs::copy(source, destination).map_err(|error| error.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(destination, fs::Permissions::from_mode(mode))
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn copy_dir_recursive(source: &Path, destination: &Path) -> Result<(), String> {
    fs::create_dir_all(destination).map_err(|error| error.to_string())?;
    for entry in fs::read_dir(source).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let from = entry.path();
        let to = destination.join(entry.file_name());
        if from.is_dir() {
            copy_dir_recursive(&from, &to)?;
        } else {
            fs::copy(&from, &to).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

fn install_deb_package(deb_path: &Path) -> Result<InstallResult, String> {
    if Command::new("pkexec")
        .arg("dpkg")
        .arg("-i")
        .arg(deb_path)
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
    {
        return Ok(InstallResult::success_restart(
            "Update installed. Restart Pixelanea to use the new version.",
        ));
    }

    Ok(InstallResult::failure(
        format!(
            "ERROR_PERMISSION: Could not install the .deb package. Install manually from {RELEASES_PAGE} \
             or run: sudo apt install ./pixelanea_*.deb"
        ),
        UpdateErrorCode::PermissionDenied,
    ))
}

fn tempfile_dir() -> Result<PathBuf, String> {
    let base = std::env::temp_dir().join(format!(
        "pixelanea-update-{}",
        std::process::id()
    ));
    if base.exists() {
        fs::remove_dir_all(&base).map_err(|error| error.to_string())?;
    }
    fs::create_dir_all(&base).map_err(|error| error.to_string())?;
    Ok(base)
}

pub fn version_gt(left: &str, right: &str) -> bool {
    parse_semver(left) > parse_semver(right)
}

fn parse_semver(value: &str) -> (u32, u32, u32) {
    let trimmed = value.trim().trim_start_matches('v');
    let mut parts = trimmed.split('.');
    let major = parts.next().and_then(|part| part.parse().ok()).unwrap_or(0);
    let minor = parts.next().and_then(|part| part.parse().ok()).unwrap_or(0);
    let patch = parts
        .next()
        .and_then(|part| part.parse().ok())
        .unwrap_or(0);
    (major, minor, patch)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compares_semver() {
        assert!(version_gt("1.2.0", "1.1.0"));
        assert!(version_gt("v2.0.0", "1.9.9"));
        assert!(!version_gt("1.0.0", "1.0.0"));
        assert!(!version_gt("1.0.0", "1.1.0"));
    }

    #[test]
    fn detects_linux_install_kinds() {
        let user_paths = InstallPaths {
            install_dir: PathBuf::from("/home/alice/.local/share/pixelanea"),
            server_binary: PathBuf::from("/home/alice/.local/share/pixelanea/pixelanea-server"),
            web_root: PathBuf::from("/home/alice/.local/share/pixelanea/web"),
        };
        std::env::set_var("HOME", "/home/alice");
        assert_eq!(detect_install_kind_linux(&user_paths), InstallKind::UserLocal);

        let system_paths = InstallPaths {
            install_dir: PathBuf::from("/usr/share/pixelanea"),
            server_binary: PathBuf::from("/usr/share/pixelanea/pixelanea-server"),
            web_root: PathBuf::from("/usr/share/pixelanea/web"),
        };
        assert_eq!(detect_install_kind_linux(&system_paths), InstallKind::SystemDeb);

        let portable_paths = InstallPaths {
            install_dir: PathBuf::from("/opt/pixelanea"),
            server_binary: PathBuf::from("/opt/pixelanea/pixelanea-server"),
            web_root: PathBuf::from("/opt/pixelanea/web"),
        };
        assert_eq!(detect_install_kind_linux(&portable_paths), InstallKind::Portable);
    }

    #[test]
    fn preferred_asset_suffixes_match_release_contract() {
        assert_eq!(
            preferred_asset_suffix("1.1.0", "amd64", InstallKind::SystemDeb),
            "_1.1.0_amd64.deb"
        );
        assert_eq!(
            preferred_asset_suffix("1.1.0", "arm64", InstallKind::UserLocal),
            "-1.1.0-linux-arm64.tar.gz"
        );
        assert_eq!(
            preferred_asset_suffix("1.1.0", "amd64", InstallKind::Portable),
            "-1.1.0-linux-amd64.tar.gz"
        );
        assert_eq!(
            preferred_asset_suffix("1.1.0", "amd64", InstallKind::WindowsInstaller),
            "-1.1.0-windows-x64-setup.exe"
        );
        assert_eq!(
            preferred_asset_suffix("1.1.0", "amd64", InstallKind::WindowsPortable),
            "-1.1.0-windows-x64.zip"
        );
        assert_eq!(
            preferred_asset_suffix("1.1.0", "arm64", InstallKind::MacAppBundle),
            "-1.1.0-macos-arm64.zip"
        );
        assert_eq!(
            preferred_asset_suffix("1.1.0", "arm64", InstallKind::MacPortable),
            "-1.1.0-macos-arm64.zip"
        );
    }

    #[cfg(windows)]
    #[test]
    fn detects_windows_install_kinds() {
        let installer_paths = InstallPaths {
            install_dir: PathBuf::from(r"C:\Program Files\Pixelanea"),
            server_binary: PathBuf::from(r"C:\Program Files\Pixelanea\pixelanea-server.exe"),
            web_root: PathBuf::from(r"C:\Program Files\Pixelanea\web"),
        };
        assert_eq!(
            detect_install_kind_windows(&installer_paths),
            InstallKind::WindowsInstaller
        );

        let portable_paths = InstallPaths {
            install_dir: PathBuf::from(r"C:\Users\alice\Downloads\pixelanea-1.0.0-windows-x64"),
            server_binary: PathBuf::from(
                r"C:\Users\alice\Downloads\pixelanea-1.0.0-windows-x64\pixelanea-server.exe",
            ),
            web_root: PathBuf::from(
                r"C:\Users\alice\Downloads\pixelanea-1.0.0-windows-x64\web",
            ),
        };
        assert_eq!(
            detect_install_kind_windows(&portable_paths),
            InstallKind::WindowsPortable
        );
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn detects_macos_install_kinds() {
        let app_paths = InstallPaths {
            install_dir: PathBuf::from(
                "/Applications/Pixelanea.app/Contents/Resources/pixelanea",
            ),
            server_binary: PathBuf::from(
                "/Applications/Pixelanea.app/Contents/Resources/pixelanea/pixelanea-server",
            ),
            web_root: PathBuf::from(
                "/Applications/Pixelanea.app/Contents/Resources/pixelanea/web",
            ),
        };
        assert_eq!(
            detect_install_kind_macos(&app_paths),
            InstallKind::MacAppBundle
        );

        let portable_paths = InstallPaths {
            install_dir: PathBuf::from("/Users/alice/Desktop/pixelanea"),
            server_binary: PathBuf::from("/Users/alice/Desktop/pixelanea/pixelanea-server"),
            web_root: PathBuf::from("/Users/alice/Desktop/pixelanea/web"),
        };
        assert_eq!(
            detect_install_kind_macos(&portable_paths),
            InstallKind::MacPortable
        );
    }
}
