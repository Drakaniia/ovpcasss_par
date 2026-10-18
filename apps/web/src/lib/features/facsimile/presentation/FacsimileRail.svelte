<script lang="ts">
  import type { ReportDetail } from '@par/shared';
  import { AlertCircle, Info } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  import { acknowledgementIssue } from '../application/facsimile-workflow';
  import type { AttachmentRow } from '../application/facsimile-attachments';
  import type { PersonRow } from '../application/facsimile-people';
  import RailAttachments from './RailAttachments.svelte';
  import RailMeta from './RailMeta.svelte';
  import RailPeople from './RailPeople.svelte';

  /**
   * Record rail (UI spec §7.7): Actions, Attachments, People, Report meta —
   * sticky and independently scrollable.
   *
   * Phase 09 prepends the decision buttons through `actions`; until then there
   * is no dead control here. Phase 08 owns the approved acknowledgement action
   * and the separation-of-duties reason.
   */
  let {
    detail,
    people,
    attachments,
    busyAttachmentId = null,
    attachmentErrors = {},
    onattachment,
    notice = null,
    acknowledgement = { busy: false },
    onacknowledgement,
    actions,
  }: {
    detail: ReportDetail;
    people: PersonRow[];
    attachments: AttachmentRow[];
    busyAttachmentId?: string | null;
    attachmentErrors?: Record<string, string>;
    onattachment: (row: AttachmentRow) => void;
    notice?: string | null;
    acknowledgement?: { busy: boolean; error?: string };
    onacknowledgement: () => void;
    actions?: Snippet;
  } = $props();

  const ackIssue = $derived(acknowledgementIssue(detail));
  const showsActions = $derived(Boolean(actions) || detail.status === 'APPROVED' || notice);
</script>

<aside class="facsimile-rail" aria-label="Report details">
  {#if showsActions}
    <section class="rail-section" aria-labelledby="rail-actions-heading">
      <h2 id="rail-actions-heading" class="rail-heading">Actions</h2>

      {#if actions}
        {@render actions()}
      {:else if detail.status === 'APPROVED'}
        {#if ackIssue}
          <p class="rail-note">
            <Info size={14} aria-hidden="true" />
            <span>{ackIssue}</span>
          </p>
          <a class="btn btn-outline btn-sm profile-link" href="/profile">Open profile</a>
        {:else}
          <button
            class="btn btn-outline ack-button"
            type="button"
            disabled={acknowledgement.busy}
            onclick={onacknowledgement}
          >
            {acknowledgement.busy ? 'Preparing acknowledgement…' : 'Download acknowledgement'}
          </button>
        {/if}

        {#if acknowledgement.error}
          <div class="rail-alert" role="alert">
            <AlertCircle size={14} aria-hidden="true" />
            <span>{acknowledgement.error}</span>
            <button class="retry" type="button" onclick={onacknowledgement}>Retry</button>
          </div>
        {/if}
      {:else if notice}
        <p class="rail-note">
          <Info size={14} aria-hidden="true" />
          <span>{notice}</span>
        </p>
      {/if}
    </section>
  {/if}

  <RailAttachments
    rows={attachments}
    busyId={busyAttachmentId}
    errors={attachmentErrors}
    onopen={onattachment}
  />

  <RailPeople rows={people} />

  <RailMeta {detail} />
</aside>

<style>
  .ack-button {
    justify-content: center;
    width: 100%;
  }

  .profile-link {
    margin-top: 8px;
  }

  .rail-note {
    align-items: flex-start;
    color: var(--text-secondary);
    display: flex;
    font-size: 12.5px;
    gap: 6px;
    line-height: 1.5;
    margin: 0;
  }

  .rail-note :global(svg) {
    color: var(--brand-maroon-800);
    flex: none;
    margin-top: 2px;
  }

  .rail-alert {
    align-items: flex-start;
    color: var(--status-danger-fg);
    display: flex;
    flex-wrap: wrap;
    font-size: 12px;
    gap: 4px 6px;
    line-height: 1.45;
    margin-top: 10px;
  }

  .retry {
    background: transparent;
    color: inherit;
    font-weight: 500;
    padding: 0;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
</style>
