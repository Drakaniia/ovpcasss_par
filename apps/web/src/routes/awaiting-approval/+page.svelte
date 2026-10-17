<script lang="ts">
  import AuthLayout from '$lib/components/AuthLayout.svelte';
  import AwaitingApprovalPanel from '$lib/features/auth/presentation/AwaitingApprovalPanel.svelte';
</script>

<svelte:head><title>Awaiting role assignment · OVPCASSS Paperless PAR</title></svelte:head>

<AuthLayout heading="Your account is awaiting role assignment">
  <AwaitingApprovalPanel />
</AuthLayout>
