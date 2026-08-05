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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum InstallKind {
    UserLocal,
    Portable,
    SystemDeb,
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
    let archive_path = temp_dir.join("pixelanea-update.tar.gz");
    let deb_path = temp_dir.join("pixelanea-update.deb");

    if download_url.ends_with(".deb") {
        download_file(download_url, &deb_path)?;
        install_deb_package(&deb_path)?;
        return Ok(InstallResult {
            success: true,
            message: "Update installed. Restart Pixelanea to use the new version.".to_string(),
            requires_restart: true,
        });
    }

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
    }

    Ok(InstallResult {
        success: true,
        message: "Update installed. Restart Pixelanea to use the new version.".to_string(),
        requires_restart: true,
    })
}

fn detect_install_kind(paths: &InstallPaths) -> InstallKind {
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
    let body = github_get(&format!("/repos/{REPO}/releases/tags/v{version}"))?;
    let release: serde_json::Value =
        serde_json::from_str(&body).map_err(|error| format!("invalid release response: {error}"))?;

    let assets = release
        .get("assets")
        .and_then(|value| value.as_array())
        .ok_or_else(|| "release response missing assets".to_string())?;

    let preferred_suffix = match install_kind {
        InstallKind::SystemDeb => format!("_{version}_{arch_label}.deb"),
        InstallKind::UserLocal | InstallKind::Portable => {
            format!("-{version}-linux-{arch_label}.tar.gz")
        }
    };

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
         Check https://github.com/{REPO}/releases."
    ))
}

fn current_arch_label() -> Result<&'static str, String> {
    match std::env::consts::ARCH {
        "x86_64" => Ok("amd64"),
        "aarch64" => Ok("arm64"),
        other => Err(format!("unsupported architecture for updates: {other}")),
    }
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

fn find_package_root(extract_dir: &Path) -> Result<PathBuf, String> {
    let mut candidates: Vec<PathBuf> = fs::read_dir(extract_dir)
        .map_err(|error| error.to_string())?
        .filter_map(|entry| entry.ok().map(|entry| entry.path()))
        .filter(|path| path.is_dir())
        .collect();

    candidates.sort();

    for candidate in &candidates {
        if candidate.join("pixelanea-server").is_file()
            && candidate.join("web/index.html").is_file()
        {
            return Ok(candidate.clone());
        }
    }

    if extract_dir.join("pixelanea-server").is_file() {
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

    let files = [
        "pixelanea-server",
        "pixelanea-shell",
        "pixelanea-browser",
        "logo-glyph.svg",
    ];

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

fn install_deb_package(deb_path: &Path) -> Result<(), String> {
    if Command::new("pkexec")
        .arg("dpkg")
        .arg("-i")
        .arg(deb_path)
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
    {
        return Ok(());
    }

    Err(
        "Could not install the .deb package. Run manually with: \
         sudo apt install ./pixelanea_*.deb"
            .to_string(),
    )
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
    fn detects_install_kinds() {
        let user_paths = InstallPaths {
            install_dir: PathBuf::from("/home/alice/.local/share/pixelanea"),
            server_binary: PathBuf::from("/home/alice/.local/share/pixelanea/pixelanea-server"),
            web_root: PathBuf::from("/home/alice/.local/share/pixelanea/web"),
        };
        std::env::set_var("HOME", "/home/alice");
        assert_eq!(detect_install_kind(&user_paths), InstallKind::UserLocal);

        let system_paths = InstallPaths {
            install_dir: PathBuf::from("/usr/share/pixelanea"),
            server_binary: PathBuf::from("/usr/share/pixelanea/pixelanea-server"),
            web_root: PathBuf::from("/usr/share/pixelanea/web"),
        };
        assert_eq!(detect_install_kind(&system_paths), InstallKind::SystemDeb);
    }
}
