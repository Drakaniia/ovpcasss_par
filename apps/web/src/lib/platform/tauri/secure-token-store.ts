import { invoke } from '@tauri-apps/api/core';

import type { SecureTokenStore } from '../contracts';

/**
 * The desktop session token in the Windows credential store (phase 15 §2).
 * Rust owns the keyring entry, so the token never touches webview storage;
 * this module only moves the string across the command boundary.
 */
const COMMAND = {
  read: 'token_read',
  write: 'token_write',
  clear: 'token_clear',
} as const;

export function createTokenStore(): SecureTokenStore {
  return {
    read: () => invoke<string | null>(COMMAND.read),
    write: (token) => invoke<void>(COMMAND.write, { token }),
    clear: () => invoke<void>(COMMAND.clear),
  };
}
