//! Remembered window bounds (desktop window chrome spec §9.3).
//!
//! The window is created hidden and revealed by the splash handoff, so the saved
//! bounds are applied in `setup` before the reveal: the user never sees the
//! default size flash. The arithmetic lives in `window_bounds`; this module only
//! reads, writes and debounces the file.

use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WindowEvent};

use crate::window_bounds::{clamp, Bounds, WorkArea};

/// How long the window must sit still before its bounds are written.
const SAVE_DELAY: Duration = Duration::from_millis(400);
const FILE_NAME: &str = "window-state.json";

#[derive(Serialize, Deserialize)]
struct Stored {
    version: u32,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    maximized: bool,
}

/// The last bounds observed while the window was not maximized: a run that ends
/// maximized still remembers the size to restore to.
static LAST_NORMAL: Mutex<Option<Bounds>> = Mutex::new(None);
static SAVE_GENERATION: AtomicU64 = AtomicU64::new(0);

fn state_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|directory| directory.join(FILE_NAME))
}

/// Missing or unreadable state is not an error: the default size is the fallback.
pub fn load(app: &AppHandle) -> Bounds {
    let Some(path) = state_path(app) else {
        return crate::window_bounds::default_bounds(None);
    };

    let Ok(text) = std::fs::read_to_string(&path) else {
        return crate::window_bounds::default_bounds(None);
    };

    match serde_json::from_str::<Stored>(&text) {
        Ok(stored) if stored.version == 1 => Bounds {
            x: stored.x,
            y: stored.y,
            width: stored.width,
            height: stored.height,
            maximized: stored.maximized,
        },
        Ok(_) | Err(_) => crate::window_bounds::default_bounds(None),
    }
}

/// Writes through a temporary file so a crash mid-write cannot corrupt the state.
pub fn save(app: &AppHandle, bounds: Bounds) {
    let Some(path) = state_path(app) else { return };

    if let Some(parent) = path.parent() {
        if std::fs::create_dir_all(parent).is_err() {
            return;
        }
    }

    let stored = Stored {
        version: 1,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        maximized: bounds.maximized,
    };

    let Ok(text) = serde_json::to_string_pretty(&stored) else {
        return;
    };

    let temporary = path.with_extension("json.tmp");
    if std::fs::write(&temporary, text).is_err() || std::fs::rename(&temporary, &path).is_err() {
        #[cfg(debug_assertions)]
        eprintln!("[window-state] could not save {}", path.display());
    }
}

fn work_areas(app: &AppHandle) -> Vec<WorkArea> {
    let Ok(monitors) = app.available_monitors() else {
        return Vec::new();
    };

    // Tauri exposes the full monitor rect; Windows' work area subtracts the
    // taskbar. The full rect is used as an upper bound, which the clamp tolerates.
    monitors
        .iter()
        .map(|monitor| WorkArea {
            x: monitor.position().x,
            y: monitor.position().y,
            width: monitor.size().width as i32,
            height: monitor.size().height as i32,
        })
        .collect()
}

fn current_bounds(app: &AppHandle) -> Option<Bounds> {
    let window = app.get_webview_window("main")?;
    let position = window.outer_position().ok()?;
    let size = window.outer_size().ok()?;
    let maximized = window.is_maximized().unwrap_or(false);

    Some(Bounds {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        maximized,
    })
}

fn save_now(app: &AppHandle) {
    let Some(current) = current_bounds(app) else {
        return;
    };

    // A run that ends maximized still remembers the size to restore to.
    let last_normal = LAST_NORMAL.lock().ok().and_then(|last| *last);

    let bounds = if current.maximized {
        last_normal.map_or(
            Bounds {
                maximized: true,
                ..current
            },
            |normal| Bounds {
                maximized: true,
                ..normal
            },
        )
    } else {
        current
    };

    save(app, bounds);
}

/// Applies the remembered bounds before the splash reveals the window.
pub fn restore(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    let areas = work_areas(app);
    let bounds = clamp(load(app), &areas);

    let _ = window.set_size(PhysicalSize::new(bounds.width, bounds.height));
    let _ = window.set_position(PhysicalPosition::new(bounds.x, bounds.y));

    if bounds.maximized {
        let _ = window.maximize();
    } else if let Ok(mut last) = LAST_NORMAL.lock() {
        *last = Some(Bounds {
            maximized: false,
            ..bounds
        });
    }
}

fn schedule_save(app: &AppHandle) {
    let generation = SAVE_GENERATION.fetch_add(1, Ordering::SeqCst) + 1;
    let handle = app.clone();

    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(SAVE_DELAY).await;

        // A newer move or resize supersedes this write.
        if SAVE_GENERATION.load(Ordering::SeqCst) == generation {
            save_now(&handle);
        }
    });
}

/// Records the last normal bounds and writes them, debounced, on move/resize.
pub fn track(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    let handle = app.clone();

    window.on_window_event(move |event| match event {
        WindowEvent::Moved(_) | WindowEvent::Resized(_) => {
            if let Some(current) = current_bounds(&handle) {
                if !current.maximized {
                    if let Ok(mut last) = LAST_NORMAL.lock() {
                        *last = Some(current);
                    }
                }
            }

            schedule_save(&handle);
        }
        WindowEvent::CloseRequested { .. } => save_now(&handle),
        _ => {}
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn state_round_trips_through_json() {
        let stored = Stored {
            version: 1,
            x: 120,
            y: 80,
            width: 1280,
            height: 860,
            maximized: true,
        };

        let text = serde_json::to_string(&stored).unwrap();
        let parsed: Stored = serde_json::from_str(&text).unwrap();

        assert_eq!(parsed.x, 120);
        assert!(parsed.maximized);
    }

    #[test]
    fn corrupt_state_is_rejected() {
        assert!(serde_json::from_str::<Stored>("{").is_err());
        assert!(serde_json::from_str::<Stored>("{\"version\": 2}").is_err());
    }
}
