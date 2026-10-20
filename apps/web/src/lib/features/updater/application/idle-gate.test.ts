import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const listeners = new Map<string, () => void>();

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
  listeners.clear();
  vi.stubGlobal('window', {
    addEventListener: (event: string, listener: () => void) => {
      listeners.set(event, listener);
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('idle gate', () => {
  it('turns idle after five quiet minutes and resets on activity', async () => {
    const gate = await import('./idle-gate');
    let fired = 0;
    gate.onIdle(() => {
      fired += 1;
    });
    gate.startIdleTracking();

    vi.advanceTimersByTime(5 * 60 * 1000 - 1);
    expect(gate.isAppIdle()).toBe(false);

    vi.advanceTimersByTime(1);
    expect(gate.isAppIdle()).toBe(true);
    expect(fired).toBe(1);

    listeners.get('keydown')?.();
    expect(gate.isAppIdle()).toBe(false);

    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(fired).toBe(2);
  });
});
