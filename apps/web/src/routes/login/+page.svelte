<script lang="ts">
  import { page } from '$app/state';

  import AuthLayout from '$lib/components/AuthLayout.svelte';
  import ScarfCorners from '$lib/components/ScarfCorners.svelte';
  import LoginForm from '$lib/features/auth/presentation/LoginForm.svelte';

  // Adding a second account arrives without signing out (report 5), so the
  // heading names what the form is doing rather than looking like a re-login.
  const adding = $derived(page.url.searchParams.get('add') === '1');
</script>

<svelte:head><title>Sign in · OVPCASSS Paperless PAR</title></svelte:head>

<AuthLayout heading={adding ? 'Add another account' : 'Sign in to submit and track reports'}>
  <ScarfCorners />
  <div class="auth-card__content">
    <LoginForm />
  </div>
</AuthLayout>

<style>
  /* Above the scarf corners, which sit behind the first control. */
  .auth-card__content {
    position: relative;
    z-index: 1;
  }
</style>
