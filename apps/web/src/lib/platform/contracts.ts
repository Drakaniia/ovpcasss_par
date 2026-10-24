/** Everything that differs between the web build and the Tauri build (spec §3). */

/** One account the shell may switch to, without its token (report 5). */
export interface SavedAccount {
  id: string;
  name: string;
  email: string;
  active: boolean;
}

/** The account facts a sign-in already knows, stored beside its token. */
export interface SavedAccountIdentity {
  id: string;
  name: string;
  email: string;
}

/**
 * The credential store behind sign-in. The desktop shell keeps each account's
 * token in the OS store so it can switch instantly; the browser keeps only the
 * names and emails it may prefill, because its session is one HttpOnly cookie.
 */
export interface SecureTokenStore {
  read(): Promise<string | null>;
  write(token: string, account?: SavedAccountIdentity): Promise<void>;
  /** Ends the active account's session; other saved accounts stay. */
  clear(): Promise<void>;
  list(): Promise<SavedAccount[]>;
  /** Returns the account's token on desktop; null when only the metadata is known. */
  switchTo(id: string): Promise<string | null>;
  forget(id: string): Promise<void>;
  /** Records the signed-in account's name and email, with or without a token. */
  remember(account: SavedAccountIdentity): Promise<void>;
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
  /** Restores the default window size and position (report 11). */
  resetSize(): Promise<void>;
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
  /** Which shell is running. */
  shell: 'web' | 'desktop';
  auth: AuthFlow;
  tokens: SecureTokenStore;
  files: FilePicker;
  downloads: Downloads;
  updater: Updater;
  startup: StartupGate;
  chrome: WindowChrome;
}
