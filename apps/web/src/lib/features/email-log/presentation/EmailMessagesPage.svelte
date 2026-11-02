<script lang="ts">
  import { beforeNavigate, goto } from '$app/navigation';
  import { onMount, tick } from 'svelte';

  import { type EmailKind } from '@par/shared';

  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';

  import { EmailMessagesState } from '../application/email-messages.svelte';
  import EmailMessageWorkspace from './EmailMessageWorkspace.svelte';
  import EmailTabs from './EmailTabs.svelte';

  const messages = new EmailMessagesState();

  /** A pending switch, held while the discard confirmation is open. */
  let discard = $state<{ kind?: EmailKind; href?: string } | null>(null);
  let restoreOpen = $state(false);
  let restoreAllOpen = $state(false);
  let leaving = false;

  const hasEdited = $derived(messages.items.some((item) => item.edited));

  onMount(() => {
    void messages.load();
  });

  beforeNavigate((navigation) => {
    if (leaving || !messages.dirty || !navigation.to) return;

    const target = navigation.to.url;
    if (target.pathname === '/admin/emails' && target.searchParams.get('tab') === 'messages') {
      return;
    }

    navigation.cancel();
    discard = { href: target.href };
  });

  function select(kind: EmailKind) {
    if (kind === messages.kind) return;
    if (messages.dirty) {
      discard = { kind };
      return;
    }
    void messages.open(kind);
  }

  /** The narrow `<select>` moves itself, so put it back when the switch is cancelled. */
  function selectFrom(event: Event & { currentTarget: HTMLSelectElement }) {
    const next = event.currentTarget.value as EmailKind;
    if (next === messages.kind) return;

    if (messages.dirty) {
      event.currentTarget.value = messages.kind;
      discard = { kind: next };
      return;
    }
    void messages.open(next);
  }

  function confirmDiscard() {
    const target = discard;
    discard = null;
    if (!target) return;

    if (target.kind) {
      void messages.open(target.kind);
      return;
    }
    if (target.href) {
      leaving = true;
      void goto(target.href);
    }
  }

  async function save() {
    const saved = await messages.save();
    if (saved || messages.issues.length === 0) return;
    await tick();
    document.getElementById('message-issues')?.focus();
  }

  async function restore() {
    await messages.restore();
    restoreOpen = false;
  }

  async function restoreAll() {
    await messages.restoreAll();
    restoreAllOpen = false;
  }

  function labelOf(kind: EmailKind | undefined): string {
    if (!kind) return 'message';
    return messages.items.find((item) => item.kind === kind)?.label ?? 'message';
  }

  /*
   * The preview follows typing within half a second (email message editor spec
   * §8.5). The draft serialises what the API will render, so an unchanged draft
   * never re-requests, and the previous render stays until the new one lands.
   */
  let lastRendered = '';
  let timer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    const draft = messages.draft;
    if (!draft || messages.view !== 'ready') return;

    const snapshot = JSON.stringify(draft);
    if (snapshot === lastRendered) {
      messages.previewPending = false;
      return;
    }

    messages.previewPending = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      lastRendered = snapshot;
      void messages.renderPreview();
    }, 400);

    return () => clearTimeout(timer);
  });
</script>

<svelte:head><title>Email messages · OVPCASSS Paperless PAR</title></svelte:head>

{#if messages.view === 'denied'}
  <div class="card">
    <ErrorState
      variant="permission"
      title="You do not have access to the email messages"
      description="The message copy is available to administrators. Ask the OVPCASSS administrator if a message needs to change."
      backHref="/"
      backLabel="Back to inbox"
    />
  </div>
{:else}
  <header class="page-head">
    <div>
      <h1>Email</h1>
      <p>The office's own words for every message the system sends.</p>
    </div>
    {#if messages.view === 'ready'}
      <button
        class="btn btn-outline"
        type="button"
        disabled={!hasEdited || messages.restoring}
        onclick={() => (restoreAllOpen = true)}
      >
        Restore all defaults
      </button>
    {/if}
  </header>

  <EmailTabs active="messages" />

  {#if messages.view === 'loading'}
    <div class="workspace" aria-hidden="true">
      <div class="skeleton-list">
        {#each Array(8) as _, index (index)}
          <div class="skeleton" style="height: 42px; width: 100%"></div>
        {/each}
      </div>
      <div class="card skeleton-editor">
        <div class="skeleton" style="height: 24px; width: 180px"></div>
        <div class="skeleton" style="height: 34px; width: 100%"></div>
        <div class="skeleton" style="height: 90px; width: 100%"></div>
      </div>
      <div class="skeleton-preview"></div>
    </div>
  {:else if messages.view === 'error'}
    <div class="card">
      <ErrorState
        title="We could not load the email messages"
        description={messages.loadError ?? 'The request did not complete. Try again.'}
        onretry={() => void messages.load()}
        backHref="/"
        backLabel="Back to inbox"
      />
    </div>
  {:else}
    <EmailMessageWorkspace
      {messages}
      onselect={select}
      onselectfrom={selectFrom}
      onsave={() => void save()}
      onrestore={() => (restoreOpen = true)}
      onreload={() => void messages.open(messages.kind)}
    />
  {/if}
{/if}

<ConfirmDialog
  open={discard !== null}
  title="Discard your edits?"
  description={discard?.kind
    ? `Your changes to the ${labelOf(discard.kind)} message are not saved.`
    : 'Your changes to the open message are not saved.'}
  confirmLabel="Discard edits"
  cancelLabel="Keep editing"
  onconfirm={confirmDiscard}
  oncancel={() => (discard = null)}
/>

<ConfirmDialog
  open={restoreOpen}
  title={`Restore the built-in ${labelOf(messages.kind)} message?`}
  description="The office's edits are removed and the built-in copy is used for the next message sent. Messages already queued keep their own copy."
  confirmLabel="Restore built-in copy"
  onconfirm={() => void restore()}
  oncancel={() => (restoreOpen = false)}
/>

<ConfirmDialog
  open={restoreAllOpen}
  title="Restore all 15 messages?"
  description="Every message returns to the built-in copy. Every edit the office has saved is removed."
  confirmLabel="Restore all defaults"
  onconfirm={() => void restoreAll()}
  oncancel={() => (restoreAllOpen = false)}
/>

<style>
  .page-head {
    align-items: flex-start;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .page-head h1 {
    margin: 0;
  }

  .page-head p {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 4px 0 0;
  }

  .workspace {
    align-items: start;
    display: grid;
    gap: 16px;
    grid-template-columns: 240px minmax(320px, 1fr) minmax(300px, 46%);
  }

  .skeleton-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .skeleton-editor,
  .skeleton-preview {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
  }

  .skeleton-preview {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    min-height: 420px;
  }

  @media (max-width: 1439px) {
    .workspace {
      grid-template-columns: minmax(320px, 1fr) minmax(300px, 46%);
    }

    .skeleton-list {
      display: none;
    }
  }

  @media (max-width: 1100px) {
    .workspace {
      grid-template-columns: 1fr;
    }
  }
</style>
