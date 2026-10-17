<script lang="ts">
  import { ArrowRight, Inbox } from '@lucide/svelte';

  let {
    title,
    description,
    href,
    linkLabel,
  }: {
    title: string;
    description: string;
    href: string;
    linkLabel: string;
  } = $props();
</script>

<section class="card nothing">
  <span class="icon" aria-hidden="true">
    <Inbox size={22} />
  </span>
  <h2>{title}</h2>
  <p class="copy">{description}</p>
  <a class="link" {href}>
    {linkLabel}
    <ArrowRight size={14} aria-hidden="true" />
  </a>
</section>

<style>
  .nothing {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 640px;
    padding: 32px;
  }

  .icon {
    align-items: center;
    background: var(--primary-subtle);
    border-radius: 50%;
    color: var(--text-secondary);
    display: inline-flex;
    height: 44px;
    justify-content: center;
    margin-bottom: 4px;
    width: 44px;
  }

  h2 {
    margin: 0;
  }

  .copy {
    color: var(--text-secondary);
    margin: 0;
    max-width: 52ch;
  }

  .link {
    align-items: center;
    display: inline-flex;
    font-size: 13px;
    gap: 6px;
    margin-top: 4px;
    min-height: 32px;
  }
</style>
