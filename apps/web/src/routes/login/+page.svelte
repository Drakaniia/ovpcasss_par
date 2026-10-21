<script lang="ts">
  import AuthLayoutNoBackground from '$lib/components/AuthLayoutNoBackground.svelte';
  import LoginForm from '$lib/features/auth/presentation/LoginForm.svelte';
</script>

<svelte:head><title>Sign in · OVPCASSS Paperless PAR</title></svelte:head>

<AuthLayoutNoBackground heading="Sign in to submit and track reports">
  <LoginForm />
</AuthLayoutNoBackground>
