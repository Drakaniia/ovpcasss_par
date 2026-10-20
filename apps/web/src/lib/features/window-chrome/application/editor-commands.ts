/**
 * The two things an editor page contributes to the chrome: the Save draft
 * command (File menu and Ctrl+S) and the close guard that asks before the window
 * goes away with unsaved changes.
 */
import { closeGuard } from './chrome-store.svelte';
import { registerCommand } from './command-registry.svelte';

export type EditorHandle = {
  dirty: () => boolean;
  saving: () => boolean;
  save: () => Promise<boolean>;
  /** Names the report in the close dialog. */
  subject: () => string;
};

export function registerEditor(editor: EditorHandle): () => void {
  const disposeCommand = registerCommand({
    id: 'file.save-draft',
    enabled: () => editor.dirty() && !editor.saving(),
    disabledReason: () => (editor.saving() ? 'Saving…' : 'No unsaved changes.'),
    run: () => void editor.save(),
  });

  const disposeGuard = closeGuard.register({
    describe: editor.subject,
    dirty: editor.dirty,
    save: editor.save,
  });

  return () => {
    disposeCommand();
    disposeGuard();
  };
}
