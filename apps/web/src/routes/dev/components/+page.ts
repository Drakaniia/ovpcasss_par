import { redirect } from '@sveltejs/kit';

// Dev-only gallery: production and Tauri builds redirect to the work inbox.
export const load = () => {
  if (!import.meta.env.DEV) redirect(307, '/');
};
