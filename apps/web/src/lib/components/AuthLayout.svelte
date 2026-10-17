<script lang="ts">
  import BrandSeal from '$lib/components/BrandSeal.svelte';

  let { children, heading }: { children: import('svelte').Snippet; heading: string } = $props();
</script>

<div class="auth-page">
  <div class="auth-brand">
    <BrandSeal size={64} />
    <p class="auth-wordmark">OVPCASSS Paperless PAR</p>
    <h1 class="auth-heading">{heading}</h1>
  </div>

  <main class="auth-card card">
    {@render children()}
  </main>

  <p class="auth-footer">Authorized use only. Activity is recorded in the audit log.</p>
</div>

<style>
  .auth-page {
    align-items: center;
    background: var(--surface-auth);
    color: var(--text-auth);
    display: flex;
    flex-direction: column;
    gap: 24px;
    justify-content: center;
    min-height: 100vh;
    padding: 48px 24px;
  }

  .auth-brand {
    align-items: center;
    color: var(--text-auth);
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }

  .auth-wordmark {
    font-family: var(--font-document);
    font-size: 18px;
    font-weight: 600;
    margin: 0;
  }

  .auth-heading {
    color: var(--text-secondary);
    font-size: 15px;
    font-weight: 400;
    line-height: 1.4;
    margin: 0;
    max-width: 40ch;
  }

  .auth-card {
    color: var(--text-primary);
    max-width: 400px;
    padding: 32px;
    width: 100%;
  }

  .auth-footer {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
    max-width: 400px;
    text-align: center;
  }
</style>
