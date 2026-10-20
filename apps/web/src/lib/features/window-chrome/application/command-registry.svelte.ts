import { SvelteMap } from 'svelte/reactivity';

/**
 * Every menu item and accelerator resolves through one registry (desktop window
 * chrome spec §9.5), so the menu and the keyboard can never disagree about what
 * a command does or whether it is available.
 */
export interface Command {
  id: string;
  run(): void | Promise<void>;
  enabled(): boolean;
  disabledReason?(): string;
  /** Label override for stateful entries such as Maximize / Restore. */
  label?(): string;
  /**
   * Desktop-only commands are neither rendered nor bound in the browser, so
   * `Ctrl` `+` keeps the browser's own zoom instead of being swallowed.
   */
  desktopOnly?: boolean;
}

const registered = new SvelteMap<string, Command>();

/**
 * Registers one command. A duplicate id replaces the active entry for this
 * route; disposal restores whatever was registered before it.
 */
export function registerCommand(command: Command): () => void {
  const previous = registered.get(command.id);

  registered.set(command.id, command);

  return () => {
    if (registered.get(command.id) !== command) return;
    if (previous) registered.set(command.id, previous);
    else registered.delete(command.id);
  };
}

export function commandFor(id: string): Command | undefined {
  return registered.get(id);
}

export function registeredCommandIds(): string[] {
  return [...registered.keys()];
}

/** Availability as the menu model reads it; an unregistered command is absent. */
export function commandAvailability(id: string): { enabled: boolean; reason?: string } | null {
  const command = registered.get(id);
  if (!command) return null;

  const enabled = command.enabled();
  if (enabled) return { enabled };

  const reason = command.disabledReason?.();
  return reason ? { enabled, reason } : { enabled };
}

export function commandLabel(id: string): string | undefined {
  return registered.get(id)?.label?.();
}
