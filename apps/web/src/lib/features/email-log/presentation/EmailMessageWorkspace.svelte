<script lang="ts">
  import type { EmailKind } from '@par/shared';

  import ErrorState from '$lib/components/ErrorState.svelte';

  import type { EmailMessagesState } from '../application/email-messages.svelte';
  import EmailMessageEditor from './EmailMessageEditor.svelte';
  import EmailMessageList from './EmailMessageList.svelte';
  import EmailPreviewPane from './EmailPreviewPane.svelte';

  let {
    messages,
    onselect,
    onselectfrom,
    onsave,
    onrestore,
    onreload,
  }: {
    messages: EmailMessagesState;
    onselect: (kind: EmailKind) => void;
    onselectfrom: (event: Event & { currentTarget: HTMLSelectElement }) => void;
    onsave: () => void;
    onrestore: () => void;
    onreload: () => void;
  } = $props();
</script>

<div class="workspace">
  <aside class="list-column">
    <EmailMessageList items={messages.items} active={messages.kind} {onselect} />
  </aside>

  <div class="editor-column">
    <div class="field narrow-select">
      <label class="field-label" for="message-kind">Message</label>
      <select id="message-kind" class="select" value={messages.kind} onchange={onselectfrom}>
        {#each messages.items as item (item.kind)}
          <option value={item.kind}>{item.label} — {item.edited ? 'Edited' : 'Default'}</option>
        {/each}
      </select>
    </div>

    {#if messages.loadingDetail}
      <div class="card skeleton-editor" aria-hidden="true">
        <div class="skeleton" style="height: 24px; width: 180px"></div>
        <div class="skeleton" style="height: 34px; width: 100%"></div>
        <div class="skeleton" style="height: 90px; width: 100%"></div>
      </div>
    {:else if messages.detailError}
      <div class="card">
        <ErrorState
          title="We could not load this message"
          description={messages.detailError}
          onretry={onreload}
          backHref="/admin/emails?tab=messages"
          backLabel="Back to the messages"
        />
      </div>
    {:else if messages.detail && messages.draft}
      <div class="card editor-card">
        <div class="editor-head">
          <div>
            <h2>{messages.detail.label}</h2>
            <p>{messages.detail.audience}</p>
          </div>
          <span class="chip" class:is-edited={messages.detail.edited}>
            {messages.detail.edited ? 'Edited' : 'Default'}
          </span>
        </div>

        {#if messages.detail.unreadable}
          <p class="quiet-note">
            The stored copy for this message could not be read, so the built-in copy is shown.
            Saving replaces the unusable row.
          </p>
        {/if}

        {#if messages.saveError}
          <p class="form-alert" role="alert">{messages.saveError}</p>
        {/if}

        <EmailMessageEditor
          detail={messages.detail}
          draft={messages.draft}
          issues={messages.issues}
        />

        <div class="editor-actions">
          <button
            class="btn btn-ghost"
            type="button"
            disabled={!messages.detail.edited || messages.restoring}
            onclick={onrestore}
          >
            Restore this message to the built-in copy
          </button>
          <button
            class="btn btn-primary"
            type="button"
            disabled={messages.saving || !messages.dirty}
            onclick={onsave}
          >
            {messages.saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    {/if}
  </div>

  <div class="preview-column">
    <EmailPreviewPane
      preview={messages.preview}
      bind:tab={messages.previewTab}
      title={messages.detail?.label ?? messages.selected?.label ?? 'email'}
      loading={messages.loadingDetail}
      pending={messages.previewPending || messages.previewing}
      error={messages.previewError}
      onretry={() => void messages.renderPreview()}
    />
  </div>
</div>

<style>
  .workspace {
    align-items: start;
    display: grid;
    gap: 16px;
    grid-template-columns: 240px minmax(320px, 1fr) minmax(300px, 46%);
  }

  .list-column {
    position: sticky;
    top: 16px;
  }

  .narrow-select {
    display: none;
  }

  .editor-card {
    padding: 20px;
  }

  .editor-head {
    align-items: flex-start;
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 8px;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
  }

  .editor-head h2 {
    margin: 0;
  }

  .editor-head p {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 2px 0 0;
  }

  .chip {
    background: var(--status-neutral-bg);
    border-radius: 999px;
    color: var(--status-neutral-fg);
    flex: none;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 9px;
  }

  .chip.is-edited {
    background: var(--status-gold-bg);
    color: var(--status-gold-fg);
  }

  .quiet-note {
    background: var(--surface-paper);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0 0 16px;
    padding: 8px 10px;
  }

  .form-alert {
    background: var(--status-danger-bg);
    border-radius: var(--radius-card);
    color: var(--status-danger-fg);
    font-size: 12px;
    margin: 0 0 16px;
    padding: 8px 10px;
  }

  .editor-actions {
    align-items: center;
    border-top: 1px solid var(--border);
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: space-between;
    margin-top: 20px;
    padding-top: 16px;
  }

  .skeleton-editor {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
  }

  @media (max-width: 1439px) {
    .workspace {
      grid-template-columns: minmax(320px, 1fr) minmax(300px, 46%);
    }

    .list-column {
      display: none;
    }

    .narrow-select {
      display: block;
    }
  }

  @media (max-width: 1100px) {
    .workspace {
      grid-template-columns: 1fr;
    }

    .preview-column {
      max-width: 720px;
    }
  }
</style>
