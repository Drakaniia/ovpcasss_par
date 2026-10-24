import { invoke } from '@tauri-apps/api/core';

import type { SavedAccount, SavedAccountIdentity, SecureTokenStore } from '../contracts';

/**
 * The desktop sessions in the Windows credential store (phase 15 §2, report 5).
 * Rust owns the keyring entry, so no token touches webview storage; this module
 * only moves strings across the command boundary.
 */
const COMMAND = {
  read: 'token_read',
  write: 'token_write',
  clear: 'token_clear',
  accounts: 'token_accounts',
  switch: 'token_switch',
  forget: 'token_forget',
  remember: 'token_remember',
} as const;

export function createTokenStore(): SecureTokenStore {
  return {
    read: () => invoke<string | null>(COMMAND.read),
    write: (token, account) =>
      invoke<void>(COMMAND.write, { token, ...(account ? { account } : {}) }),
    clear: () => invoke<void>(COMMAND.clear),
    list: () => invoke<SavedAccount[]>(COMMAND.accounts),
    switchTo: (id) => invoke<string | null>(COMMAND.switch, { id }),
    forget: (id) => invoke<void>(COMMAND.forget, { id }),
    remember: (account: SavedAccountIdentity) =>
      invoke<void>(COMMAND.remember, {
        id: account.id,
        name: account.name,
        email: account.email,
      }),
  };
}
