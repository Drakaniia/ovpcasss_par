<script lang="ts">
  import AuthLayout from './AuthLayout.svelte';

  let { children, heading }: { children: import('svelte').Snippet; heading: string } = $props();
</script>

<AuthLayout {heading} showScene={false}>
  {@render children()}
</AuthLayout>
