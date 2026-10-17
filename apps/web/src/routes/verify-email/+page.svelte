<script lang="ts">
  import AuthLayout from '$lib/components/AuthLayout.svelte';
  import VerifyEmailPanel from '$lib/features/auth/presentation/VerifyEmailPanel.svelte';
</script>

<svelte:head><title>Verify your email · OVPCASSS Paperless PAR</title></svelte:head>

<AuthLayout heading="Email verification">
  <VerifyEmailPanel />
</AuthLayout>
