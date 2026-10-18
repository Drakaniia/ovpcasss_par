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

export interface Platform {
  /** Which shell is running. Pending-sync rows are a desktop-only affordance (§7.4). */
  shell: 'web' | 'desktop';
  drafts: DraftStore;
  tokens: SecureTokenStore;
  files: FilePicker;
}
