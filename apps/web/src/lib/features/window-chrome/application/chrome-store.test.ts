import { beforeEach, describe, expect, it, vi } from 'vitest';

import { chromeState, toggleMaximize } from './chrome-store.svelte';

const fake = vi.hoisted(() => ({
  setFullscreen: vi.fn(async () => {}),
  toggleMaximize: vi.fn(async () => {}),
  isMaximized: vi.fn(async () => false),
  isFullscreen: vi.fn(async () => false),
}));

vi.mock('./chrome-adapter', () => ({ chromeAdapter: async () => fake }));

describe('toggleMaximize', () => {
  beforeEach(() => {
    fake.setFullscreen.mockClear();
    fake.toggleMaximize.mockClear();
    fake.isMaximized.mockResolvedValue(false);
    fake.isFullscreen.mockResolvedValue(false);

    chromeState.ready = true;
    chromeState.fullscreen = false;
    chromeState.maximized = false;
  });

  it('maximizes a windowed shell', async () => {
    await toggleMaximize();

    expect(fake.toggleMaximize).toHaveBeenCalledTimes(1);
    expect(fake.setFullscreen).not.toHaveBeenCalled();
  });

  it('leaves full screen and restores the windowed size', async () => {
    chromeState.fullscreen = true;
    chromeState.maximized = true;

    await toggleMaximize();

    expect(fake.setFullscreen).toHaveBeenCalledWith(false);
    expect(fake.toggleMaximize).toHaveBeenCalledTimes(1);
  });

  it('leaves full screen without un-maximizing a window that was not maximized', async () => {
    chromeState.fullscreen = true;
    chromeState.maximized = false;

    await toggleMaximize();

    expect(fake.setFullscreen).toHaveBeenCalledWith(false);
    expect(fake.toggleMaximize).not.toHaveBeenCalled();
  });
});
