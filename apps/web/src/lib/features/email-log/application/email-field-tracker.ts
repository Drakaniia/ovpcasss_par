import { insertTokenAt } from './email-template-draft';

/**
 * Keeps each field's DOM node so the **Insert value** menu can put a token where
 * the caret was. Not reactive: the caret belongs to the element, not to state.
 */
export function createFieldTracker() {
  const fields: Record<string, HTMLInputElement | HTMLTextAreaElement> = {};

  function track(node: HTMLInputElement | HTMLTextAreaElement, key: string) {
    fields[key] = node;
    return {
      destroy() {
        delete fields[key];
      },
    };
  }

  function insert(key: string, token: string) {
    const field = fields[key];
    if (!field) return;

    const result = insertTokenAt(
      field.value,
      token,
      field.selectionStart ?? field.value.length,
      field.selectionEnd ?? field.value.length,
    );
    field.value = result.value;
    // Tell the bound state the value changed without re-creating the element,
    // so the caret stays where the token was inserted.
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.focus();
    field.setSelectionRange(result.caret, result.caret);
  }

  return { track, insert };
}
