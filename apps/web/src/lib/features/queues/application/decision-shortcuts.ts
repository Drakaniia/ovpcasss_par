import type { DecisionAction } from '@par/shared';

import { isTypingTarget } from '$lib/shortcuts/keyboard';

import type { DecisionButton } from './queue-decisions';

/** `E` endorses, `A` approves, `R` returns (UI spec §7.10, §8.9). */
const SHORTCUTS: Record<string, DecisionAction> = {
  e: 'ENDORSE',
  a: 'APPROVE',
  r: 'RETURN',
};

/**
 * Single letters are a shortcut, never a requirement: every one of them has a
 * visible button beside it. They are suppressed while typing and while any
 * dialog owns the keyboard, the decision drawer included.
 */
export function installDecisionShortcuts(
  buttons: DecisionButton[],
  ondecide: (action: DecisionAction) => void,
): () => void {
  const onKeydown = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (isTypingTarget(event.target)) return;
    if (document.querySelector('dialog[open]')) return;

    const action = SHORTCUTS[event.key.toLowerCase()];
    if (!action) return;
    if (!buttons.some((button) => button.action === action && button.enabled)) return;

    event.preventDefault();
    ondecide(action);
  };

  window.addEventListener('keydown', onKeydown);
  return () => window.removeEventListener('keydown', onKeydown);
}
