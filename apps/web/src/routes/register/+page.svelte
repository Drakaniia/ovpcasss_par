<script lang="ts">
  import AuthLayout from '$lib/components/AuthLayout.svelte';
  import RegisterForm from '$lib/features/auth/presentation/RegisterForm.svelte';
</script>

<svelte:head><title>Create an account · OVPCASSS Paperless PAR</title></svelte:head>

<AuthLayout heading="Create an account">
  <RegisterForm />
</AuthLayout>
