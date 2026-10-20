import { describe, expect, it } from 'vitest';

import type { WindowChrome } from '$lib/platform/contracts';

import { CloseGuard, type EditorGuard } from './unsaved-guard.svelte';

function chromeStub() {
  const calls = { destroyed: 0, closed: 0 };

  const chrome = {
    destroy: async () => {
      calls.destroyed += 1;
    },
    close: async () => {
      calls.closed += 1;
    },
  } as unknown as WindowChrome;

  return { chrome, calls };
}

function guard(overrides: Partial<EditorGuard> = {}): EditorGuard {
  return {
    describe: () => '“Coastal cleanup” on step 2 of 4',
    dirty: () => true,
    save: async () => true,
    ...overrides,
  };
}

function event() {
  let prevented = false;
  return {
    preventDefault: () => {
      prevented = true;
    },
    get prevented() {
      return prevented;
    },
  };
}

function newGuard(overrides: Partial<EditorGuard> | null = {}) {
  const { chrome, calls } = chromeStub();
  const closeGuard = new CloseGuard(async () => chrome);
  const dispose = overrides === null ? () => {} : closeGuard.register(guard(overrides));
  return { closeGuard, calls, dispose };
}

describe('CloseGuard', () => {
  it('lets a window close when nothing is registered', () => {
    const { closeGuard } = newGuard(null);
    const request = event();

    closeGuard.handleRequest(request);

    expect(request.prevented).toBe(false);
    expect(closeGuard.state.open).toBe(false);
  });

  it('lets a clean window close without asking', () => {
    const { closeGuard } = newGuard({ dirty: () => false });
    const request = event();

    closeGuard.handleRequest(request);

    expect(request.prevented).toBe(false);
  });

  it('prevents the close and names the report when a draft is dirty', () => {
    const { closeGuard } = newGuard();
    const request = event();

    closeGuard.handleRequest(request);

    expect(request.prevented).toBe(true);
    expect(closeGuard.state.open).toBe(true);
    expect(closeGuard.state.subject).toBe('“Coastal cleanup” on step 2 of 4');
  });

  it('destroys the window after a successful save', async () => {
    const { closeGuard, calls } = newGuard();

    await closeGuard.saveAndClose();

    expect(calls.destroyed).toBe(1);
    expect(closeGuard.state.open).toBe(false);
    expect(closeGuard.state.saving).toBe(false);
  });

  it('keeps the window open when the save fails', async () => {
    const { closeGuard, calls } = newGuard({ save: async () => false });

    await closeGuard.saveAndClose();

    expect(calls.destroyed).toBe(0);
    expect(closeGuard.state.open).toBe(false);
    expect(closeGuard.active()).not.toBeNull();
  });

  it('keeps the window open when the save throws', async () => {
    const { closeGuard, calls } = newGuard({
      save: async () => {
        throw new Error('offline');
      },
    });

    await closeGuard.saveAndClose();

    expect(calls.destroyed).toBe(0);
  });

  it('destroys without saving when the changes are discarded', async () => {
    const { closeGuard, calls } = newGuard();

    await closeGuard.discardAndClose();

    expect(calls.destroyed).toBe(1);
  });

  it('cancels back to the page', () => {
    const { closeGuard } = newGuard();
    closeGuard.handleRequest(event());

    closeGuard.cancel();

    expect(closeGuard.state.open).toBe(false);
  });

  it('uses the last registration and restores the previous on disposal', () => {
    const { closeGuard, dispose } = newGuard({ describe: () => 'first' });
    const disposeSecond = closeGuard.register(guard({ describe: () => 'second' }));

    expect(closeGuard.active()?.describe()).toBe('second');

    disposeSecond();
    expect(closeGuard.active()?.describe()).toBe('first');

    dispose();
    expect(closeGuard.active()).toBeNull();
  });

  it('asks the window to close through the adapter', async () => {
    const { closeGuard, calls } = newGuard();

    await closeGuard.requestClose();

    expect(calls.closed).toBe(1);
  });
});
