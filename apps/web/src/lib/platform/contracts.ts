import type { ReportDraft } from '@par/shared';

/** Everything that differs between the web build and the Tauri build (spec §3). */
export interface DraftStore {
  list(): Promise<ReportDraft[]>;
  get(id: string): Promise<ReportDraft | null>;
  put(draft: ReportDraft): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface SecureTokenStore {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  clear(): Promise<void>;
}

export interface PickedFile {
  name: string;
  size: number;
  mimeType: string;
  path?: string;
}

export interface FilePicker {
  pick(): Promise<PickedFile[]>;
}

export interface Downloads {
  /** Opens the folder saved downloads land in. Desktop only. */
  reveal(): Promise<void>;
}

export interface AuthFlow {
  /**
   * Starts Google sign-in. The web shell leaves the page; the desktop shell
   * resolves with the session token once the loopback listener has it.
   */
  signInWithGoogle(startUrl: string): Promise<string | null>;
  /** Stops a pending sign-in; the waiting call settles as cancelled. */
  cancelSignIn(): Promise<void>;
}

export interface AvailableUpdate {
  version: string;
  download(onProgress: (percent: number) => void): Promise<void>;
  /** On Windows this exits the app; the installer restarts it. */
  install(): Promise<void>;
}

export interface Updater {
  /** False in the browser build; updates ship only with the desktop app. */
  readonly supported: boolean;
  currentVersion(): Promise<string>;
  check(): Promise<AvailableUpdate | null>;
}

export interface StartupGate {
  /** Desktop only: closes the startup splash. A no-op in the browser. */
  ready(): Promise<void>;
}

export type WindowShell = 'tauri' | 'web';

/** A rectangle in physical pixels, as the native hit test expects it. */
export interface PhysicalRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The operating system's window, behind one contract (desktop window chrome
 * spec §9.2). The browser adapter answers every call without touching the OS,
 * so the chrome feature never branches on the shell.
 */
export interface WindowChrome {
  readonly shell: WindowShell;
  /** False in the browser: no controls, no drag regions, no Window menu. */
  readonly controllable: boolean;
  minimize(): Promise<void>;
  toggleMaximize(): Promise<void>;
  isMaximized(): Promise<boolean>;
  /** Goes through the close guard: `onCloseRequested` fires first. */
  close(): Promise<void>;
  /** Bypasses the close guard; used once the guard has been answered. */
  destroy(): Promise<void>;
  setFullscreen(on: boolean): Promise<void>;
  isFullscreen(): Promise<boolean>;
  setZoom(scale: number): Promise<void>;
  openDevtools(): Promise<void>;
  /**
   * Where the maximize button sits, in physical pixels, so the native hit test
   * can hand it `HTMAXBUTTON` and Windows can show Snap Layouts. Null clears it.
   */
  setMaximizeHitRect(rect: PhysicalRect | null): Promise<void>;
  onResized(listener: () => void): () => void;
  onCloseRequested(listener: (event: { preventDefault(): void }) => void): () => void;
  /** The pointer over the native maximize button, which the DOM never sees. */
  onMaximizeHover(listener: (hovering: boolean) => void): () => void;
}

export interface Platform {
  /** Which shell is running. Drafts are device-local in both shells (§7.4). */
  shell: 'web' | 'desktop';
  auth: AuthFlow;
  drafts: DraftStore;
  tokens: SecureTokenStore;
  files: FilePicker;
  downloads: Downloads;
  updater: Updater;
  startup: StartupGate;
  chrome: WindowChrome;
}
