/**
 * The live menu inputs: the pure model plus the registry, session, route and
 * window state. Components wrap this in their own `$derived`, so an open menu
 * recomputes when a command registers or the role changes.
 */
import { page } from '$app/state';

import { session } from '$lib/session/session.svelte';

import { chromeState, closeGuard } from './chrome-store.svelte';
import { commandAvailability, commandLabel } from './command-registry.svelte';
import type { MenuInputs } from './menu-model';
import { zoomState } from './zoom.svelte';

export function chromeMenuInputs(): MenuInputs {
  // Reading the route keeps registration changes — a page mounting its Save
  // draft command — in step with the rendered menus.
  void page.url.pathname;

  return {
    controllable: chromeState.controllable,
    devtools: import.meta.env.DEV,
    role: session.user?.role ?? null,
    signedIn: Boolean(session.user),
    dirtyEditor: closeGuard.dirtyGuard() !== null,
    fullscreen: chromeState.fullscreen,
    maximized: chromeState.maximized,
    zoom: zoomState.scale,
    availability: commandAvailability,
    label: commandLabel,
  };
}
