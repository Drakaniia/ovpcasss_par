import { afterEach, describe, expect, it } from 'vitest';

import { acceleratorOf, isNativeEditChord, runAccelerator } from './accelerators';
import { registerCommand } from './command-registry.svelte';

const desktop = { controllable: () => true };
const browser = { controllable: () => false };

const disposers: (() => void)[] = [];

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
});

function key(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  let prevented = false;

  return {
    key: 'n',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    isComposing: false,
    defaultPrevented: false,
    preventDefault: () => {
      prevented = true;
    },
    get prevented() {
      return prevented;
    },
    ...overrides,
  } as unknown as KeyboardEvent & { prevented: boolean };
}

function command(id: string, overrides: { enabled?: () => boolean; desktopOnly?: boolean } = {}) {
  const calls: number[] = [];

  disposers.push(
    registerCommand({
      id,
      enabled: overrides.enabled ?? (() => true),
      run: () => {
        calls.push(1);
      },
      ...(overrides.desktopOnly ? { desktopOnly: true } : {}),
    }),
  );

  return calls;
}

describe('acceleratorOf', () => {
  it('spells Ctrl chords with the key', () => {
    expect(acceleratorOf({ key: 'n', ctrlKey: true })).toBe('Ctrl+N');
    expect(acceleratorOf({ key: 'S', metaKey: true })).toBe('Ctrl+S');
    expect(acceleratorOf({ key: 'I', ctrlKey: true, shiftKey: true })).toBe('Ctrl+Shift+I');
  });

  it('treats the plus, minus and equals keys as one chord each', () => {
    expect(acceleratorOf({ key: '+', ctrlKey: true })).toBe('Ctrl++');
    expect(acceleratorOf({ key: '=', ctrlKey: true })).toBe('Ctrl++');
    expect(acceleratorOf({ key: '-', ctrlKey: true })).toBe('Ctrl+-');
    expect(acceleratorOf({ key: '0', ctrlKey: true })).toBe('Ctrl+0');
  });

  it('ignores AltGr, which Windows reports as Ctrl+Alt', () => {
    expect(acceleratorOf({ key: 's', ctrlKey: true, altKey: true })).toBeNull();
  });

  it('recognises F11 alone but not with a modifier', () => {
    expect(acceleratorOf({ key: 'F11' })).toBe('F11');
    expect(acceleratorOf({ key: 'F11', ctrlKey: true })).toBeNull();
  });
});

describe('runAccelerator', () => {
  it('runs the command and prevents the platform default', () => {
    const calls = command('file.new-record');
    const event = key({ ctrlKey: true });

    expect(runAccelerator(event, desktop)).toBe(true);
    expect(calls).toHaveLength(1);
    expect((event as unknown as { prevented: boolean }).prevented).toBe(true);
  });

  it('owns a disabled chord but does not run it', () => {
    const calls = command('view.reload', { enabled: () => false });
    const event = key({ key: 'r', ctrlKey: true });

    expect(runAccelerator(event, desktop)).toBe(true);
    expect(calls).toHaveLength(0);
    expect((event as unknown as { prevented: boolean }).prevented).toBe(true);
  });

  it('leaves desktop-only chords to the browser', () => {
    command('view.zoom-in', { desktopOnly: true });
    const event = key({ key: '+', ctrlKey: true });

    expect(runAccelerator(event, browser)).toBe(false);
    expect((event as unknown as { prevented: boolean }).prevented).toBe(false);
    expect(runAccelerator(event, desktop)).toBe(true);
  });

  it('leaves the native editing chords to the focused field', () => {
    const calls = command('file.new-record');

    for (const [keyName, overrides] of [
      ['v', { ctrlKey: true }],
      ['c', { ctrlKey: true }],
      ['x', { ctrlKey: true }],
      ['a', { ctrlKey: true }],
      ['z', { ctrlKey: true }],
      ['y', { ctrlKey: true }],
      ['z', { ctrlKey: true, shiftKey: true }],
    ] as const) {
      const event = key({ key: keyName, ...overrides });

      expect(runAccelerator(event, desktop)).toBe(false);
      expect((event as unknown as { prevented: boolean }).prevented).toBe(false);
    }

    expect(calls).toHaveLength(0);
  });

  it('names every native editing chord, and nothing else', () => {
    for (const chord of ['Ctrl+X', 'Ctrl+C', 'Ctrl+V', 'Ctrl+A', 'Ctrl+Z', 'Ctrl+Y']) {
      expect(isNativeEditChord(chord)).toBe(true);
    }

    expect(isNativeEditChord('Ctrl+K')).toBe(false);
    expect(isNativeEditChord('Ctrl+S')).toBe(false);
  });

  it('leaves the palette chord to the shortcut layer', () => {
    const event = key({ key: 'k', ctrlKey: true });

    expect(runAccelerator(event, desktop)).toBe(false);
    expect((event as unknown as { prevented: boolean }).prevented).toBe(false);
  });

  it('ignores composed, already handled and unbound keys', () => {
    command('file.new-record');

    expect(runAccelerator(key({ isComposing: true }), desktop)).toBe(false);
    expect(runAccelerator(key({ defaultPrevented: true }), desktop)).toBe(false);
    expect(runAccelerator(key({ key: 'z' }), desktop)).toBe(false);
  });
});
