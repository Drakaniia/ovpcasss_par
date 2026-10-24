/**
 * The built-in commands (desktop window chrome spec §7). Route commands — Save
 * draft and Print — are registered by the pages that own them, never here.
 */
import { goto } from '$app/navigation';
import { page } from '$app/state';

import {
  resetOnboarding,
  startTour,
} from '$lib/features/onboarding/application/tour-controller.svelte';
import { session, signOut } from '$lib/session/session.svelte';

import {
  chromeState,
  closeGuard,
  minimize,
  toggleFullscreen,
  toggleMaximize,
} from './chrome-store.svelte';
import { editAvailability, runEditCommand, type EditCommandId } from './edit-state.svelte';
import { registerCommand } from './command-registry.svelte';
import { chromeAdapter } from './chrome-adapter';
import { resetZoom, zoomInStep, zoomOutStep } from './zoom.svelte';

const DEVTOOLS = import.meta.env.DEV;

function focusWizardField(): void {
  const field = document.querySelector<HTMLElement>(
    'main input, main textarea, main select, main [tabindex]:not([tabindex="-1"])',
  );
  field?.focus();
}

function editCommand(id: EditCommandId) {
  return {
    id: `edit.${id}`,
    enabled: () => editAvailability(id).enabled,
    disabledReason: () => editAvailability(id).reason ?? '',
    run: () => runEditCommand(id),
  };
}

/** Registers every built-in once; returns the unregister function. */
export function registerBuiltinCommands(): () => void {
  const disposers = [
    registerCommand({
      id: 'file.new-record',
      enabled: () => session.user?.role === 'ADMIN',
      disabledReason: () => 'Requires administrator access.',
      run: async () => {
        if (page.url.pathname === '/reports/new') {
          focusWizardField();
          return;
        }
        await goto('/reports/new');
      },
    }),
    registerCommand({
      id: 'file.export',
      enabled: () => true,
      run: () => void goto('/exports'),
    }),
    registerCommand({
      id: 'file.sign-out',
      enabled: () => true,
      run: async () => {
        await signOut();
        void goto('/login');
      },
    }),
    registerCommand({
      id: 'file.exit',
      desktopOnly: true,
      enabled: () => true,
      run: () => closeGuard.requestClose(),
    }),

    registerCommand(editCommand('undo')),
    registerCommand(editCommand('redo')),
    registerCommand(editCommand('cut')),
    registerCommand(editCommand('copy')),
    registerCommand(editCommand('paste')),
    registerCommand(editCommand('select-all')),

    registerCommand({
      id: 'view.reload',
      enabled: () => true,
      run: () => location.reload(),
    }),
    registerCommand({
      id: 'view.zoom-in',
      desktopOnly: true,
      enabled: () => true,
      run: () => zoomInStep(),
    }),
    registerCommand({
      id: 'view.zoom-out',
      desktopOnly: true,
      enabled: () => true,
      run: () => zoomOutStep(),
    }),
    registerCommand({
      id: 'view.zoom-reset',
      desktopOnly: true,
      enabled: () => true,
      run: () => resetZoom(),
    }),
    registerCommand({
      id: 'view.fullscreen',
      enabled: () => true,
      run: () => toggleFullscreen(),
    }),
    registerCommand({
      id: 'view.devtools',
      desktopOnly: true,
      enabled: () => DEVTOOLS,
      disabledReason: () => 'Developer tools are available in development builds.',
      run: async () => {
        await (await chromeAdapter()).openDevtools();
      },
    }),

    registerCommand({
      id: 'window.minimize',
      desktopOnly: true,
      enabled: () => true,
      run: () => minimize(),
    }),
    registerCommand({
      id: 'window.toggle-maximize',
      desktopOnly: true,
      enabled: () => true,
      label: () => (chromeState.maximized || chromeState.fullscreen ? 'Restore' : 'Maximize'),
      run: () => toggleMaximize(),
    }),
    registerCommand({
      id: 'window.reset-size',
      desktopOnly: true,
      enabled: () => true,
      run: async () => {
        await (await chromeAdapter()).resetSize();
      },
    }),

    registerCommand({
      id: 'window.close',
      desktopOnly: true,
      enabled: () => true,
      run: () => closeGuard.requestClose(),
    }),

    registerCommand({
      id: 'help.tour',
      enabled: () => session.user?.status === 'ACTIVE',
      disabledReason: () => 'Sign in to take the tour.',
      run: () => startTour({ pathname: page.url.pathname, navigate: () => goto('/') }),
    }),
    registerCommand({
      id: 'help.reset-onboarding',
      enabled: () => session.user?.status === 'ACTIVE',
      disabledReason: () => 'Sign in to reset onboarding.',
      run: () => resetOnboarding({ pathname: page.url.pathname, navigate: () => goto('/') }),
    }),
    registerCommand({
      id: 'help.shortcuts',
      enabled: () => true,
      run: () => {
        window.dispatchEvent(new CustomEvent('par:shortcuts'));
      },
    }),
    registerCommand({
      id: 'help.about',
      enabled: () => true,
      run: () => {
        chromeState.aboutOpen = true;
      },
    }),
  ];

  return () => {
    for (const dispose of disposers) dispose();
  };
}
