/**
 * Toast queue (UI spec §8.7): bottom-right, 4 s, at most three, success and
 * error only. Page phases call `toast.success(...)` / `toast.error(...)`.
 */
export type ToastKind = 'success' | 'error';

export type ToastAction = {
  label: string;
  run: () => void;
};

export type ToastOptions = {
  /** Shows a copy action, used for the tracking number on submit. */
  copy?: string;
  /** Shows one follow-up action, e.g. revealing a downloaded export's folder. */
  action?: ToastAction;
};

export type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
  copyText?: string;
  actionLabel?: string;
  runAction?: () => void;
};

const DURATION_MS = 4000;
/* Action toasts stay long enough to be read and clicked. */
const ACTION_DURATION_MS = 8000;
const MAX_VISIBLE = 3;

export const toasts = $state<ToastItem[]>([]);

let nextId = 1;
const timers: Record<number, ReturnType<typeof setTimeout>> = {};

export function showToast(kind: ToastKind, message: string, options: ToastOptions = {}): void {
  const id = nextId++;
  toasts.push({
    id,
    kind,
    message,
    ...(options.copy ? { copyText: options.copy } : {}),
    ...(options.action ? { actionLabel: options.action.label, runAction: options.action.run } : {}),
  });

  while (toasts.length > MAX_VISIBLE) {
    dismissToast(toasts[0].id);
  }

  timers[id] = setTimeout(
    () => dismissToast(id),
    options.action ? ACTION_DURATION_MS : DURATION_MS,
  );
}

export function dismissToast(id: number): void {
  const timer = timers[id];
  if (timer) {
    clearTimeout(timer);
    delete timers[id];
  }

  const index = toasts.findIndex((item) => item.id === id);
  if (index !== -1) toasts.splice(index, 1);
}

export const toast = {
  success: (message: string, options?: ToastOptions) => showToast('success', message, options),
  error: (message: string, options?: ToastOptions) => showToast('error', message, options),
};
