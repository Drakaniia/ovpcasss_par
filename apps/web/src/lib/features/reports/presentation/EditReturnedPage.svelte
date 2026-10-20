<script lang="ts">
  import { Info, Undo2 } from '@lucide/svelte';
  import { beforeNavigate, goto } from '$app/navigation';
  import { onMount, tick, untrack } from 'svelte';

  import { trapFocus } from '$lib/a11y/focus-trap';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import { registerEditor } from '$lib/features/window-chrome/application/editor-commands';
  import { formatDate } from '$lib/format/datetime';

  import { EditReturnedState } from '../application/edit-returned-state.svelte';
  import {
    FIELD_GROUPS,
    FIELD_LABELS,
    type ReportFieldKey,
  } from '../application/report-field-values';
  import { conflictTitle } from '../application/report-conflict';
  import { fieldDomId } from '../application/wizard-validation';
  import ConflictDialog from './ConflictDialog.svelte';
  import EditReturnedHeader from './EditReturnedHeader.svelte';
  import ReportEditor from './ReportEditor.svelte';
  import ReportWizardPage from './ReportWizardPage.svelte';

  let { id }: { id: string } = $props();

  /**
   * The route serves a draft owner too (spec §7.4). The editor is built once per
   * report: the route keys this page by id, so a different report remounts it.
   */
  const editor = untrack(() => new EditReturnedState(id));
  const detail = $derived(editor.detail);
  const callout = $derived(editor.callout);
  const pageTitle = $derived(
    editor.access === 'draft' || editor.view === 'local'
      ? 'Continue post-activity report'
      : detail
        ? `Edit ${detail.form.title}`
        : 'Edit report',
  );

  let alertEl = $state<HTMLElement | null>(null);
  let discardOpen = $state(false);
  let leaveOpen = $state(false);
  let leavingTo = $state<string | null>(null);
  let bypassLeave = false;

  let leaveDialog = $state<HTMLDialogElement | null>(null);
  let stayButton = $state<HTMLButtonElement | null>(null);

  $effect(() => {
    if (!leaveDialog) return;
    if (leaveOpen && !leaveDialog.open) {
      leaveDialog.showModal();
      stayButton?.focus();
    }
    if (!leaveOpen && leaveDialog.open) leaveDialog.close();
  });

  // A returned report that is no longer returned after a refresh belongs on the facsimile.
  $effect(() => {
    if (editor.view !== 'ready' || editor.access !== 'redirect') return;
    bypassLeave = true;
    void goto(`/reports/${id}`, { replaceState: true });
  });

  $effect(() => {
    if (!editor.alert && !editor.serverError) return;
    void tick().then(() => alertEl?.focus());
  });

  beforeNavigate(({ cancel, to }) => {
    if (bypassLeave || !editor.dirty) return;
    cancel();
    leavingTo = to?.url.pathname ?? '/reports';
    leaveOpen = true;
  });

  function scrollTo(element: HTMLElement) {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
  }

  function focusField(key: ReportFieldKey) {
    const element = document.getElementById(fieldDomId(key));
    if (element) {
      scrollTo(element);
      (element as HTMLInputElement).focus({ preventScroll: true });
      return;
    }

    const group = FIELD_GROUPS.find((entry) => entry.fields.includes(key));
    const section = group ? document.getElementById(group.id) : null;
    if (section) scrollTo(section);
  }

  async function focusFirstIssue() {
    await tick();
    const target = editor.issues.find((issue) => issue.targetId)?.targetId;
    if (!target) return;
    const element = document.getElementById(target);
    if (element) {
      scrollTo(element);
      (element as HTMLInputElement).focus({ preventScroll: true });
    }
  }

  async function save() {
    await editor.saveChanges();
    await focusFirstIssue();
  }

  async function resubmit() {
    await editor.resubmit();
    await focusFirstIssue();
  }

  async function discardChanges() {
    await editor.discardChanges();
    discardOpen = false;
  }

  async function saveAndLeave() {
    leaveOpen = false;
    if (await editor.saveChanges()) {
      bypassLeave = true;
      await goto(leavingTo ?? '/reports');
    } else {
      await focusFirstIssue();
    }
  }

  async function discardAndLeave() {
    leaveOpen = false;
    await editor.clearLocalDraft();
    bypassLeave = true;
    await goto(leavingTo ?? '/reports');
  }

  function stay() {
    leaveOpen = false;
    leavingTo = null;
  }

  function handleBlur(event: FocusEvent) {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget instanceof Node) {
      if (event.currentTarget.contains(next)) return;
    }
    void editor.saveLocal();
  }

  onMount(() => {
    void editor.load();
    const timer = setInterval(() => void editor.saveLocal(), 20_000);

    // File > Save draft, Ctrl+S and the close guard save the returned report.
    const disposeEditor = registerEditor({
      dirty: () => editor.dirty,
      saving: () => editor.busy !== null,
      save: () => editor.saveChanges(),
      subject: () => (editor.form.title.trim() ? `“${editor.form.title.trim()}”` : 'This report'),
    });

    return () => {
      clearInterval(timer);
      disposeEditor();
    };
  });
</script>

<svelte:head>
  <title>{pageTitle} · OVPCASSS Paperless PAR</title>
</svelte:head>

<svelte:window
  onbeforeunload={(event) => {
    if (!editor.dirty) return;
    event.preventDefault();
  }}
/>

{#if editor.view === 'loading' || editor.access === 'redirect' || (editor.view === 'ready' && !detail)}
  <div class="editor-skeleton" aria-busy="true">
    <span class="sr-only">Loading the report</span>
    <div class="skeleton line title" aria-hidden="true"></div>
    <div class="skeleton line meta" aria-hidden="true"></div>
    <div class="skeleton skeleton-callout" aria-hidden="true"></div>
    <div class="skeleton-grid" aria-hidden="true">
      {#each [3, 4, 3, 2] as rows, group (group)}
        <div class="skeleton-group">
          <div class="skeleton line heading"></div>
          {#each Array.from({ length: rows }) as _, row (row)}
            <div class="skeleton block input"></div>
          {/each}
        </div>
      {/each}
    </div>
  </div>
{:else if editor.view === 'local'}
  <ReportWizardPage draftId={id} />
{:else if editor.view === 'not-found'}
  <ErrorState variant="not-found" backHref="/reports" backLabel="Back to reports" />
{:else if editor.view === 'error' || !detail}
  <ErrorState
    title="We could not load this report"
    description="The report did not load. Try again, or return to the reports list."
    requestId={editor.requestId}
    onretry={() => void editor.load()}
    backHref="/reports"
    backLabel="Back to reports"
  />
{:else if editor.access === 'denied'}
  <ErrorState
    variant="permission"
    requiredRole="SUBMITTER"
    title="Only the submitting user can edit this report."
    description="A returned report can be corrected only by the account that submitted it. Ask that person to make the correction, or return to your reports."
    backHref="/reports"
    backLabel="Back to reports"
  />
{:else if editor.access === 'draft'}
  <ReportWizardPage resume={detail} />
{:else}
  <div class="edit-returned-page">
    <EditReturnedHeader
      {detail}
      returned={editor.returned}
      saveKind={editor.saveKind}
      saveAt={editor.headerSaveAt}
      onretry={() => void editor.saveLocal()}
    />

    {#if editor.access === 'superseded'}
      <div class="superseded" role="status">
        <Info size={16} aria-hidden="true" />
        <div>
          <p>This report has already been resubmitted, so it can no longer be edited here.</p>
          <a href="/reports/{id}">View the report</a>
        </div>
      </div>
    {/if}

    {#if callout}
      <aside class="callout" aria-labelledby="return-heading">
        <header class="callout-head">
          <span class="callout-icon" aria-hidden="true"><Undo2 size={16} /></span>
          <div>
            <h2 id="return-heading">Returned by {callout.authorName}, {callout.roleLabel}</h2>
            <p class="callout-date">{formatDate(callout.createdAt)}</p>
          </div>
        </header>

        <p class="comment">{callout.comments}</p>

        {#if callout.flagged.length > 0}
          <div class="flagged">
            <span class="flagged-title">Flagged fields</span>
            <ul>
              {#each callout.flagged as key (key)}
                <li>
                  <button class="link" type="button" onclick={() => focusField(key)}>
                    {FIELD_LABELS[key]}
                  </button>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </aside>
    {/if}

    {#if editor.alert}
      <div class="form-alert" role="alert" tabindex="-1" bind:this={alertEl}>{editor.alert}</div>
    {/if}

    {#if editor.serverError}
      <div class="form-alert" role="alert" tabindex="-1" bind:this={alertEl}>
        {editor.serverError}
      </div>
    {/if}

    {#if editor.issues.length > 0}
      <div class="error-summary" role="alert" aria-labelledby="issues-heading">
        <h2 id="issues-heading">Check these fields</h2>
        <ul>
          {#each editor.issues as issue (issue.field + issue.message)}
            <li>
              {#if issue.targetId}
                <a
                  href="#{issue.targetId}"
                  onclick={(event) => {
                    event.preventDefault();
                    if (issue.targetId) document.getElementById(issue.targetId)?.focus();
                  }}
                >
                  {issue.label}: {issue.message}
                </a>
              {:else}
                {issue.label}: {issue.message}
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <div onfocusout={handleBlur}>
      <ReportEditor
        form={editor.form}
        references={editor.references}
        errors={editor.fieldErrors}
        flagged={editor.flaggedKeys}
        bind:attachments={editor.attachments}
        reportId={id}
        labelOptions={editor.labelOptions}
        disabled={editor.access !== 'editable'}
        trackingNumber={detail.trackingNumber}
        blockedReason={editor.blockReason}
        dirty={editor.dirty}
        busy={editor.busy}
        onchange={(key) => editor.fieldChanged(key)}
        ondiscard={() => (discardOpen = true)}
        onsave={() => void save()}
        onresubmit={() => void resubmit()}
      />
    </div>
  </div>

  <ConfirmDialog
    bind:open={discardOpen}
    title="Discard your unsaved changes to “{detail.form.title}”?"
    description="The page returns to the last saved version of this report."
    confirmLabel="Discard changes"
    tone="destructive"
    onconfirm={() => void discardChanges()}
  />

  <dialog
    bind:this={leaveDialog}
    class="dialog leave-dialog"
    aria-labelledby="leave-heading"
    oncancel={(event) => {
      event.preventDefault();
      stay();
    }}
    onkeydown={(event) => leaveDialog && trapFocus(event, leaveDialog)}
    onclose={() => (leaveOpen = false)}
  >
    <h2 id="leave-heading" class="dialog-title">Save your changes before leaving?</h2>
    <p class="dialog-body">
      You have unsaved changes to “{detail.form.title}”. Save them, discard them, or stay on this
      page.
    </p>
    <div class="dialog-actions">
      <button
        class="discard"
        type="button"
        disabled={editor.busy === 'saving'}
        onclick={() => void discardAndLeave()}
      >
        Discard
      </button>
      <div class="right">
        <button class="btn btn-outline" type="button" bind:this={stayButton} onclick={stay}>
          Stay
        </button>
        <button
          class="btn btn-primary"
          type="button"
          disabled={editor.busy === 'saving'}
          onclick={() => void saveAndLeave()}
        >
          {editor.busy === 'saving' ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  </dialog>

  <ConflictDialog
    open={editor.conflict !== null}
    title={conflictTitle()}
    serverLine={editor.conflictLine}
    fields={editor.conflict?.fields ?? []}
    loading={editor.conflict?.loading ?? false}
    error={editor.conflict?.error}
    oncopy={() => editor.copyEdits()}
    onuseserver={() => void editor.useServerVersion()}
    onclose={() => editor.closeConflict()}
  />
{/if}
