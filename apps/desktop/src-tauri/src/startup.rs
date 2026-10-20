//! Splash handoff (docs/spec/startup-splash-spec.md §7.4).
//!
//! The splash window paints, then the main window's layout reports ready once
//! the session is resolved and the landing route has painted. The main window is
//! created hidden, so revealing it is one atomic show-and-focus; the splash
//! closes last, after its own dissolve.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Emitter, Manager};

const MAIN_WINDOW: &str = "main";
const SPLASH_WINDOW: &str = "splash";
const DISSOLVE_EVENT: &str = "splash:dissolve";

/// Floor from the splash's first paint, so a fast start is never a flash.
const MIN_VISIBLE: Duration = Duration::from_millis(400);
/// Matches the splash page's opacity transition.
const DISSOLVE: Duration = Duration::from_millis(140);
/// A webview that never reports ready must not trap the user behind a splash.
const READY_TIMEOUT: Duration = Duration::from_secs(10);

/// Handoff bookkeeping shared by the commands and the safety timeout.
pub struct StartupState {
    created_at: Instant,
    painted_at: Mutex<Option<Instant>>,
    revealed: AtomicBool,
}

impl StartupState {
    pub fn new() -> Self {
        Self {
            created_at: Instant::now(),
            painted_at: Mutex::new(None),
            revealed: AtomicBool::new(false),
        }
    }
}

/// How long the splash still owes the user, measured from its first paint.
/// A splash that never reported a paint owes nothing — correctness over polish.
fn remaining_hold(painted_at: Option<Instant>, now: Instant) -> Duration {
    match painted_at {
        Some(painted) => MIN_VISIBLE.saturating_sub(now.saturating_duration_since(painted)),
        None => Duration::ZERO,
    }
}

/// A poisoned lock only means another command panicked mid-recording; the
/// timestamp itself is still readable.
fn painted_at(state: &StartupState) -> Option<Instant> {
    *state
        .painted_at
        .lock()
        .unwrap_or_else(|error| error.into_inner())
}

/// Called by the splash page on its first frame.
#[tauri::command]
pub fn splash_painted(state: tauri::State<StartupState>) {
    let mut painted = state
        .painted_at
        .lock()
        .unwrap_or_else(|error| error.into_inner());

    if painted.is_none() {
        *painted = Some(Instant::now());
    }
}

/// Called once by the main window's root layout. Idempotent.
#[tauri::command]
pub async fn frontend_ready(app: AppHandle) {
    reveal(app, "frontend").await;
}

/// Shows the main window, dissolves the splash, then closes it. Safe when the
/// splash is already gone or when another caller won the race.
async fn reveal(app: AppHandle, source: &'static str) {
    let (created, hold) = {
        let state = app.state::<StartupState>();

        if state.revealed.swap(true, Ordering::SeqCst) {
            return;
        }

        (
            state.created_at,
            remaining_hold(painted_at(&state), Instant::now()),
        )
    };

    if !hold.is_zero() {
        tokio::time::sleep(hold).await;
    }

    if let Some(main) = app.get_webview_window(MAIN_WINDOW) {
        let _ = main.show();
        let _ = main.set_focus();
    }

    let splash = app.get_webview_window(SPLASH_WINDOW);
    if let Some(window) = &splash {
        let _ = window.emit(DISSOLVE_EVENT, ());
    }

    tokio::time::sleep(DISSOLVE).await;
    if let Some(window) = splash {
        // Already closed (crash, Alt+F4 during startup) is not an error here.
        let _ = window.close();
    }

    #[cfg(debug_assertions)]
    eprintln!(
        "[startup] revealed by {source} at {} ms (held {} ms)",
        created.elapsed().as_millis(),
        hold.as_millis()
    );
}

/// The only path that reveals without the frontend's consent (spec §6.4).
pub fn spawn_ready_timeout(app: &tauri::App) {
    let handle = app.handle().clone();

    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(READY_TIMEOUT).await;

        let pending = {
            let state = handle.state::<StartupState>();
            !state.revealed.load(Ordering::SeqCst)
        };

        if pending {
            eprintln!(
                "[startup] the webview did not signal ready within {} s; revealing anyway",
                READY_TIMEOUT.as_secs()
            );
            reveal(handle, "timeout").await;
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn holds_the_rest_of_the_minimum_dwell() {
        let painted = Instant::now();

        assert_eq!(
            remaining_hold(Some(painted), painted + Duration::from_millis(100)),
            Duration::from_millis(300)
        );
    }

    #[test]
    fn owes_nothing_once_the_minimum_has_elapsed() {
        let painted = Instant::now();

        assert_eq!(
            remaining_hold(Some(painted), painted + Duration::from_millis(500)),
            Duration::ZERO
        );
    }

    #[test]
    fn owes_nothing_when_the_splash_never_painted() {
        assert_eq!(remaining_hold(None, Instant::now()), Duration::ZERO);
    }
}
