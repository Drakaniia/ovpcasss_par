// SPA mode: no SSR, no prerender; the fallback HTML boots the client router (spec §5).
export const ssr = false;
export const prerender = false;
export const trailingSlash = 'never';
