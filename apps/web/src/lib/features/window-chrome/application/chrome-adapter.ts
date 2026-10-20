import { platform } from '$lib/platform';
import type { WindowChrome } from '$lib/platform/contracts';

let resolved: Promise<WindowChrome> | null = null;

/** One adapter per document, resolved on first use. */
export function chromeAdapter(): Promise<WindowChrome> {
  resolved ??= platform().then((shell) => shell.chrome);
  return resolved;
}
