use std::path::{Path, PathBuf};

/// Resolve a `.pixelanea` bundle path from process arguments (menu launch, CLI, or
/// single-instance callback).
pub fn extract_bundle_path_from_args(args: &[String], cwd: Option<&Path>) -> Option<PathBuf> {
    for arg in args {
        if arg == "--devtools" || arg.starts_with('-') {
            continue;
        }

        let raw = Path::new(arg);
        if !is_pixelanea_bundle_name(raw) {
            continue;
        }

        let path = if raw.is_relative() {
            cwd.map(|dir| dir.join(raw)).unwrap_or_else(|| raw.to_path_buf())
        } else {
            raw.to_path_buf()
        };

        if let Ok(canonical) = path.canonicalize() {
            if canonical.is_file() {
                return Some(canonical);
            }
        }
    }

    None
}

fn is_pixelanea_bundle_name(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| ext.eq_ignore_ascii_case("pixelanea"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::atomic::{AtomicU64, Ordering};

    static TEMP_COUNTER: AtomicU64 = AtomicU64::new(0);

    fn temp_bundle() -> PathBuf {
        let id = TEMP_COUNTER.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!("pixelanea-argv-test-{id}.pixelanea"));
        fs::write(&path, b"test").expect("write temp bundle");
        path
    }

    #[test]
    fn finds_absolute_bundle_path() {
        let bundle = temp_bundle();
        let args = vec![
            "/usr/bin/pixelanea-shell".to_string(),
            bundle.display().to_string(),
        ];
        let found = extract_bundle_path_from_args(&args, None).expect("expected path");
        assert_eq!(found, bundle.canonicalize().unwrap());
        fs::remove_file(bundle).ok();
    }

    #[test]
    fn resolves_relative_bundle_against_cwd() {
        let bundle = temp_bundle();
        let cwd = bundle.parent().expect("parent");
        let relative = bundle.file_name().expect("file name").to_string_lossy().to_string();
        let args = vec![relative];
        let found = extract_bundle_path_from_args(&args, Some(cwd)).expect("expected path");
        assert_eq!(found, bundle.canonicalize().unwrap());
        fs::remove_file(bundle).ok();
    }

    #[test]
    fn ignores_non_bundle_args() {
        let args = vec!["--devtools".to_string(), "/tmp/not-a-project.txt".to_string()];
        assert!(extract_bundle_path_from_args(&args, None).is_none());
    }
}
