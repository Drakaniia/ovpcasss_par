//! Windows 11 rounded corners for the frameless window (spec §9.3).
//!
//! A frameless window loses the caption's corner rounding. DWM still draws it
//! when asked; Windows 10 has no such attribute and ignores the failure, so the
//! square fallback costs nothing and CSS never fakes a shadow outside the window.

use std::ffi::c_void;

use tauri::{AppHandle, Manager};
use windows::Win32::Foundation::HWND;
use windows::Win32::Graphics::Dwm::{
    DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND,
};

pub fn apply(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let Ok(raw) = window.hwnd() else {
        return;
    };

    let hwnd = HWND(raw.0 as isize as *mut c_void);
    let preference = DWMWCP_ROUND;

    unsafe {
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE,
            &preference as *const _ as *const c_void,
            size_of_val(&preference) as u32,
        );
    }
}
