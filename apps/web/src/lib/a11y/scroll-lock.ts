let locks = 0;
let previousOverflow = '';

/**
 * Background scroll lock for modal dialogs (phase 12 §5). Ref-counted so two
 * dialogs swapping places release the lock only once the last one closes.
 */
export function lockScroll(): void {
  if (typeof document === 'undefined') return;

  if (locks === 0) {
    previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
  }
  locks += 1;
}

export function unlockScroll(): void {
  if (typeof document === 'undefined' || locks === 0) return;

  locks -= 1;
  if (locks === 0) document.documentElement.style.overflow = previousOverflow;
}
