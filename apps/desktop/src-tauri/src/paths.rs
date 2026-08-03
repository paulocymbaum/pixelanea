use std::path::{Path, PathBuf};

const DEFAULT_SYSTEM_INSTALL_DIR: &str = "/usr/share/pixelanea";

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
        server_binary: install_dir.join("pixelanea-server"),
        web_root: install_dir.join("web"),
    }
}

fn resolve_install_dir() -> Result<PathBuf, String> {
    if let Ok(root) = std::env::var("PIXELANEA_ROOT") {
        let path = PathBuf::from(root);
        if path.is_dir() {
            return Ok(path);
        }
        return Err(format!("PIXELANEA_ROOT is not a directory: {}", path.display()));
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            if parent == Path::new("/usr/bin") || parent == Path::new("/usr/local/bin") {
                return Ok(PathBuf::from(DEFAULT_SYSTEM_INSTALL_DIR));
            }
        }
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
    InstallPaths {
        install_dir: repo_root.to_path_buf(),
        server_binary: repo_root.join("server/build/pixelanea-server"),
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
}
