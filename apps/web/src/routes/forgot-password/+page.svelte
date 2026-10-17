<script lang="ts">
  import AuthLayout from '$lib/components/AuthLayout.svelte';
  import ForgotPasswordForm from '$lib/features/auth/presentation/ForgotPasswordForm.svelte';
</script>

<svelte:head><title>Forgot password · OVPCASSS Paperless PAR</title></svelte:head>

<AuthLayout heading="Reset your password">
  <ForgotPasswordForm />
</AuthLayout>
