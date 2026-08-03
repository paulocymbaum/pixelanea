mod argv;
mod paths;
mod port;
mod server;

use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Mutex;

use argv::extract_bundle_path_from_args;
use paths::{devtools_requested, resolve_paths_flexible, InstallPaths};
use port::{app_url, find_free_port, is_pixelanea_healthy, is_port_listening};
use server::ServerProcess;
use tauri::webview::{WebviewWindow, WebviewWindowBuilder};
use tauri::{AppHandle, Manager, Url, WebviewUrl};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind, MessageDialogResult};

struct ShellState {
    server: Mutex<Option<ServerProcess>>,
    host: String,
    port: u16,
}

enum PortDecision {
    UseExisting,
    AlternatePort(u16),
    Cancel,
}

fn ask_port_in_use(app: &AppHandle, host: &str, port: u16) -> PortDecision {
    let message = format!(
        "Something is already using port {port} on {host} (likely Pixelanea).\n\n\
         Yes — open the existing instance\n\
         No — start on another port\n\
         Cancel — exit"
    );

    let choice = app
        .dialog()
        .message(message)
        .title("Pixelanea")
        .kind(MessageDialogKind::Warning)
        .buttons(MessageDialogButtons::YesNoCancel)
        .blocking_show_with_result();

    match choice {
        MessageDialogResult::Yes => PortDecision::UseExisting,
        MessageDialogResult::No => match find_free_port(host, port.saturating_add(1)) {
            Some(alt) => PortDecision::AlternatePort(alt),
            None => {
                app.dialog()
                    .message("No free port found nearby. Close the other process and try again.")
                    .title("Pixelanea")
                    .kind(MessageDialogKind::Error)
                    .blocking_show();
                PortDecision::Cancel
            }
        },
        MessageDialogResult::Cancel | MessageDialogResult::Ok => PortDecision::Cancel,
        MessageDialogResult::Custom(_) => PortDecision::Cancel,
    }
}

fn resolve_runtime_port(app: &AppHandle, host: &str, requested_port: u16) -> Option<u16> {
    if !is_port_listening(host, requested_port) {
        return Some(requested_port);
    }

    // Reuse a healthy local server without prompting (common after a crashed shell left
    // pixelanea-server running, or when the port dialog would appear before any window).
    if is_pixelanea_healthy(host, requested_port) {
        log::info!(
            "Port {requested_port} already serves a healthy Pixelanea API — reusing it"
        );
        return Some(requested_port);
    }

    match ask_port_in_use(app, host, requested_port) {
        PortDecision::UseExisting => Some(requested_port),
        PortDecision::AlternatePort(port) => Some(port),
        PortDecision::Cancel => None,
    }
}

fn start_server_if_needed(
    paths: &InstallPaths,
    host: &str,
    port: u16,
    listen_already: bool,
) -> Result<Option<ServerProcess>, String> {
    if listen_already {
        return Ok(None);
    }

    let process = ServerProcess::spawn(&paths.server_binary, host, port, &paths.web_root)?;
    process.wait_for_health(host, port)?;
    Ok(Some(process))
}

fn app_url_with_open(host: &str, port: u16, open_path: Option<&Path>) -> Result<Url, String> {
    let base = app_url(host, port);
    let mut parsed =
        Url::parse(&base).map_err(|error| format!("invalid app url {base}: {error}"))?;

    if let Some(path) = open_path {
        parsed
            .query_pairs_mut()
            .append_pair("open", path.to_string_lossy().as_ref());
    }

    Ok(parsed)
}

fn zenity_available() -> bool {
    Command::new("zenity")
        .arg("--version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn warn_zenity_missing(app: &AppHandle) {
    if zenity_available() {
        return;
    }

    app.dialog()
        .message(
            "zenity is not installed — File → Open and Save As will ask for a path instead of a native picker.\n\n\
             Install with: sudo apt install zenity",
        )
        .title("Pixelanea")
        .kind(MessageDialogKind::Info)
        .show(|_| {});
}

fn focus_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn eval_open_project(window: &WebviewWindow, path: &Path) -> Result<(), String> {
    let path_str = path.to_string_lossy();
    let path_json = serde_json::to_string(&path_str)
        .map_err(|error| format!("failed to encode open path: {error}"))?;
    let script = format!(
        "window.__pixelaneaOpenProject && window.__pixelaneaOpenProject({path_json})"
    );
    window
        .eval(&script)
        .map_err(|error| format!("failed to open project in webview: {error}"))?;
    Ok(())
}

fn open_bundle_in_running_instance(app: &AppHandle, path: &Path) {
    focus_main_window(app);

    if let Some(window) = app.get_webview_window("main") {
        if eval_open_project(&window, path).is_ok() {
            return;
        }

        let state = app.state::<ShellState>();
        if let Ok(url) = app_url_with_open(&state.host, state.port, Some(path)) {
            let _ = window.navigate(url);
        }
    }
}

fn open_main_window(
    app: &AppHandle,
    host: &str,
    port: u16,
    open_path: Option<&Path>,
) -> Result<(), String> {
    let parsed = app_url_with_open(host, port, open_path)?;

    WebviewWindowBuilder::new(app, "main", WebviewUrl::External(parsed))
        .title("Pixelanea")
        .inner_size(1280.0, 800.0)
        .min_inner_size(960.0, 640.0)
        .resizable(true)
        .devtools(devtools_requested())
        .on_navigation(|url| {
            matches!(url.host_str(), Some("127.0.0.1") | Some("localhost"))
        })
        .build()
        .map_err(|error| format!("failed to open Pixelanea window: {error}"))?;

    Ok(())
}

fn initial_bundle_path() -> Option<PathBuf> {
    let args: Vec<String> = std::env::args().collect();
    let cwd = std::env::current_dir().ok();
    extract_bundle_path_from_args(&args, cwd.as_deref())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            if let Some(path) = extract_bundle_path_from_args(&args, Some(Path::new(&cwd))) {
                open_bundle_in_running_instance(app, &path);
            } else {
                focus_main_window(app);
            }
        }));
    }

    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            let paths = resolve_paths_flexible().map_err(|error| {
                app.dialog()
                    .message(error.clone())
                    .title("Pixelanea")
                    .kind(MessageDialogKind::Error)
                    .blocking_show();
                error
            })?;

            let host = paths::default_host();
            let requested_port = paths::default_port();
            let Some(port) = resolve_runtime_port(app.handle(), &host, requested_port) else {
                std::process::exit(0);
            };

            let listen_already = is_port_listening(&host, port);
            let server =
                start_server_if_needed(&paths, &host, port, listen_already).map_err(|error| {
                    app.dialog()
                        .message(error.clone())
                        .title("Pixelanea")
                        .kind(MessageDialogKind::Error)
                        .blocking_show();
                    error
                })?;

            let startup_open = initial_bundle_path();

            app.manage(ShellState {
                server: Mutex::new(server),
                host: host.clone(),
                port,
            });

            open_main_window(
                app.handle(),
                &host,
                port,
                startup_open.as_deref(),
            )
            .map_err(|error| {
                app.dialog()
                    .message(error.clone())
                    .title("Pixelanea")
                    .kind(MessageDialogKind::Error)
                    .blocking_show();
                error
            })?;

            warn_zenity_missing(app.handle());

            log::info!(
                "Pixelanea shell ready at {} (spawned_server={}, startup_open={})",
                app_url(&host, port),
                !listen_already,
                startup_open
                    .as_ref()
                    .map(|path| path.display().to_string())
                    .unwrap_or_else(|| "none".to_string())
            );

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
