# apps/desktop

Tauri 2 shell for Windows. It contains **no UI code**: `frontendDist` points at
the `apps/web` static build, so both shells ship the same SvelteKit bundle
(spec §6).

- `src-tauri/` — Rust shell, capabilities, and bundler configuration.
- Offline drafts, the desktop session token, and the file dialog are wired
  through the platform adapters in `apps/web/src/lib/platform/` in M7.
- The shell stays outside the monorepo TypeScript tasks: it has no TS sources,
  so `pnpm build` at the root only builds it when you ask for
  `--filter @par/desktop`.

Build requirements (M7): Windows, WebView2, a code-signing certificate, and
generated icons (`pnpm tauri icon <png>`).
