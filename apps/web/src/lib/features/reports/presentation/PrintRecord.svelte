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
  <!-- The letterhead follows OVPCASSS-F-013: university block, blue brand rule,
       office line, then the heavy form rule that closes the head. -->
  <header class="letterhead">
    <div class="reference">
      <p class="reference-no">{detail.referenceNo}</p>
      <p class="reference-status">{STATUS_PRESENTATION[detail.status].label}</p>
    </div>

    <p class="university">Bukidnon State University</p>
    <p class="address">Malaybalay City, Bukidnon, 8700</p>
    <p class="website">www.buksu.edu.ph</p>
    <span class="brand-rule" aria-hidden="true"></span>
    <p class="office">
      Office of the Vice President for Culture, Arts, Sports and Student Services
    </p>
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
  /* The sheet mirrors OVPCASSS-F-013: Book Antiqua on A4, 10 pt body, the
     university letterhead, the ruling of the form, and black type throughout. */
  .sheet {
    background: #fff;
    box-shadow: var(--shadow-raised);
    color: #000;
    font-family: 'Book Antiqua', 'Palatino Linotype', Palatino, 'Times New Roman', serif;
    font-size: 10pt;
    line-height: 1.45;
    margin: 0 auto;
    max-width: 210mm;
    min-height: 297mm;
    padding: 14mm 19mm 18mm;
  }

  .letterhead {
    padding-top: 1mm;
    position: relative;
    text-align: center;
  }

  .reference {
    position: absolute;
    right: 0;
    text-align: right;
    top: 1mm;
  }

  .reference-no {
    font-size: 10pt;
    font-weight: 700;
    margin: 0;
  }

  .reference-status {
    font-size: 8pt;
    letter-spacing: 0.08em;
    margin: 1.5pt 0 0;
    text-transform: uppercase;
  }

  .university {
    font-size: 10pt;
    font-weight: 700;
    letter-spacing: 0.04em;
    margin: 0;
    text-transform: uppercase;
  }

  .address,
  .website {
    font-size: 10pt;
    margin: 1pt 0 0;
  }

  .website {
    color: #0563c1;
  }

  /* The link rule under the university address, as the form prints it. */
  .brand-rule {
    background: #0563c1;
    display: block;
    height: 0.6pt;
    margin: 2mm auto 1.5mm;
    width: 31mm;
  }

  .office {
    font-size: 7pt;
    font-weight: 700;
    letter-spacing: 0.03em;
    margin: 0 auto;
    max-width: 150mm;
    text-transform: uppercase;
  }

  /* The heavy form rule that closes the letterhead. */
  .letterhead::after {
    background: #000;
    content: '';
    display: block;
    height: 3.2pt;
    margin-top: 2mm;
  }

  .document-title {
    font-size: 12pt;
    font-weight: 700;
    letter-spacing: 0.08em;
    margin: 9mm 0 2mm;
    text-align: center;
  }

  .activity-title {
    font-size: 10pt;
    font-weight: 700;
    margin: 0 0 7mm;
    text-align: center;
  }

  h2 {
    border-bottom: 0.75pt solid #000;
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 0.08em;
    margin: 7mm 0 2.5mm;
    padding-bottom: 1mm;
    text-transform: uppercase;
  }

  .facts {
    display: grid;
    font-size: 10pt;
    gap: 1.5mm 6mm;
    grid-template-columns: 42mm 1fr;
    margin: 0;
  }

  .facts dt {
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding-top: 0.6mm;
    text-transform: uppercase;
  }

  .facts dd {
    margin: 0;
  }

  .narrative {
    margin: 0;
  }

  .narrative :global(.narrative-markdown) {
    font-size: 10pt;
    line-height: 1.5;
  }

  .narrative :global(h3),
  .narrative :global(h4),
  .narrative :global(h5) {
    font-size: 10pt;
    margin: 3mm 0 1mm;
  }

  .attachments {
    font-size: 10pt;
    margin: 0;
    padding-left: 5mm;
  }

  .signatures {
    display: grid;
    gap: 12mm;
    grid-template-columns: 1fr 1fr;
    margin-top: 16mm;
  }

  .signature-slot {
    display: flex;
    flex-direction: column;
    gap: 1pt;
    min-height: 22mm;
  }

  .rule {
    border-bottom: 0.75pt solid #000;
    display: block;
  }

  .signature-label {
    font-size: 9pt;
    margin: 3pt 0 0;
  }

  .signature-meta {
    font-size: 8pt;
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
