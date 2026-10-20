//! Native behaviour for the app-drawn titlebar (desktop window chrome spec §9.3).
//!
//! The DOM draws the bar, but three things only the window procedure knows: the
//! resize bands of a frameless window, the maximize button's Snap Layout flyout,
//! and pointer hover over that button (Windows treats it as non-client area, so
//! the DOM never sees it). Everything else is forwarded untouched.

use std::ffi::c_void;
use std::mem::size_of;
use std::sync::Mutex;

use serde::Deserialize;
use tauri::{AppHandle, Emitter, Manager};
use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, POINT, RECT, WPARAM};
use windows::Win32::Graphics::Gdi::{
    GetMonitorInfoW, MonitorFromWindow, ScreenToClient, MONITORINFO, MONITOR_DEFAULTTONEAREST,
};
use windows::Win32::UI::Shell::{DefSubclassProc, RemoveWindowSubclass, SetWindowSubclass};
use windows::Win32::UI::HiDpi::GetDpiForWindow;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    TrackMouseEvent, TME_LEAVE, TME_NONCLIENT, TRACKMOUSEEVENT,
};
use windows::Win32::UI::WindowsAndMessaging::{GetClientRect, GetWindowRect, IsIconic, IsZoomed};

const SUBCLASS_ID: usize = 0x5041_5243;

const WM_NCHITTEST: u32 = 0x0084;
const WM_NCMOUSEMOVE: u32 = 0x00A0;
const WM_NCLBUTTONDOWN: u32 = 0x00A1;
const WM_NCLBUTTONUP: u32 = 0x00A2;
const WM_NCMOUSELEAVE: u32 = 0x02A2;

const HTCLIENT: isize = 1;
const HTMAXBUTTON: isize = 9;
const HTLEFT: isize = 10;
const HTRIGHT: isize = 11;
const HTTOP: isize = 12;
const HTTOPLEFT: isize = 13;
const HTTOPRIGHT: isize = 14;
const HTBOTTOM: isize = 15;
const HTBOTTOMLEFT: isize = 16;
const HTBOTTOMRIGHT: isize = 17;

/// Resize band in logical pixels, scaled by the window's DPI.
const RESIZE_BAND: i32 = 6;

/// The maximize button, in physical pixels relative to the client area. The
/// frontend keeps it current as the bar resizes or the webview zooms.
#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhysicalRect {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

static MAXIMIZE_RECT: Mutex<Option<PhysicalRect>> = Mutex::new(None);
static HOVERING: Mutex<bool> = Mutex::new(false);
static CONTEXT: Mutex<Option<usize>> = Mutex::new(None);

struct Context {
    app: AppHandle,
}

fn hwnd_of(window: &tauri::WebviewWindow) -> Option<HWND> {
    let raw = window.hwnd().ok()?;
    Some(HWND(raw.0 as isize as *mut c_void))
}

fn screen_point(lparam: LPARAM) -> POINT {
    POINT {
        x: (lparam.0 & 0xFFFF) as u16 as i16 as i32,
        y: ((lparam.0 >> 16) & 0xFFFF) as u16 as i16 as i32,
    }
}

fn client_point(hwnd: HWND, lparam: LPARAM) -> POINT {
    let mut point = screen_point(lparam);
    // A Result and a BOOL are both discarded the same way.
    let _ = unsafe { ScreenToClient(hwnd, &mut point) };
    point
}

fn client_size(hwnd: HWND) -> (i32, i32) {
    let mut rect = RECT::default();
    let _ = unsafe { GetClientRect(hwnd, &mut rect) };
    (rect.right - rect.left, rect.bottom - rect.top)
}

fn is_maximized_or_minimized(hwnd: HWND) -> bool {
    unsafe { IsZoomed(hwnd).as_bool() || IsIconic(hwnd).as_bool() }
}

/// A fullscreen window already covers its monitor; resize bands would fight it.
fn is_fullscreen(hwnd: HWND) -> bool {
    unsafe {
        let monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
        let mut info = MONITORINFO {
            cbSize: size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };

        if !GetMonitorInfoW(monitor, &mut info).as_bool() {
            return false;
        }

        let mut rect = RECT::default();
        let _ = GetWindowRect(hwnd, &mut rect);

        rect.left <= info.rcMonitor.left
            && rect.top <= info.rcMonitor.top
            && rect.right >= info.rcMonitor.right
            && rect.bottom >= info.rcMonitor.bottom
    }
}

fn in_maximize_rect(point: POINT) -> bool {
    let Ok(current) = MAXIMIZE_RECT.lock() else {
        return false;
    };
    let Some(rect) = *current else {
        return false;
    };

    let x = point.x as f64;
    let y = point.y as f64;

    x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
}

/// The hit test, in the order the spec gives: resize bands, then the maximize
/// button, then whatever the window procedure already decided.
fn hit_test(hwnd: HWND, lparam: LPARAM) -> isize {
    if !is_maximized_or_minimized(hwnd) && !is_fullscreen(hwnd) {
        let point = client_point(hwnd, lparam);
        let (width, height) = client_size(hwnd);
        let scale = unsafe { GetDpiForWindow(hwnd) } as f32 / 96.0;
        let band = ((RESIZE_BAND as f32) * scale).round() as i32;

        let left = point.x < band;
        let right = point.x >= width - band;
        let top = point.y < band;
        let bottom = point.y >= height - band;

        let hit = match (left, right, top, bottom) {
            (true, _, true, _) => Some(HTTOPLEFT),
            (_, true, true, _) => Some(HTTOPRIGHT),
            (true, _, _, true) => Some(HTBOTTOMLEFT),
            (_, true, _, true) => Some(HTBOTTOMRIGHT),
            (true, _, _, _) => Some(HTLEFT),
            (_, true, _, _) => Some(HTRIGHT),
            (_, _, true, _) => Some(HTTOP),
            (_, _, _, true) => Some(HTBOTTOM),
            _ => None,
        };

        if let Some(hit) = hit {
            return hit;
        }
    }

    let point = client_point(hwnd, lparam);
    if in_maximize_rect(point) {
        return HTMAXBUTTON;
    }

    HTCLIENT
}

fn set_hovering(app: &AppHandle, hovering: bool) {
    let changed = HOVERING
        .lock()
        .map(|mut current| {
            let changed = *current != hovering;
            *current = hovering;
            changed
        })
        .unwrap_or(false);

    if changed {
        let _ = app.emit("window-chrome:maximize-hover", hovering);
    }
}

/// Windows owns the Snap Layout flyout for `HTMAXBUTTON`, so the click is
/// toggled here rather than in the DOM, which receives no mouse events there.
fn toggle_maximize(window: &tauri::WebviewWindow) {
    if window.is_maximized().unwrap_or(false) {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
}

unsafe extern "system" fn subclass_proc(
    hwnd: HWND,
    message: u32,
    wparam: WPARAM,
    lparam: LPARAM,
    _id: usize,
    ref_data: usize,
) -> LRESULT {
    let app = &(*(ref_data as *const Context)).app;

    match message {
        WM_NCHITTEST => {
            let hit = hit_test(hwnd, lparam);
            if hit != HTCLIENT {
                return LRESULT(hit);
            }
        }
        WM_NCMOUSEMOVE => {
            let _ = TrackMouseEvent(&mut TRACKMOUSEEVENT {
                cbSize: size_of::<TRACKMOUSEEVENT>() as u32,
                dwFlags: TME_LEAVE | TME_NONCLIENT,
                hwndTrack: hwnd,
                dwHoverTime: 0,
            });

            set_hovering(app, in_maximize_rect(client_point(hwnd, lparam)));

            // Forwarded so the previous procedure still tracks the mouse.
        }
        WM_NCMOUSELEAVE => set_hovering(app, false),
        WM_NCLBUTTONDOWN => {
            if in_maximize_rect(client_point(hwnd, lparam)) {
                if let Some(window) = app.get_webview_window("main") {
                    toggle_maximize(&window);
                }
                return LRESULT(0);
            }
        }
        WM_NCLBUTTONUP => {
            if in_maximize_rect(client_point(hwnd, lparam)) {
                return LRESULT(0);
            }
        }
        _ => {}
    }

    DefSubclassProc(hwnd, message, wparam, lparam)
}

/// Subclasses the main window once the window exists.
pub fn install(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let Some(hwnd) = hwnd_of(&window) else {
        return;
    };

    let context = Box::into_raw(Box::new(Context { app: app.clone() }));

    let added =
        unsafe { SetWindowSubclass(hwnd, Some(subclass_proc), SUBCLASS_ID, context as usize) };

    if added.as_bool() {
        if let Ok(mut current) = CONTEXT.lock() {
            *current = Some(context as usize);
        }
    } else {
        unsafe { drop(Box::from_raw(context)) };
    }
}

/// Removes the subclass on exit; the reference data never outlives the window.
pub fn uninstall(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let Some(hwnd) = hwnd_of(&window) else {
        return;
    };

    let _ = unsafe { RemoveWindowSubclass(hwnd, Some(subclass_proc), SUBCLASS_ID) };

    if let Ok(mut current) = CONTEXT.lock() {
        if let Some(context) = current.take() {
            unsafe { drop(Box::from_raw(context as *mut Context)) };
        }
    }
}

/// Called by the titlebar: where the maximize button sits, in physical pixels.
#[tauri::command]
pub fn set_maximize_hit_rect(rect: Option<PhysicalRect>) {
    if let Ok(mut current) = MAXIMIZE_RECT.lock() {
        *current = rect;
    }
}

/// The View menu's Developer tools, compiled out of release builds.
#[tauri::command]
pub fn open_devtools(app: AppHandle) {
    #[cfg(debug_assertions)]
    if let Some(window) = app.get_webview_window("main") {
        window.open_devtools();
    }

    #[cfg(not(debug_assertions))]
    let _ = app;
}
