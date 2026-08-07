use std::path::{Path, PathBuf};

#[cfg(not(windows))]
const DEFAULT_SYSTEM_INSTALL_DIR: &str = "/usr/share/pixelanea";

#[cfg(windows)]
const WINDOWS_PRODUCT_DIR: &str = "Pixelanea";

#[cfg(target_os = "macos")]
const MACOS_APP_NAME: &str = "Pixelanea.app";

fn server_binary_name() -> &'static str {
    if cfg!(windows) {
        "pixelanea-server.exe"
    } else {
        "pixelanea-server"
    }
}

#[derive(Debug, Clone)]
pub struct InstallPaths {
    pub install_dir: PathBuf,
    pub server_binary: PathBuf,
    pub web_root: PathBuf,
}

pub fn resolve_install_paths() -> Result<InstallPaths, String> {
    let install_dir = resolve_install_dir()?;
    let paths = install_paths_from_dir(&install_dir);

    if !paths.server_binary.is_file() {
        return Err(format!(
            "pixelanea-server not found at {}",
            paths.server_binary.display()
        ));
    }
    if !paths.web_root.join("index.html").is_file() {
        return Err(format!(
            "web bundle not found at {}",
            paths.web_root.display()
        ));
    }

    Ok(paths)
}

fn install_paths_from_dir(install_dir: &Path) -> InstallPaths {
    InstallPaths {
        install_dir: install_dir.to_path_buf(),
        server_binary: install_dir.join(server_binary_name()),
        web_root: install_dir.join("web"),
    }
}

fn install_dir_from_colocated_assets(candidate: &Path) -> Option<PathBuf> {
    let server = candidate.join(server_binary_name());
    let web_index = candidate.join("web/index.html");
    if server.is_file() && web_index.is_file() {
        Some(candidate.to_path_buf())
    } else {
        None
    }
}

#[cfg(windows)]
fn windows_local_appdata_install() -> Option<PathBuf> {
    let local = std::env::var("LOCALAPPDATA").ok()?;
    install_dir_from_colocated_assets(&PathBuf::from(local).join(WINDOWS_PRODUCT_DIR))
}

#[cfg(windows)]
fn windows_program_files_dir() -> Option<PathBuf> {
    if let Ok(program_files) = std::env::var("ProgramFiles") {
        return Some(PathBuf::from(program_files).join(WINDOWS_PRODUCT_DIR));
    }
    if let Ok(program_files_x86) = std::env::var("ProgramFiles(x86)") {
        return Some(PathBuf::from(program_files_x86).join(WINDOWS_PRODUCT_DIR));
    }
    None
}

#[cfg(windows)]
fn windows_exe_asset_candidates(exe_dir: &Path) -> Vec<PathBuf> {
    let mut candidates = vec![
        exe_dir.to_path_buf(),
        exe_dir.join("resources").join("pixelanea"),
        exe_dir.join("pixelanea"),
    ];
    if let Some(program_files) = windows_program_files_dir() {
        if exe_dir == program_files.as_path() {
            candidates.push(program_files.join("resources").join("pixelanea"));
        }
    }
    candidates
}

#[cfg(target_os = "macos")]
fn macos_app_resources_dir(app_bundle: &Path) -> PathBuf {
    app_bundle.join("Contents/Resources/pixelanea")
}

#[cfg(target_os = "macos")]
fn macos_standard_app_locations() -> Vec<PathBuf> {
    let mut locations = Vec::new();
    if let Ok(home) = std::env::var("HOME") {
        locations.push(PathBuf::from(home).join("Applications").join(MACOS_APP_NAME));
    }
    locations.push(PathBuf::from("/Applications").join(MACOS_APP_NAME));
    locations
}

#[cfg(target_os = "macos")]
fn macos_exe_asset_candidates(exe_dir: &Path) -> Vec<PathBuf> {
    let mut candidates = vec![exe_dir.to_path_buf()];

    if let Some(contents_dir) = exe_dir.parent() {
        if contents_dir.file_name().is_some_and(|name| name == "MacOS") {
            if let Some(app_bundle) = contents_dir.parent().and_then(|contents| contents.parent()) {
                candidates.push(macos_app_resources_dir(app_bundle));
            }
        }
    }

    for app_bundle in macos_standard_app_locations() {
        candidates.push(macos_app_resources_dir(&app_bundle));
    }

    candidates
}

fn resolve_install_dir() -> Result<PathBuf, String> {
    if let Ok(root) = std::env::var("PIXELANEA_ROOT") {
        let path = PathBuf::from(root);
        if path.is_dir() {
            return Ok(path);
        }
        return Err(format!("PIXELANEA_ROOT is not a directory: {}", path.display()));
    }

    #[cfg(windows)]
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            for candidate in windows_exe_asset_candidates(parent) {
                if let Some(dir) = install_dir_from_colocated_assets(&candidate) {
                    return Ok(dir);
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            for candidate in macos_exe_asset_candidates(parent) {
                if let Some(dir) = install_dir_from_colocated_assets(&candidate) {
                    return Ok(dir);
                }
            }
        }
    }

    #[cfg(all(not(windows), not(target_os = "macos")))]
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            if parent == Path::new("/usr/bin") || parent == Path::new("/usr/local/bin") {
                return Ok(PathBuf::from(DEFAULT_SYSTEM_INSTALL_DIR));
            }
            if let Some(dir) = install_dir_from_colocated_assets(parent) {
                return Ok(dir);
            }
        }
    }

    #[cfg(windows)]
    if let Some(dir) = windows_local_appdata_install() {
        return Ok(dir);
    }

    dev_repo_root()
}

fn dev_repo_root() -> Result<PathBuf, String> {
    // apps/desktop/src-tauri → repo root
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let repo_root = manifest_dir
        .join("../../..")
        .canonicalize()
        .map_err(|error| format!("failed to resolve dev repo root: {error}"))?;

    if !repo_root.join("VERSION").is_file() {
        return Err(format!(
            "dev repo root missing VERSION: {}",
            repo_root.display()
        ));
    }

    Ok(repo_root)
}

pub fn dev_install_paths(repo_root: &Path) -> InstallPaths {
    let server_binary = if cfg!(windows) {
        repo_root.join("server/build/pixelanea-server.exe")
    } else {
        repo_root.join("server/build/pixelanea-server")
    };

    InstallPaths {
        install_dir: repo_root.to_path_buf(),
        server_binary,
        web_root: repo_root.join("apps/web/dist"),
    }
}

pub fn resolve_paths_flexible() -> Result<InstallPaths, String> {
    match resolve_install_paths() {
        Ok(paths) => Ok(paths),
        Err(_) => {
            let repo_root = dev_repo_root()?;
            let paths = dev_install_paths(&repo_root);
            if !paths.server_binary.is_file() {
                return Err(format!(
                    "Build pixelanea-server first: {}",
                    paths.server_binary.display()
                ));
            }
            if !paths.web_root.join("index.html").is_file() {
                return Err(format!(
                    "Build the web bundle first: {}",
                    paths.web_root.display()
                ));
            }
            Ok(paths)
        }
    }
}

pub fn default_host() -> String {
    std::env::var("PIXELANEA_HOST").unwrap_or_else(|_| "127.0.0.1".to_string())
}

pub fn default_port() -> u16 {
    std::env::var("PIXELANEA_PORT")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(8787)
}

pub fn devtools_requested() -> bool {
    cfg!(debug_assertions) && std::env::args().any(|arg| arg == "--devtools")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_port_is_8787() {
        std::env::remove_var("PIXELANEA_PORT");
        assert_eq!(default_port(), 8787);
    }

    #[test]
    fn colocated_assets_detected() {
        let dir = std::env::temp_dir().join("pixelanea-paths-test");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join("web")).unwrap();
        std::fs::write(dir.join(server_binary_name()), b"stub").unwrap();
        std::fs::write(dir.join("web/index.html"), b"<html></html>").unwrap();

        assert!(install_dir_from_colocated_assets(&dir).is_some());

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn windows_resource_layout_detected() {
        let dir = std::env::temp_dir().join("pixelanea-paths-win-resource");
        let resource_dir = dir.join("resources").join("pixelanea");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(resource_dir.join("web")).unwrap();
        std::fs::write(resource_dir.join(server_binary_name()), b"stub").unwrap();
        std::fs::write(resource_dir.join("web/index.html"), b"<html></html>").unwrap();

        assert!(install_dir_from_colocated_assets(&resource_dir).is_some());

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn macos_resource_layout_detected() {
        let dir = std::env::temp_dir().join("pixelanea-paths-macos-resource");
        let app_bundle = dir.join("Pixelanea.app");
        let resource_dir = app_bundle
            .join("Contents")
            .join("Resources")
            .join("pixelanea");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(resource_dir.join("web")).unwrap();
        std::fs::write(resource_dir.join(server_binary_name()), b"stub").unwrap();
        std::fs::write(resource_dir.join("web/index.html"), b"<html></html>").unwrap();

        assert!(install_dir_from_colocated_assets(&resource_dir).is_some());

        let _ = std::fs::remove_dir_all(&dir);
    }
}
