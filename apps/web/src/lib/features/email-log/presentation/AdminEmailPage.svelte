<script lang="ts">
  import { page } from '$app/state';

  import { emailTabFromParams } from '../application/email-tabs';
  import AdminEmailsPage from './AdminEmailsPage.svelte';
  import EmailVariablesPage from './EmailVariablesPage.svelte';

  const tab = $derived(emailTabFromParams(new URLSearchParams(page.url.search)));
</script>

{#if tab === 'variables'}
  <EmailVariablesPage />
{:else}
  <AdminEmailsPage />
{/if}
