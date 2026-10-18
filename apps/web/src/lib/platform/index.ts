import type { Platform } from './contracts';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Chooses the capability set for the current shell (spec §3, §6). Tauri
 * adapters are imported lazily so the browser never downloads them.
 */
export async function createPlatform(): Promise<Platform> {
  if (isTauri()) {
    const [drafts, tokens, files] = await Promise.all([
      import('./tauri/draft-store'),
      import('./tauri/secure-token-store'),
      import('./tauri/file-picker'),
    ]);

    return {
      shell: 'desktop',
      drafts: drafts.createDraftStore(),
      tokens: tokens.createTokenStore(),
      files: files.createFilePicker(),
    };
  }

  const [drafts, tokens, files] = await Promise.all([
    import('./web/draft-store'),
    import('./web/secure-token-store'),
    import('./web/file-picker'),
  ]);

  return {
    shell: 'web',
    drafts: drafts.createDraftStore(),
    tokens: tokens.createTokenStore(),
    files: files.createFilePicker(),
  };
}
