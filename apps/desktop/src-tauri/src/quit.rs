//! Graceful quit: ask the WebView to flush SyncCoordinator before the shell
//! drops `ServerProcess` (which kills pixelanea-server). Thin shell only —
//! no SQL, domain, or OpenAPI shutdown endpoints.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Manager, Window, WindowEvent};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind, MessageDialogResult};

/// How long to wait for `quit_flush_complete` before forcing a warn + exit.
pub const QUIT_FLUSH_TIMEOUT_MS: u64 = 8_000;

pub struct QuitCoordinator {
    /// CloseRequested started a flush; ignore duplicate closes.
    in_progress: AtomicBool,
    /// Finish handler already ran (invoke or timeout); only one wins.
    finished: AtomicBool,
    /// Next CloseRequested should proceed (after user confirmed force-quit).
    allow_close: AtomicBool,
}

impl QuitCoordinator {
    pub fn new() -> Self {
        Self {
            in_progress: AtomicBool::new(false),
            finished: AtomicBool::new(false),
            allow_close: AtomicBool::new(false),
        }
    }

    fn reset(&self) {
        self.in_progress.store(false, Ordering::SeqCst);
        self.finished.store(false, Ordering::SeqCst);
        self.allow_close.store(false, Ordering::SeqCst);
    }
}

/// Builder `.on_window_event` hook — prevent close until WebView flush finishes.
pub fn handle_window_event(window: &Window, event: &WindowEvent) {
    let WindowEvent::CloseRequested { api, .. } = event else {
        return;
    };

    let app = window.app_handle().clone();
    let Some(coord_state) = app.try_state::<Arc<QuitCoordinator>>() else {
        // Setup not finished yet — allow default close.
        return;
    };
    let coord = coord_state.inner().clone();

    if coord.allow_close.load(Ordering::SeqCst) {
        return;
    }

    api.prevent_close();

    if coord.in_progress.swap(true, Ordering::SeqCst) {
        return;
    }

    coord.finished.store(false, Ordering::SeqCst);
    begin_quit_flush(&app, coord);
}

fn begin_quit_flush(app: &AppHandle, coord: Arc<QuitCoordinator>) {
    if let Some(window) = app.get_webview_window("main") {
        // Kick WebView prepareQuit; it invokes quit_flush_complete when done.
        let script = r#"(function(){
  try {
    if (typeof window.__pixelaneaPrepareQuit === 'function') {
      window.__pixelaneaPrepareQuit();
      return;
    }
  } catch (e) {}
  try {
    if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
      window.__TAURI_INTERNALS__.invoke('quit_flush_complete', { ok: true });
    }
  } catch (e) {}
})()"#;
        if let Err(error) = window.eval(script) {
            log::warn!("quit: failed to eval prepareQuit: {error}");
        }
    } else {
        finalize_quit(app, &coord, true, false);
        return;
    }

    let app_timeout = app.clone();
    let coord_timeout = coord;
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(QUIT_FLUSH_TIMEOUT_MS));
        if !coord_timeout.in_progress.load(Ordering::SeqCst) {
            return;
        }
        if coord_timeout.finished.load(Ordering::SeqCst) {
            return;
        }
        let app_for_quit = app_timeout.clone();
        let coord_for_quit = coord_timeout.clone();
        let _ = app_timeout.run_on_main_thread(move || {
            finalize_quit(&app_for_quit, &coord_for_quit, false, true);
        });
    });
}

/// Invoked from the WebView after `flushAllSync` (or failure).
#[tauri::command]
pub fn quit_flush_complete(app: AppHandle, ok: bool) {
    let Some(coord_state) = app.try_state::<Arc<QuitCoordinator>>() else {
        return;
    };
    let coord = coord_state.inner().clone();
    if !coord.in_progress.load(Ordering::SeqCst) {
        return;
    }
    finalize_quit(&app, &coord, ok, false);
}

fn finalize_quit(app: &AppHandle, coord: &QuitCoordinator, ok: bool, timed_out: bool) {
    if coord
        .finished
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return;
    }

    if ok && !timed_out {
        destroy_main(app, coord);
        return;
    }

    let message = if timed_out {
        "Timed out waiting to save. Quit anyway? Unsaved edits may be lost."
    } else {
        "Couldn't save all changes before quit. Quit anyway? Unsaved edits may be lost."
    };

    let choice = app
        .dialog()
        .message(message)
        .title("Pixelanea")
        .kind(MessageDialogKind::Warning)
        .buttons(MessageDialogButtons::OkCancel)
        .blocking_show_with_result();

    match choice {
        MessageDialogResult::Ok | MessageDialogResult::Yes => {
            destroy_main(app, coord);
        }
        _ => {
            coord.reset();
            log::info!("quit: user cancelled force-quit after flush warning");
        }
    }
}

fn destroy_main(app: &AppHandle, coord: &QuitCoordinator) {
    coord.allow_close.store(true, Ordering::SeqCst);
    if let Some(window) = app.get_webview_window("main") {
        if let Err(error) = window.destroy() {
            log::warn!("quit: destroy failed ({error}); exiting process");
            app.exit(0);
        }
    } else {
        app.exit(0);
    }
}
