import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      // SPA build: Tauri loads it from disk, the Worker serves it as static assets (spec §5).
      preprocess: vitePreprocess(),
      adapter: adapter({ fallback: 'index.html' }),
      // SvelteKit 3 no longer supplies $lib implicitly; keep the repo's existing import path.
      alias: { $lib: 'src/lib' },
    }),
  ],
  server: {
    port: 5173,
    // Web users hit the API on the same origin in production (spec §7.1).
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
});
