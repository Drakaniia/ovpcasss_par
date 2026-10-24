<script lang="ts">
  import type { ReportDetail, ReportReceipt } from '@par/shared';
  import {
    Archive,
    ArchiveRestore,
    ArrowLeft,
    Download,
    Eye,
    Pencil,
    Printer,
  } from '@lucide/svelte';
  import { page } from '$app/state';
  import { onMount } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import SkeletonDocument from '$lib/components/SkeletonDocument.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import RecordAttachments from '$lib/features/attachments/presentation/RecordAttachments.svelte';
  import ReceiptList from '$lib/features/receipts/presentation/ReceiptList.svelte';
  import ReceiptPreview from '$lib/features/receipts/presentation/ReceiptPreview.svelte';
  import { formatDateRange, formatDateTime, formatLongDate } from '$lib/format/datetime';
  import { REPORT_TYPE_LABELS } from '$lib/format/report-type';
  import { session } from '$lib/session/session.svelte';
  import { toast } from '$lib/toast/toast.svelte';

  import DecisionPanel from './DecisionPanel.svelte';
  import NarrativeEditor from './NarrativeEditor.svelte';
  import NarrativeMarkdown from './NarrativeMarkdown.svelte';
  import PrintRecord from './PrintRecord.svelte';
  import RecordHistory from './RecordHistory.svelte';

  let { id }: { id: string } = $props();

  let detail = $state<ReportDetail | null>(null);
  let failure = $state<{ status: number; requestId?: string } | null>(null);
  let names = $state<{
    campus: string;
    unit: string;
    sdgs: { id: string; number: number; title: string }[];
  }>({
    campus: '',
    unit: '',
    sdgs: [],
  });
  let printing = $state(false);
  /** The receipt the acknowledgment dialog is showing, if any. */
  let receiptPreview = $state<ReportReceipt | null>(null);
  /** The sheet holds every signature image before the print dialog opens. */
  let printReady = $state(false);
  let filing = $state(false);

  const role = $derived(session.user?.role ?? null);
  const admin = $derived(role === 'ADMIN');
  const printMode = $derived(admin && page.url.searchParams.get('print') === '1');

  const canEditHeader = $derived(Boolean(admin && detail && detail.status !== 'APPROVED'));
  const approvedReceipt = $derived(
    detail?.status === 'APPROVED' && !admin ? (detail.receipts[0] ?? null) : null,
  );

  async function load(): Promise<void> {
    failure = null;

    try {
      detail = await api.reports.get(id);
    } catch (error) {
      failure = {
        status: error instanceof ApiError ? error.status : 0,
        requestId: error instanceof ApiError ? error.requestId : undefined,
      };
      return;
    }

    await loadNames(detail);
  }

  /** Campus and unit names live in reference data; the contract carries ids. */
  async function loadNames(current: ReportDetail): Promise<void> {
    try {
      const [campuses, units, sdgs] = await Promise.all([
        api.reference.list('campuses'),
        api.reference.list('units'),
        api.reference.list('sdgs'),
      ]);

      names = {
        campus: campuses.items.find((campus) => campus.id === current.form.campusId)?.name ?? '',
        unit: units.items.find((unit) => unit.id === current.form.unitId)?.name ?? '',
        sdgs: sdgs.items.map((sdg) => ({ id: sdg.id, number: sdg.number, title: sdg.title })),
      };
    } catch {
      // Names are supporting text; the ids still identify the record.
    }
  }

  async function toggleArchive(): Promise<void> {
    if (!detail || filing) return;
    const archived = !detail.archivedAt;
    filing = true;

    try {
      if (archived) await api.reports.archive(id);
      else await api.reports.unarchive(id);
      toast.success(archived ? 'Record archived.' : 'Record returned to the register.');
      await load();
    } catch {
      toast.error('That record was not filed. Try again.');
    } finally {
      filing = false;
    }
  }

  async function downloadPdf(): Promise<void> {
    try {
      const { url } = await api.reports.pdf(id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('The PDF could not be prepared. Try again.');
    }
  }

  async function print(): Promise<void> {
    if (printing) return;
    printing = true;

    try {
      await document.fonts.ready;
      window.print();
    } finally {
      printing = false;
    }
  }

  onMount(() => {
    void load();
  });
</script>

<svelte:head
  ><title>{detail ? `${detail.referenceNo} · ` : ''}Record · OVPCASSS Paperless PAR</title
  ></svelte:head
>

{#if failure}
  {#if failure.status === 404}
    <ErrorState
      title="This record does not exist"
      description="It may have been deleted, or the link is no longer valid."
      backHref="/reports"
      backLabel="Back to reports"
    />
  {:else if failure.status === 403}
    <ErrorState
      variant="permission"
      title="You cannot open this record"
      description="Only the personnel in charge listed on a record, or an administrator, may read it."
      backHref="/reports"
      backLabel="Back to reports"
    />
  {:else}
    <ErrorState
      title="We could not load this record"
      description="The request did not complete. Try again."
      requestId={failure.requestId}
      onretry={() => void load()}
      backHref="/reports"
      backLabel="Back to reports"
    />
  {/if}
{:else if !detail}
  <SkeletonDocument />
{:else if printMode}
  <div class="print-bar">
    <a class="btn btn-ghost btn-sm" href="/reports/{detail.id}">
      <ArrowLeft size={15} aria-hidden="true" /> Back to the record
    </a>
    <button
      class="btn btn-primary btn-sm"
      type="button"
      disabled={!printReady || printing}
      onclick={print}
    >
      <Printer size={15} aria-hidden="true" />
      {printReady ? 'Print' : 'Preparing…'}
    </button>
  </div>

  <PrintRecord
    {detail}
    campusName={names.campus}
    unitName={names.unit}
    onready={() => (printReady = true)}
  />
{:else}
  <a class="back" href="/reports">
    <ArrowLeft size={15} aria-hidden="true" /> Reports
  </a>

  <header class="record-head">
    <div class="identity">
      <div class="reference-row">
        <span class="reference">{detail.referenceNo}</span>
        <StatusBadge status={detail.status} />
        {#if detail.archivedAt}<span class="archived-chip">Archived</span>{/if}
      </div>
      <h1>{detail.form.title}</h1>
      <p class="meta">
        {REPORT_TYPE_LABELS[detail.form.type]} ·
        {formatDateRange(detail.form.activityStartDate, detail.form.activityEndDate)} ·
        {detail.form.location}
      </p>
    </div>

    <div class="head-actions">
      {#if admin}
        <button class="btn btn-outline btn-sm" type="button" onclick={() => void downloadPdf()}>
          <Download size={15} aria-hidden="true" /> PDF
        </button>
        <a class="btn btn-outline btn-sm" href="/reports/{detail.id}?print=1">
          <Printer size={15} aria-hidden="true" /> Print
        </a>
      {/if}
      {#if canEditHeader && detail.status !== 'SUBMITTED'}
        <a class="btn btn-primary btn-sm" href="/reports/{detail.id}/edit">
          <Pencil size={15} aria-hidden="true" /> Edit details
        </a>
      {:else if canEditHeader}
        <a class="btn btn-outline btn-sm" href="/reports/{detail.id}/edit">
          <Pencil size={15} aria-hidden="true" /> Edit details
        </a>
      {/if}
      {#if detail.canArchive}
        <button
          class="btn btn-outline btn-sm"
          type="button"
          disabled={filing}
          onclick={() => void toggleArchive()}
        >
          {#if detail.archivedAt}
            <ArchiveRestore size={15} aria-hidden="true" /> Unarchive
          {:else}
            <Archive size={15} aria-hidden="true" /> Archive
          {/if}
        </button>
      {/if}
      {#if approvedReceipt}
        <button
          class="btn btn-primary btn-sm"
          type="button"
          onclick={() => (receiptPreview = approvedReceipt)}
        >
          <Eye size={15} aria-hidden="true" /> View receipt
        </button>
      {/if}
    </div>
  </header>

  {#if detail.status === 'RETURNED' && detail.returnEvent}
    <div class="return-callout" role="note">
      <p class="return-title">Returned for revision</p>
      <p class="return-body">{detail.returnEvent.comments}</p>
      <p class="return-meta">
        {detail.returnEvent.authorName} · {formatDateTime(detail.returnEvent.createdAt)}
      </p>
    </div>
  {/if}

  <div class="layout">
    <div class="main-column">
      <section class="panel" aria-labelledby="activity-title">
        <h2 id="activity-title">Activity</h2>
        <dl class="facts">
          <dt>Classification</dt>
          <dd>{detail.form.classification === 'CURRICULAR' ? 'Curricular' : 'Non-curricular'}</dd>
          <dt>Campus</dt>
          <dd>{names.campus || '—'}</dd>
          <dt>College or unit</dt>
          <dd>{names.unit || '—'}</dd>
          <dt>Department</dt>
          <dd>{detail.form.department || '—'}</dd>
          <dt>Office</dt>
          <dd>{detail.form.office || '—'}</dd>
          <dt>Level</dt>
          <dd>{detail.form.level === 'GRADUATE' ? 'Graduate' : 'Undergraduate'}</dd>
          <dt>Date of activity</dt>
          <dd>{formatDateRange(detail.form.activityStartDate, detail.form.activityEndDate)}</dd>
          <dt>Location</dt>
          <dd>{detail.form.location}</dd>
          <dt>Number of activities</dt>
          <dd>{detail.form.activityCount}</dd>
          <dt>SDGs</dt>
          <dd>
            {detail.form.sdgIds
              .map((sdgId) => names.sdgs.find((sdg) => sdg.id === sdgId))
              .filter((sdg): sdg is { id: string; number: number; title: string } => Boolean(sdg))
              .map((sdg) => `SDG ${sdg.number}`)
              .join(', ') || '—'}
          </dd>
        </dl>
      </section>

      <section class="panel" aria-labelledby="people-title">
        <h2 id="people-title">Personnel in charge</h2>
        <ul class="people">
          {#each detail.pics as pic (pic.id ?? pic.email)}
            <li class="person">
              <span class="person-name">{pic.name}</span>
              <span class="person-contact">
                {pic.email}{#if pic.phone}
                  · {pic.phone}{/if}
              </span>
            </li>
          {/each}
        </ul>
      </section>

      {#if detail.canWriteNarrative}
        <section class="panel">
          <NarrativeEditor {detail} onreload={load} />
        </section>
      {:else if detail.status === 'PENDING'}
        <section class="panel" aria-labelledby="narrative-heading">
          <h2 id="narrative-heading">Narrative report</h2>
          <p class="narrative-placeholder">
            The personnel in charge have not submitted the narrative yet.
          </p>
        </section>
      {:else if detail.form.narrative.trim()}
        <section class="panel" aria-labelledby="narrative-heading">
          <h2 id="narrative-heading">Narrative report</h2>
          <NarrativeMarkdown source={detail.form.narrative} />
          {#if detail.submittedAt}
            <p class="submitted-line">
              Submitted by {detail.submittedByName ?? 'the personnel in charge'} ·
              {formatDateTime(detail.submittedAt)}
            </p>
          {/if}
        </section>
      {/if}

      {#if detail.attachments.length > 0}
        <div class="panel">
          <RecordAttachments reportId={detail.id} attachments={detail.attachments} />
        </div>
      {/if}

      {#if admin && detail.status === 'SUBMITTED'}
        <DecisionPanel {detail} ondecided={load} />
      {/if}

      {#if detail.status === 'APPROVED' && detail.receipts.length > 0}
        <div class="panel">
          <ReceiptList reportId={detail.id} receipts={detail.receipts} />
        </div>
      {/if}
    </div>

    <aside class="rail">
      <section class="rail-block">
        <h2>Details</h2>
        <dl class="rail-facts">
          <dt>Created</dt>
          <dd>{formatLongDate(detail.createdAt)}</dd>
          {#if detail.submittedAt}
            <dt>Submitted</dt>
            <dd>{formatLongDate(detail.submittedAt)}</dd>
          {/if}
          {#if detail.approvedAt}
            <dt>Approved</dt>
            <dd>{formatLongDate(detail.approvedAt)}</dd>
          {/if}
          {#if detail.archivedAt}
            <dt>Archived</dt>
            <dd>
              {formatLongDate(detail.archivedAt)}{#if detail.archivedByName}
                · {detail.archivedByName}{/if}
            </dd>
          {/if}
        </dl>
      </section>

      {#if detail.history && detail.history.length > 0}
        <RecordHistory history={detail.history} />
      {/if}
    </aside>
  </div>

  {#if receiptPreview}
    <ReceiptPreview
      reportId={detail.id}
      receipt={receiptPreview}
      onclose={() => (receiptPreview = null)}
    />
  {/if}
{/if}

<style>
  .back {
    align-items: center;
    color: var(--text-secondary);
    display: inline-flex;
    font-size: 12px;
    gap: 4px;
    margin-bottom: 10px;
  }

  .record-head {
    align-items: flex-start;
    display: flex;
    gap: 24px;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .identity {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .reference-row {
    align-items: center;
    display: flex;
    gap: 10px;
  }

  .reference {
    font-family: var(--font-mono);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
  }

  h1 {
    letter-spacing: -0.01em;
    margin: 0;
  }

  .meta {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
  }

  .head-actions {
    align-items: center;
    display: flex;
    flex: none;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  }

  .head-actions .btn {
    align-items: center;
    display: inline-flex;
    gap: 6px;
  }

  .archived-chip {
    background: var(--surface-page);
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--text-secondary);
    font-size: 10px;
    padding: 1px 6px;
  }

  .narrative-placeholder {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
  }

  .return-callout {
    background: var(--status-danger-bg);
    border-left: 3px solid var(--brand-maroon-800);
    border-radius: var(--radius-card);
    color: var(--status-danger-fg);
    margin-bottom: 16px;
    padding: 10px 14px;
  }

  .return-title {
    font-size: 13px;
    font-weight: 500;
    margin: 0;
  }

  .return-body {
    font-size: 13px;
    margin: 4px 0 0;
    white-space: pre-wrap;
  }

  .return-meta {
    font-size: 11px;
    margin: 6px 0 0;
    opacity: 0.8;
  }

  .layout {
    align-items: start;
    display: grid;
    gap: 24px;
    grid-template-columns: minmax(0, 1fr) 260px;
  }

  .main-column {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }

  .panel {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    padding: 14px 16px;
  }

  .panel h2 {
    font-size: 13px;
    letter-spacing: 0.02em;
    margin: 0 0 8px;
    text-transform: uppercase;
  }

  .facts {
    display: grid;
    font-size: 13px;
    gap: 4px 16px;
    grid-template-columns: 140px minmax(0, 1fr);
    margin: 0;
  }

  .facts dt {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .facts dd {
    margin: 0;
  }

  .people {
    display: flex;
    flex-direction: column;
    gap: 8px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .person {
    display: flex;
    flex-direction: column;
  }

  .person-name {
    font-size: 13px;
  }

  .person-contact {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .submitted-line {
    color: var(--text-secondary);
    font-size: 11px;
    margin: 10px 0 0;
  }

  .rail {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .rail-block h2 {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.04em;
    margin: 0 0 6px;
    text-transform: uppercase;
  }

  .rail-facts {
    display: grid;
    font-size: 12px;
    gap: 2px 0;
    margin: 0;
  }

  .rail-facts dt {
    color: var(--text-secondary);
    font-size: 11px;
  }

  .rail-facts dd {
    margin: 0 0 6px;
  }

  .print-bar {
    align-items: center;
    display: flex;
    gap: 8px;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .print-bar .btn {
    align-items: center;
    display: inline-flex;
    gap: 6px;
  }

  @media print {
    .print-bar {
      display: none;
    }
  }
</style>
