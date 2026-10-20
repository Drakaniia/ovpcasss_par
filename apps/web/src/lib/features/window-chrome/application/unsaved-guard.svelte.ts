/**
 * The unsaved-changes guard on window close (desktop window chrome spec §8.6).
 * Only the mounted editor registers: the new-report wizard or the edit-returned
 * page. Every close path — titlebar X, File > Exit, Window > Close, Alt+F4, the
 * OS — ends in `onCloseRequested`, so one flow covers them all.
 */
import type { WindowChrome } from '$lib/platform/contracts';

export type EditorGuard = {
  /** The report with unsaved changes, as the dialog names it. */
  describe(): string;
  dirty(): boolean;
  save(): Promise<boolean>;
};

export type CloseGuardState = {
  open: boolean;
  saving: boolean;
  subject: string;
};

export class CloseGuard {
  readonly state = $state<CloseGuardState>({ open: false, saving: false, subject: '' });

  private guards: EditorGuard[] = [];

  /** The adapter is resolved lazily: the platform loads after the shell mounts. */
  constructor(private readonly chrome: () => Promise<WindowChrome>) {}

  /** Last registration wins; disposal restores the previous editor. */
  register(guard: EditorGuard): () => void {
    this.guards.push(guard);

    return () => {
      const index = this.guards.lastIndexOf(guard);
      if (index >= 0) this.guards.splice(index, 1);
    };
  }

  active(): EditorGuard | null {
    return this.guards.at(-1) ?? null;
  }

  /** The guard that blocks closing, or null when closing is safe. */
  dirtyGuard(): EditorGuard | null {
    const guard = this.active();
    return guard?.dirty() ? guard : null;
  }

  install(): () => void {
    let stop: (() => void) | null = null;
    let disposed = false;

    void this.chrome()
      .then((chrome) => chrome.onCloseRequested((event) => this.handleRequest(event)))
      .then((unlisten) => {
        if (disposed) unlisten();
        else stop = unlisten;
      })
      .catch(() => {});

    return () => {
      disposed = true;
      stop?.();
    };
  }

  /** A clean window closes as usual; a dirty one asks first. */
  handleRequest(event: { preventDefault(): void }): void {
    const guard = this.dirtyGuard();
    if (!guard) return;

    event.preventDefault();
    this.state.subject = guard.describe();
    this.state.saving = false;
    this.state.open = true;
  }

  async saveAndClose(): Promise<void> {
    const guard = this.dirtyGuard();

    if (!guard) {
      await this.destroy();
      return;
    }

    this.state.saving = true;

    let saved: boolean;
    try {
      saved = await guard.save();
    } catch {
      saved = false;
    } finally {
      this.state.saving = false;
    }

    // A failed save keeps the window open and lets the editor show its error.
    this.state.open = false;
    if (saved) await this.destroy();
  }

  async discardAndClose(): Promise<void> {
    this.state.open = false;
    await this.destroy();
  }

  cancel(): void {
    this.state.open = false;
    this.state.saving = false;
  }

  async requestClose(): Promise<void> {
    await (await this.chrome()).close();
  }

  private async destroy(): Promise<void> {
    await (await this.chrome()).destroy();
  }
}
