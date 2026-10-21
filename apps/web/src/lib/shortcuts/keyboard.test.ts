import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installGlobalShortcuts, type ShortcutHandlers } from './keyboard';

/**
 * No DOM in this suite: the module only needs `window` to register a listener
 * and `document` to answer the tour-overlay and open-menu lookups.
 */
let listener: ((event: KeyboardEvent) => void) | undefined;

function key(target: EventTarget | null): KeyboardEvent {
  return {
    key: 'k',
    ctrlKey: false,
    metaKey: false,
    target,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent;
}

function press(overrides: Partial<KeyboardEvent> & { target?: EventTarget | null }): KeyboardEvent {
  const event = { ...key(overrides.target ?? null), ...overrides } as unknown as KeyboardEvent;
  listener?.(event);
  return event;
}

const input = () => ({ tagName: 'INPUT' }) as unknown as EventTarget;
const body = () => ({ tagName: 'BODY' }) as unknown as EventTarget;

let handlers: ShortcutHandlers;
let dispose: () => void;

describe('installGlobalShortcuts', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      addEventListener: (_type: string, fn: (event: KeyboardEvent) => void) => {
        listener = fn;
      },
      removeEventListener: () => {
        listener = undefined;
      },
    });
    vi.stubGlobal('document', {
      querySelector: () => null,
      querySelectorAll: () => [],
    });

    handlers = { palette: vi.fn(), search: vi.fn(), shortcuts: vi.fn() };
    dispose = installGlobalShortcuts(handlers);
  });

  afterEach(() => {
    dispose();
    vi.unstubAllGlobals();
  });

  it('opens the palette from inside a text field', () => {
    const event = press({ key: 'k', ctrlKey: true, target: input() });

    expect(handlers.palette).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('accepts the mac command chord as well', () => {
    press({ key: 'K', metaKey: true, target: body() });

    expect(handlers.palette).toHaveBeenCalledTimes(1);
  });

  it('still suppresses a single-letter shortcut while typing', () => {
    press({ key: '/', target: input() });
    press({ key: '?', target: input() });

    expect(handlers.search).not.toHaveBeenCalled();
    expect(handlers.shortcuts).not.toHaveBeenCalled();
  });

  it('runs the single-letter shortcuts outside a field', () => {
    press({ key: '/', target: body() });
    press({ key: '?', target: body() });

    expect(handlers.search).toHaveBeenCalledTimes(1);
    expect(handlers.shortcuts).toHaveBeenCalledTimes(1);
  });

  it('stays out of the first-run tour', () => {
    vi.stubGlobal('document', {
      querySelector: () => ({}),
      querySelectorAll: () => [],
    });

    press({ key: 'k', ctrlKey: true, target: body() });

    expect(handlers.palette).not.toHaveBeenCalled();
  });
});
