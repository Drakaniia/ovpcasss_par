<script lang="ts">
  import {
    FIELD_GROUPS,
    type EditReferences,
    type ReportFieldKey,
  } from '../application/report-field-values';
  import type { AttachmentItem } from '$lib/features/attachments/application/attachment-items';
  import type { WizardForm } from '../application/wizard-form';
  import ReportFormGroups from './ReportFormGroups.svelte';

  let {
    form,
    references,
    errors,
    flagged,
    attachments = $bindable(),
    reportId,
    labelOptions,
    disabled = false,
    trackingNumber,
    blockedReason,
    dirty,
    busy,
    onchange,
    ondiscard,
    onsave,
    onresubmit,
  }: {
    form: WizardForm;
    references: EditReferences;
    errors: Record<string, string>;
    /** Fields named in the current return comment. */
    flagged: ReadonlySet<ReportFieldKey>;
    attachments: AttachmentItem[];
    reportId: string;
    labelOptions: readonly string[];
    disabled?: boolean;
    trackingNumber?: string | null;
    blockedReason?: string;
    dirty: boolean;
    busy: 'saving' | 'resubmitting' | null;
    onchange: (key: ReportFieldKey) => void;
    ondiscard: () => void;
    onsave: () => void;
    onresubmit: () => void;
  } = $props();

  let current = $state(FIELD_GROUPS[0].id);

  $effect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-report-section]'));
    if (sections.length === 0) return;

    // The band sits below the app chrome; whichever section crosses it owns the
    // highlight, so the index matches what the reader is looking at.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) current = entry.target.id;
        }
      },
      { rootMargin: '-120px 0px -55% 0px' },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  });

  const saveReason = $derived(!dirty && !busy ? 'No changes to save.' : '');
</script>

<div class="editor-layout">
  <nav class="section-index" aria-label="Report sections">
    <ol>
      {#each FIELD_GROUPS as group (group.id)}
        <li>
          <a
            href="#{group.id}"
            class:is-current={current === group.id}
            aria-current={current === group.id ? 'true' : undefined}
          >
            <span class="numeral">{group.numeral}</span>
            <span>{group.title}</span>
          </a>
        </li>
      {/each}
    </ol>
  </nav>

  <div class="editor">
    <ReportFormGroups
      {form}
      {references}
      {errors}
      {flagged}
      bind:attachments
      {reportId}
      {labelOptions}
      {disabled}
      {trackingNumber}
      {onchange}
    />

    {#if !disabled}
      <footer class="action-bar">
        <p class="reason" id="resubmit-reason">
          {#if blockedReason}
            {blockedReason}
          {:else if saveReason}
            {saveReason}
          {/if}
        </p>

        <div class="actions">
          {#if dirty}
            <button class="discard" type="button" disabled={Boolean(busy)} onclick={ondiscard}>
              Discard local changes
            </button>
          {/if}

          <button
            class="btn btn-outline"
            type="button"
            disabled={Boolean(busy) || !dirty}
            onclick={onsave}
          >
            {busy === 'saving' ? 'Saving…' : 'Save changes'}
          </button>

          <button
            class="btn btn-primary"
            type="button"
            disabled={Boolean(busy) || Boolean(blockedReason)}
            aria-describedby={blockedReason ? 'resubmit-reason' : undefined}
            onclick={onresubmit}
          >
            {busy === 'resubmitting' ? 'Resubmitting…' : 'Resubmit report'}
          </button>
        </div>
      </footer>
    {/if}
  </div>
</div>

<style>
  .editor-layout {
    display: grid;
    gap: 32px;
    grid-template-columns: 176px minmax(0, 760px);
  }

  .section-index {
    align-self: start;
    position: sticky;
    top: 24px;
  }

  .section-index ol {
    display: flex;
    flex-direction: column;
    gap: 2px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .section-index a {
    align-items: baseline;
    border-left: 2px solid transparent;
    color: var(--text-secondary);
    display: flex;
    font-size: 13px;
    gap: 8px;
    padding: 6px 10px;
    text-decoration: none;
  }

  .section-index a:hover {
    background: var(--primary-subtle);
    color: var(--text-primary);
  }

  .section-index a.is-current {
    border-left-color: var(--primary);
    color: var(--text-primary);
    font-weight: 500;
  }

  .numeral {
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: 11px;
    width: 14px;
  }

  .editor {
    min-width: 0;
  }

  .action-bar {
    align-items: center;
    backdrop-filter: blur(12px) saturate(140%);
    background: color-mix(in srgb, var(--surface-card) 88%, transparent);
    border-top: 1px solid var(--border);
    bottom: 0;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    margin-top: 24px;
    padding: 12px 0;
    position: sticky;
    z-index: 10;
  }

  .reason {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
  }

  .actions {
    align-items: center;
    display: flex;
    flex: none;
    gap: 8px;
  }

  .discard {
    color: var(--status-danger-fg);
    font-size: 13px;
    padding: 0 4px;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .discard:hover:not(:disabled) {
    text-decoration-thickness: 2px;
  }

  @media (max-width: 1023px) {
    .editor-layout {
      grid-template-columns: minmax(0, 1fr);
    }

    .section-index {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .action-bar {
      backdrop-filter: none;
      background: var(--surface-card);
    }
  }
</style>
