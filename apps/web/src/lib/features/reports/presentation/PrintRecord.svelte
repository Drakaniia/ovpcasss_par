<script lang="ts">
  import { onMount } from 'svelte';
  import type { ReportDetail } from '@par/shared';

  import { formatDateRange, formatLongDate } from '$lib/format/datetime';
  import { REPORT_TYPE_LABELS } from '$lib/format/report-type';
  import { STATUS_PRESENTATION } from '$lib/status/report-status';

  import SignatureImage from './SignatureImage.svelte';
  import NarrativeMarkdown from './NarrativeMarkdown.svelte';

  /**
   * The filed artefact (spec §14): same sections as the record, on paper.
   * `onready` fires once every signature image is on the page, so the print
   * never leaves the paper without the image (bug phase 05 §3.3).
   */
  let {
    detail,
    campusName = '',
    unitName = '',
    onready,
  }: {
    detail: ReportDetail;
    campusName?: string;
    unitName?: string;
    onready?: () => void;
  } = $props();

  const form = $derived(detail.form);
  const decisions = $derived(detail.people?.decidedBy ?? null);
  const expected = $derived((detail.narrativeSignature ? 1 : 0) + (detail.approvedAt ? 1 : 0));
  let arrived = $state(0);

  function imageReady(): void {
    arrived += 1;
    if (arrived >= expected) onready?.();
  }

  onMount(() => {
    if (expected === 0) onready?.();
  });
</script>

<article class="sheet" aria-label="Post-activity report facsimile">
  <header class="letterhead">
    <div class="office">
      <p class="office-name">OVPCASSS</p>
      <p class="office-line">
        Office of the Vice President for Culture, Arts, Sports and Student Services
      </p>
      <p class="office-line">Bukidnon State University · Malaybalay City, Bukidnon</p>
    </div>
    <div class="reference">
      <p class="reference-no">{detail.referenceNo}</p>
      <p class="reference-status">{STATUS_PRESENTATION[detail.status].label}</p>
    </div>
  </header>

  <h1 class="document-title">POST-ACTIVITY REPORT</h1>
  <p class="activity-title">{form.title}</p>

  <h2>I. Activity</h2>
  <dl class="facts">
    <dt>Activity type</dt>
    <dd>{REPORT_TYPE_LABELS[form.type]}</dd>
    <dt>Classification</dt>
    <dd>{form.classification === 'CURRICULAR' ? 'Curricular' : 'Non-curricular'}</dd>
    <dt>Campus</dt>
    <dd>{campusName || '—'}</dd>
    <dt>College / unit</dt>
    <dd>{unitName || '—'}</dd>
    <dt>Level</dt>
    <dd>{form.level === 'GRADUATE' ? 'Graduate' : 'Undergraduate'}</dd>
    <dt>Department / Office</dt>
    <dd>{[form.department, form.office].filter(Boolean).join(' · ') || '—'}</dd>
    <dt>Date of activity</dt>
    <dd>{formatDateRange(form.activityStartDate, form.activityEndDate)}</dd>
    <dt>Location</dt>
    <dd>{form.location}</dd>
    <dt>Number of activities</dt>
    <dd>{form.activityCount}</dd>
  </dl>

  <h2>II. Participants</h2>
  <dl class="facts">
    <dt>Students</dt>
    <dd>{form.totalStudents}</dd>
    <dt>Persons in charge</dt>
    <dd>{form.totalPic}</dd>
    <dt>Names</dt>
    <dd>
      {#each detail.pics as pic, index (pic.id ?? pic.email)}
        <span
          >{pic.name}{#if pic.email}
            ({pic.email}){/if}{#if index < detail.pics.length - 1};
          {/if}</span
        >
      {/each}
    </dd>
  </dl>

  <h2>III. Narrative</h2>
  <div class="narrative"><NarrativeMarkdown source={form.narrative || '—'} /></div>

  {#if detail.attachments.length > 0}
    <h2>Attachments</h2>
    <ul class="attachments">
      {#each detail.attachments as attachment (attachment.id)}
        <li>{attachment.label || 'Attachment'} — {attachment.originalName}</li>
      {/each}
    </ul>
  {/if}

  <h2>IV. Signatures</h2>
  <div class="signatures">
    <div class="signature-slot">
      {#if detail.narrativeSignature}
        <SignatureImage
          reportId={detail.id}
          alt="Signature of {detail.submittedByName ?? 'the personnel in charge'}"
          onready={imageReady}
        />
      {/if}
      <span class="rule"></span>
      <p class="signature-label">
        Submitted by {detail.submittedByName ?? detail.pics[0]?.name ?? 'Personnel in charge'}
      </p>
      {#if detail.submittedAt}
        <p class="signature-meta">{formatLongDate(detail.submittedAt)}</p>
      {/if}
    </div>

    <div class="signature-slot">
      {#if detail.approvedAt}
        <SignatureImage
          reportId={detail.id}
          side="approval"
          alt="Signature of the approving officer"
          onready={imageReady}
        />
      {/if}
      <span class="rule"></span>
      <p class="signature-label">
        Approved by {decisions?.fullName ?? ''}
      </p>
      {#if detail.approvedAt}
        <p class="signature-meta">{formatLongDate(detail.approvedAt)}</p>
      {/if}
    </div>
  </div>
</article>

<style>
  .sheet {
    background: #fff;
    box-shadow: var(--shadow-raised);
    color: #171b22;
    font-family: 'Times New Roman', Times, serif;
    margin: 0 auto;
    max-width: 210mm;
    min-height: 297mm;
    padding: 18mm 18mm 22mm;
  }

  .letterhead {
    align-items: flex-start;
    border-bottom: 1.5px solid #1b2a4a;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    padding-bottom: 10px;
  }

  .office-name {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    margin: 0;
  }

  .office-line {
    font-size: 9px;
    margin: 2px 0 0;
  }

  .reference {
    text-align: right;
  }

  .reference-no {
    font-size: 11px;
    font-weight: 700;
    margin: 0;
  }

  .reference-status {
    font-size: 9px;
    margin: 2px 0 0;
    text-transform: uppercase;
  }

  .document-title {
    font-size: 16px;
    letter-spacing: 0.08em;
    margin: 22px 0 4px;
    text-align: center;
  }

  .activity-title {
    font-size: 12px;
    font-weight: 700;
    margin: 0 0 18px;
    text-align: center;
  }

  h2 {
    border-bottom: 0.75px solid #b9a45a;
    font-size: 9px;
    letter-spacing: 0.08em;
    margin: 18px 0 6px;
    padding-bottom: 3px;
    text-transform: uppercase;
  }

  .facts {
    display: grid;
    font-size: 10px;
    gap: 4px 12px;
    grid-template-columns: 40mm 1fr;
    margin: 0;
  }

  .facts dt {
    color: #5a6070;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .facts dd {
    margin: 0;
  }

  .narrative {
    margin: 0;
  }

  .narrative :global(.narrative-markdown) {
    font-size: 10.5px;
    line-height: 1.55;
  }

  .narrative :global(h3),
  .narrative :global(h4),
  .narrative :global(h5) {
    font-size: 11px;
    margin: 6px 0 3px;
  }

  .attachments {
    font-size: 10px;
    margin: 0;
    padding-left: 16px;
  }

  .signatures {
    display: grid;
    gap: 18mm;
    grid-template-columns: 1fr 1fr;
    margin-top: 12mm;
  }

  .signature-slot {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 22mm;
  }

  .rule {
    border-bottom: 0.75px solid #171b22;
    display: block;
  }

  .signature-label {
    font-size: 10px;
    margin: 4px 0 0;
  }

  .signature-meta {
    color: #5a6070;
    font-size: 8.5px;
    margin: 0;
  }

  @media print {
    .sheet {
      box-shadow: none;
      margin: 0;
      max-width: none;
      min-height: 0;
      padding: 0;
    }
  }
</style>
