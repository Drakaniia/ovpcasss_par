/**
 * Tracks uninterrupted inactivity so an update can install itself without
 * interrupting someone who is still working. Five minutes matches the window
 * the settings card promises.
 */
const IDLE_MS = 5 * 60 * 1000;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

let idle = false;
let lastActivity = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let tracking = false;

const listeners = new Set<() => void>();

function schedule(): void {
  clearTimeout(timer);
  timer = setTimeout(
    () => {
      idle = true;
      for (const listener of listeners) listener();
    },
    Math.max(0, IDLE_MS - (Date.now() - lastActivity)),
  );
}

function onActivity(): void {
  lastActivity = Date.now();
  idle = false;
  schedule();
}

export function isAppIdle(): boolean {
  return idle;
}

export function onIdle(listener: () => void): void {
  listeners.add(listener);
}

export function startIdleTracking(): void {
  if (tracking || typeof window === 'undefined') return;
  tracking = true;

  onActivity();
  for (const event of ACTIVITY_EVENTS) {
    window.addEventListener(event, onActivity, { passive: true });
  }
}
