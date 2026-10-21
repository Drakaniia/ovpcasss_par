<script lang="ts">
  import AuthLayoutNoBackground from '$lib/components/AuthLayoutNoBackground.svelte';
  import RegisterForm from '$lib/features/auth/presentation/RegisterForm.svelte';
</script>

<svelte:head><title>Create an account · OVPCASSS Paperless PAR</title></svelte:head>

<AuthLayoutNoBackground heading="Create an account">
  <RegisterForm />
</AuthLayoutNoBackground>
