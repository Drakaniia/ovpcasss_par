//! Pure window-bounds arithmetic (desktop window chrome spec §9.3).
//!
//! The saved rectangle is clamped before it is applied, because a monitor that
//! was unplugged since the last run is the case that strands a window off screen.
//! Nothing here touches the OS, so every rule is unit tested.

use serde::{Deserialize, Serialize};

pub const MIN_WIDTH: u32 = 1024;
pub const MIN_HEIGHT: u32 = 700;
pub const DEFAULT_WIDTH: u32 = 1280;
pub const DEFAULT_HEIGHT: u32 = 860;
/// How much of the window must stay reachable on some monitor.
const MIN_VISIBLE_WIDTH: i32 = 160;
const MIN_VISIBLE_HEIGHT: i32 = 120;

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct Bounds {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub maximized: bool,
}

#[derive(Clone, Copy, Debug)]
pub struct WorkArea {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

/// The default window: centred when a monitor is known, a fixed inset when not.
pub fn default_bounds(area: Option<WorkArea>) -> Bounds {
    match area {
        Some(area) => Bounds {
            x: area.x + (area.width - DEFAULT_WIDTH as i32) / 2,
            y: area.y + (area.height - DEFAULT_HEIGHT as i32) / 2,
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            maximized: false,
        },
        None => Bounds {
            x: 120,
            y: 80,
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            maximized: false,
        },
    }
}

fn visible_with(bounds: Bounds, area: &WorkArea) -> (i32, i32) {
    let left = bounds.x.max(area.x);
    let top = bounds.y.max(area.y);
    let right = (bounds.x + bounds.width as i32).min(area.x + area.width);
    let bottom = (bounds.y + bounds.height as i32).min(area.y + area.height);

    ((right - left).max(0), (bottom - top).max(0))
}

fn on_some_monitor(bounds: Bounds, monitors: &[WorkArea]) -> Option<usize> {
    monitors.iter().position(|area| {
        let (width, height) = visible_with(bounds, area);
        width >= MIN_VISIBLE_WIDTH && height >= MIN_VISIBLE_HEIGHT
    })
}

/// Clamps saved bounds onto a monitor that still exists. A window that would be
/// off screen, oversized or below the minimum lands centred and fully visible.
pub fn clamp(bounds: Bounds, monitors: &[WorkArea]) -> Bounds {
    let Some(primary) = monitors.first() else {
        return default_bounds(None);
    };

    let target = on_some_monitor(bounds, monitors).map_or(*primary, |index| monitors[index]);

    // A work area narrower than the minimum still wins: the window must fit.
    let max_width = target.width.max(MIN_WIDTH as i32) as u32;
    let max_height = target.height.max(MIN_HEIGHT as i32) as u32;
    let width = bounds.width.clamp(MIN_WIDTH, max_width);
    let height = bounds.height.clamp(MIN_HEIGHT, max_height);

    let centre_x = bounds.x + (width as i32) / 2;
    let centre_y = bounds.y + (height as i32) / 2;
    let inside = centre_x >= target.x
        && centre_x <= target.x + target.width
        && centre_y >= target.y
        && centre_y <= target.y + target.height;

    let (x, y) = if inside && on_some_monitor(bounds, monitors).is_some() {
        (
            bounds.x.clamp(
                target.x - width as i32 + MIN_VISIBLE_WIDTH,
                target.x + target.width - MIN_VISIBLE_WIDTH,
            ),
            bounds.y.clamp(
                target.y - height as i32 + MIN_VISIBLE_HEIGHT,
                target.y + target.height - MIN_VISIBLE_HEIGHT,
            ),
        )
    } else {
        (
            target.x + (target.width - width as i32) / 2,
            target.y + (target.height - height as i32) / 2,
        )
    };

    Bounds {
        x,
        y,
        width,
        height,
        maximized: bounds.maximized,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const PRIMARY: WorkArea = WorkArea {
        x: 0,
        y: 0,
        width: 1920,
        height: 1040,
    };

    const SECONDARY: WorkArea = WorkArea {
        x: 1920,
        y: 0,
        width: 1280,
        height: 984,
    };

    fn bounds(x: i32, y: i32, width: u32, height: u32) -> Bounds {
        Bounds {
            x,
            y,
            width,
            height,
            maximized: false,
        }
    }

    #[test]
    fn keeps_bounds_that_are_on_screen() {
        let saved = bounds(200, 120, 1280, 860);
        assert_eq!(clamp(saved, &[PRIMARY]), saved);
    }

    #[test]
    fn recentres_a_window_left_offscreen() {
        let clamped = clamp(bounds(-4000, -3000, 1280, 860), &[PRIMARY]);
        assert!(clamped.x >= PRIMARY.x - clamped.width as i32 + MIN_VISIBLE_WIDTH);
        assert!(clamped.y >= PRIMARY.y - clamped.height as i32 + MIN_VISIBLE_HEIGHT);
        assert_eq!(clamped.width, 1280);
    }

    #[test]
    fn enforces_the_minimum_size() {
        let clamped = clamp(bounds(100, 100, 640, 480), &[PRIMARY]);
        assert_eq!(clamped.width, MIN_WIDTH);
        assert_eq!(clamped.height, MIN_HEIGHT);
    }

    #[test]
    fn shrinks_a_window_larger_than_the_work_area() {
        let clamped = clamp(bounds(0, 0, 3000, 2000), &[PRIMARY]);
        assert_eq!(clamped.width, PRIMARY.width as u32);
        assert_eq!(clamped.height, PRIMARY.height as u32);
    }

    #[test]
    fn moves_a_window_whose_monitor_is_gone_to_the_primary() {
        let clamped = clamp(bounds(2600, 200, 1280, 860), &[PRIMARY]);
        assert_eq!(clamped.x + clamped.width as i32 / 2, PRIMARY.width / 2);
        assert!(!clamped.maximized);
    }

    #[test]
    fn keeps_a_window_on_the_secondary_monitor() {
        let saved = bounds(2100, 100, 1200, 860);
        let clamped = clamp(saved, &[PRIMARY, SECONDARY]);
        assert_eq!(clamped.x, 2100);
    }

    #[test]
    fn keeps_the_maximized_flag_through_a_clamp() {
        let clamped = clamp(
            Bounds {
                maximized: true,
                ..bounds(2600, 200, 1280, 860)
            },
            &[PRIMARY],
        );
        assert!(clamped.maximized);
    }

    #[test]
    fn falls_back_to_the_primary_when_no_monitor_is_known() {
        let clamped = clamp(bounds(10, 20, 1280, 860), &[]);
        assert_eq!(clamped, default_bounds(None));
    }

    #[test]
    fn defaults_centre_on_the_primary_monitor() {
        let default = default_bounds(Some(PRIMARY));
        assert_eq!(default.width, DEFAULT_WIDTH);
        assert_eq!(default.x, (PRIMARY.width - DEFAULT_WIDTH as i32) / 2);
        assert!(!default.maximized);
    }
}
