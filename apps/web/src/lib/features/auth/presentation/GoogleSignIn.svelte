<script lang="ts">
  import { goto } from '$app/navigation';
  import { LoaderCircle } from '@lucide/svelte';

  import { API_BASE_URL, isDesktopShell, setSessionToken } from '$lib/api/http';
  import { destinationAfterSignIn } from '$lib/features/auth/application/post-sign-in';
  import { googleErrorMessage } from '$lib/features/auth/application/google-errors';
  import { resetPreferences } from '$lib/features/preferences/application/preferences.svelte';
  import { createPlatform } from '$lib/platform';
  import { rememberSessionToken } from '$lib/platform/session-token';
  import { loadSession } from '$lib/session/session.svelte';

  let {
    onError,
    divider = 'before',
  }: { onError: (message: string) => void; divider?: 'before' | 'after' } = $props();

  const desktop = isDesktopShell();
  const googleHref = `${API_BASE_URL}/auth/google`;

  let busy = $state(false);
  let cancelled = false;

  async function signIn() {
    if (busy) return;

    busy = true;
    cancelled = false;

    try {
      const platform = await createPlatform();
      const url = new URL(`${API_BASE_URL}/auth/google`, window.location.origin);
      if (platform.shell === 'desktop') url.searchParams.set('client', 'desktop');

      const token = await platform.auth.signInWithGoogle(url.toString());
      if (!token) return; // Web: the browser is already leaving for Google.

      // The token is only in memory until `/me` names the account, so the saved
      // entry carries the real identity rather than a placeholder.
      setSessionToken(token);
      // A sign-in from the profile card replaces a running account's settings.
      resetPreferences();
      const user = await loadSession(true);
      const destination = user ? destinationAfterSignIn(user) : null;

      if (!user || !destination) {
        setSessionToken(null);
        onError('This account is not active. Contact the OVPCASSS administrator.');
        return;
      }

      const identity = { id: user.id, name: user.fullName, email: user.email };
      await rememberSessionToken(token, identity);
      await goto(destination, { replaceState: true });
    } catch (error) {
      if (cancelled) return;
      onError(
        typeof error === 'string' ? googleErrorMessage(error) : googleErrorMessage('google_failed'),
      );
    } finally {
      busy = false;
      cancelled = false;
    }
  }

  async function cancel() {
    if (!busy) return;

    cancelled = true;

    try {
      const platform = await createPlatform();
      await platform.auth.cancelSignIn();
    } catch {
      // The pending sign-in still owns the busy state; report its outcome.
      cancelled = false;
    }
  }
</script>

{#snippet googleMark()}
  <!-- Google's mark, used unmodified as its branding guidelines require. -->
  <svg class="google-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
{/snippet}

{#if divider === 'before'}
  <p class="auth-divider"><span>or</span></p>
{/if}

{#if desktop}
  <button
    type="button"
    class="btn btn-outline google-signin"
    onclick={() => void signIn()}
    disabled={busy}
    aria-busy={busy}
  >
    {#if busy}
      <LoaderCircle class="spin" size={16} aria-hidden="true" />
      Waiting for your browser…
    {:else}
      {@render googleMark()}
      Sign in with Google
    {/if}
  </button>
  {#if busy}
    <button type="button" class="google-cancel" onclick={() => void cancel()}>Cancel</button>
  {/if}
{:else}
  <a class="btn btn-outline google-signin" href={googleHref}>
    {@render googleMark()}
    Sign in with Google
  </a>
{/if}

{#if divider === 'after'}
  <p class="auth-divider"><span>or</span></p>
{/if}

<style>
  .google-signin {
    font-size: 14px;
    gap: 10px;
    height: 44px;
    transition:
      background-color 120ms ease-out,
      transform 100ms ease-out;
    width: 100%;
  }

  .google-signin:active:not(:disabled) {
    transform: scale(0.985);
  }

  .google-mark {
    flex: none;
    height: 18px;
    width: 18px;
  }

  .google-cancel {
    align-self: center;
    background: none;
    border: 0;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 13px;
    height: 32px;
    padding: 0 8px;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .google-cancel:hover {
    color: var(--text-primary);
  }

  @media (prefers-reduced-motion: reduce) {
    .google-signin {
      transition: none;
    }

    .google-signin:active:not(:disabled) {
      transform: none;
    }
  }

  .auth-divider {
    align-items: center;
    color: var(--text-secondary);
    display: flex;
    font-size: 12px;
    gap: 12px;
    margin: 2px 0;
  }

  .auth-divider::before,
  .auth-divider::after {
    background: var(--border);
    content: '';
    flex: 1;
    height: 1px;
  }
</style>
