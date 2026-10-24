import { render } from 'svelte/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/') } }));
vi.mock('$lib/session/session.svelte', () => ({
  session: {
    get user() {
      return null;
    },
  },
}));

import { chromeState } from '../application/chrome-store.svelte';
import TitleBar from './TitleBar.svelte';

/**
 * The browser shell has no window to control and no native commands behind the
 * menus, so the bar drops the menu toolbar and keeps its own side margins.
 */
describe('TitleBar', () => {
  beforeEach(() => {
    chromeState.ready = true;
    chromeState.controllable = false;
  });

  it('hides the menu toolbar in the browser shell', () => {
    const { body } = render(TitleBar);

    expect(body).toContain('is-web');
    expect(body).not.toContain('data-menu-trigger');
  });

  it('keeps the menu toolbar on the desktop shell', () => {
    chromeState.controllable = true;

    const { body } = render(TitleBar);

    expect(body).toContain('data-menu-trigger');
    expect(body).not.toContain('is-web');
  });
});
