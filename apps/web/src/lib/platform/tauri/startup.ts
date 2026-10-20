import { invoke } from '@tauri-apps/api/core';

import type { StartupGate } from '../contracts';

/** Rust shows the main window, dissolves the splash, then closes it (spec §7.4). */
export function createStartupGate(): StartupGate {
  return {
    ready: () => invoke<void>('frontend_ready'),
  };
}
