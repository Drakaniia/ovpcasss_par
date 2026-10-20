/*
 * Splash behaviour (docs/spec/startup-splash-spec.md §7.3).
 *
 * A static page with no bundler, so it uses Tauri's injected global API. In a
 * plain browser both calls are skipped and the page still renders for review.
 */
const tauri = window.__TAURI__;

if (tauri) {
  // The capability covers this window; a denial only skips the fade.
  tauri.event
    .listen('splash:dissolve', () => {
      document.documentElement.classList.add('is-leaving');
    })
    .catch(() => {});

  // Losing the paint ping only costs the minimum dwell, never the reveal.
  requestAnimationFrame(() => tauri.core.invoke('splash_painted').catch(() => {}));
}
