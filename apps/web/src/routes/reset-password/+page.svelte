<script lang="ts">
  import AuthLayout from '$lib/components/AuthLayout.svelte';
  import ResetPasswordForm from '$lib/features/auth/presentation/ResetPasswordForm.svelte';
</script>

<svelte:head><title>Set a new password · OVPCASSS Paperless PAR</title></svelte:head>

<AuthLayout heading="Set a new password">
  <ResetPasswordForm />
</AuthLayout>
