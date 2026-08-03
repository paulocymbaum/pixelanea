mod paths;
mod port;
mod server;

use std::sync::Mutex;

use paths::{devtools_requested, resolve_paths_flexible, InstallPaths};
use port::{app_url, find_free_port, is_port_listening};
use server::ServerProcess;
use tauri::webview::WebviewWindowBuilder;
use tauri::{AppHandle, Manager, Url, WebviewUrl};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

struct ShellState {
    server: Mutex<Option<ServerProcess>>,
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
        .blocking_show();

    match choice {
        Some(true) => PortDecision::UseExisting,
        Some(false) => match find_free_port(host, port.saturating_add(1)) {
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
        None => PortDecision::Cancel,
    }
}

fn resolve_runtime_port(app: &AppHandle, host: &str, requested_port: u16) -> Option<u16> {
    if !is_port_listening(host, requested_port) {
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

fn open_main_window(app: &AppHandle, host: &str, port: u16) -> Result<(), String> {
    let url = app_url(host, port);
    let parsed = Url::parse(&url).map_err(|error| format!("invalid app url {url}: {error}"))?;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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

            app.manage(ShellState {
                server: Mutex::new(server),
            });

            open_main_window(app.handle(), &host, port).map_err(|error| {
                app.dialog()
                    .message(error.clone())
                    .title("Pixelanea")
                    .kind(MessageDialogKind::Error)
                    .blocking_show();
                error
            })?;

            log::info!(
                "Pixelanea shell ready at {} (spawned_server={})",
                app_url(&host, port),
                !listen_already
            );

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
