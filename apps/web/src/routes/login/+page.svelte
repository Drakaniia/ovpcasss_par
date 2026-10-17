<script lang="ts">
  import AuthLayout from '$lib/components/AuthLayout.svelte';
  import LoginForm from '$lib/features/auth/presentation/LoginForm.svelte';
</script>

<svelte:head><title>Sign in · OVPCASSS Paperless PAR</title></svelte:head>

<AuthLayout heading="Sign in to submit and track reports">
  <LoginForm />
</AuthLayout>
