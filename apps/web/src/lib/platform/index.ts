import type { Platform } from './contracts';

/** The Tauri webview injects its internals before any app script runs. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Chooses the capability set for the current shell (spec §3, §6). Tauri
 * adapters are imported lazily so the browser never downloads them.
 */
export async function createPlatform(): Promise<Platform> {
  if (isTauri()) {
    const [auth, drafts, tokens, files, downloads, updater, startup, chrome] = await Promise.all([
      import('./tauri/auth-flow'),
      import('./tauri/draft-store'),
      import('./tauri/secure-token-store'),
      import('./tauri/file-picker'),
      import('./tauri/downloads'),
      import('./tauri/updater'),
      import('./tauri/startup'),
      import('./tauri/window-chrome'),
    ]);

    return {
      shell: 'desktop',
      auth: auth.createAuthFlow(),
      drafts: drafts.createDraftStore(),
      tokens: tokens.createTokenStore(),
      files: files.createFilePicker(),
      downloads: downloads.createDownloads(),
      updater: updater.createUpdater(),
      startup: startup.createStartupGate(),
      chrome: chrome.createWindowChrome(),
    };
  }

  const [auth, drafts, tokens, files, downloads, updater, startup, chrome] = await Promise.all([
    import('./web/auth-flow'),
    import('./web/draft-store'),
    import('./web/secure-token-store'),
    import('./web/file-picker'),
    import('./web/downloads'),
    import('./web/updater'),
    import('./web/startup'),
    import('./web/window-chrome'),
  ]);

  return {
    shell: 'web',
    auth: auth.createAuthFlow(),
    drafts: drafts.createDraftStore(),
    tokens: tokens.createTokenStore(),
    files: files.createFilePicker(),
    downloads: downloads.createDownloads(),
    updater: updater.createUpdater(),
    startup: startup.createStartupGate(),
    chrome: chrome.createWindowChrome(),
  };
}

let created: Promise<Platform> | null = null;

/**
 * One shell instance per document, so the token restore and the startup gate
 * share the same adapter objects instead of resolving them twice.
 */
export function platform(): Promise<Platform> {
  created ??= createPlatform();
  return created;
}
