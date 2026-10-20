<script lang="ts">
  import type { ReportDetail } from '@par/shared';
  import { beforeNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount, untrack } from 'svelte';

  import ErrorState from '$lib/components/ErrorState.svelte';
  import SkeletonDocument from '$lib/components/SkeletonDocument.svelte';
  import { registerEditor } from '$lib/features/window-chrome/application/editor-commands';

  import { conflictTitle } from '../application/report-conflict';
  import { restoredNotice } from '../application/wizard-draft';
  import { STEP_META, type WizardForm } from '../application/wizard-form';
  import { WizardPageState } from '../application/wizard-page.svelte';
  import {
    fieldDomId,
    firstErrorField,
    hasErrors,
    type FieldErrors,
  } from '../application/wizard-validation';
  import CompletenessChecklist from './CompletenessChecklist.svelte';
  import ConflictDialog from './ConflictDialog.svelte';
  import LeaveDraftDialog from './LeaveDraftDialog.svelte';
  import RestoreDraftDialog from './RestoreDraftDialog.svelte';
  import WizardActionBar from './WizardActionBar.svelte';
  import WizardErrorSummary from './WizardErrorSummary.svelte';
  import WizardHeader from './WizardHeader.svelte';
  import WizardStepClassify from './WizardStepClassify.svelte';
  import WizardStepDetails from './WizardStepDetails.svelte';
  import WizardStepPeople from './WizardStepPeople.svelte';
  import WizardStepReview from './WizardStepReview.svelte';

  /** Focus after a step change, and on the first invalid field after Continue. */
  function focusElement(id: string): void {
    document.getElementById(id)?.focus();
  }

  function focusFirstInvalid(form: WizardForm, errors: FieldErrors): void {
    const field = firstErrorField(form, errors);
    const target = field ? document.getElementById(fieldDomId(field)) : null;
    if (target) target.focus();
    else focusElement('wizard-error-summary');
  }

  let { resume, draftId }: { resume?: ReportDetail; draftId?: string } = $props();

  const heading = $derived(
    resume || draftId ? 'Continue post-activity report' : 'New post-activity report',
  );

  // A resumed draft (spec §7.4) keeps its own route and starts from the server
  // copy the route loaded; one wizard instance serves a report for its lifetime.
  const wizard = untrack(
    () =>
      new WizardPageState({
        search: page.url.search,
        focus: {
          step: () => focusElement('wizard-step-heading'),
          errors: () => focusFirstInvalid(wizard.form, wizard.errors),
        },
        ...(resume
          ? { resume, basePath: `/reports/${resume.id}/edit` }
          : draftId
            ? { draftId, basePath: `/reports/${draftId}/edit` }
            : {}),
      }),
  );

  const lostDetail = $derived(
    `step ${wizard.step} of 4 (${STEP_META[wizard.step].title}) for ${
      wizard.form.title.trim() ? `“${wizard.form.title.trim()}”` : 'this report'
    }`,
  );

  beforeNavigate(({ to, cancel }) => {
    wizard.handleBeforeNavigate(
      to ? { pathname: to.url.pathname, href: to.url.href } : null,
      cancel,
    );
  });

  /** Named in the close dialog when the window is closed mid-edit. */
  const guardSubject = $derived(
    wizard.form.title.trim()
      ? `“${wizard.form.title.trim()}” on step ${wizard.step} of 4`
      : `This report on step ${wizard.step} of 4`,
  );

  onMount(() => {
    void wizard.boot();

    const timer = setInterval(() => wizard.autoSave(), 20000);

    // File > Save draft, Ctrl+S and the close guard all resolve here.
    const disposeEditor = registerEditor({
      dirty: () => wizard.draft.dirty,
      saving: () => wizard.draft.state.status === 'saving',
      save: () => wizard.saveDraft(),
      subject: () => guardSubject,
    });

    return () => {
      clearInterval(timer);
      disposeEditor();
    };
  });

  $effect(() => {
    wizard.syncStep(page.url.search);
  });
</script>

<svelte:head><title>{heading} · OVPCASSS Paperless PAR</title></svelte:head>

<svelte:window
  onkeydown={(event) => wizard.onKeydown(event)}
  onbeforeunload={(event) => {
    if (!wizard.draft.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  }}
/>

{#if wizard.auth === 'denied'}
  <ErrorState
    variant="permission"
    requiredRole="SUBMITTER"
    title="Only a Submitter can create a report."
    description="Creating a post-activity report requires the Submitter role. Contact the OVPCASSS administrator if you believe this is a mistake."
    backHref="/reports"
    backLabel="Back to reports"
  />
{:else if wizard.auth === 'error'}
  <ErrorState
    title="We could not load your account"
    description="The request did not complete. Try again, or return to your inbox."
    onretry={() => void wizard.boot()}
    backHref="/"
    backLabel="Back to inbox"
  />
{:else if !wizard.ready || wizard.referencesLoading}
  <SkeletonDocument />
{:else if wizard.referencesError}
  <ErrorState
    title="We could not load the form options"
    description="Campuses, colleges, and the other reference lists did not load. Try again, or return to your reports."
    requestId={wizard.referencesError.requestId}
    onretry={() => void wizard.loadReferences()}
    backHref="/reports"
    backLabel="Back to reports"
  />
{:else}
  <div class="wizard">
    <WizardHeader
      {heading}
      step={wizard.step}
      saveState={wizard.draft.state}
      onstep={(next) => void wizard.tryGoToStep(next)}
      onsave={() => void wizard.leave.saveAndExit()}
      onretry={() => void wizard.saveDraft()}
    />

    {#if wizard.draft.restored}
      <p class="restore-notice" role="status">{restoredNotice(wizard.draft.restoredAt)}</p>
    {/if}

    <div class="wizard-grid">
      <div class="wizard-main" onfocusout={(event) => wizard.onFocusOut(event)}>
        <h2 id="wizard-step-heading" class="visually-hidden" tabindex="-1">
          {STEP_META[wizard.step].title}
        </h2>

        <div class="wizard-bar">
          <CompletenessChecklist
            variant="bar"
            items={wizard.completeness}
            onstep={(next) => void wizard.tryGoToStep(next)}
          />
        </div>

        {#if hasErrors(wizard.errors)}
          <WizardErrorSummary errors={wizard.errors} form={wizard.form} />
        {/if}

        {#if wizard.step === 1}
          <WizardStepClassify
            form={wizard.form}
            campuses={wizard.references.campuses}
            units={wizard.references.units}
            departments={wizard.references.departments}
            offices={wizard.references.offices}
            errors={wizard.errors}
            canManageDirectories={wizard.canManageDirectories}
            onchange={(patch) => wizard.patchForm(patch)}
            onreferencechange={(entity, entries) => wizard.setDirectory(entity, entries)}
          />
        {:else if wizard.step === 2}
          <WizardStepDetails
            form={wizard.form}
            errors={wizard.errors}
            onchange={(patch) => wizard.patchForm(patch)}
          />
        {:else if wizard.step === 3}
          <WizardStepPeople
            form={wizard.form}
            errors={wizard.errors}
            sdgs={wizard.references.sdgs}
            onchange={(patch) => wizard.patchForm(patch)}
          />
        {:else}
          <WizardStepReview
            form={wizard.form}
            errors={wizard.errors}
            sections={wizard.sections}
            completeness={wizard.completeness}
            bind:attachments={wizard.attachments}
            reportId={wizard.draft.serverId}
            labelOptions={wizard.labelOptions}
            ensureReportId={() => wizard.ensureServerDraft()}
            serverIssues={wizard.serverIssues}
            submitError={wizard.submitError}
            onnarrative={(narrative) => wizard.patchForm({ narrative })}
            onedit={(next) => void wizard.tryGoToStep(next)}
            onsubmit={() => void wizard.submit()}
          />
        {/if}
      </div>

      <aside class="wizard-rail">
        <CompletenessChecklist
          items={wizard.completeness}
          onstep={(next) => void wizard.tryGoToStep(next)}
        />
      </aside>
    </div>

    <WizardActionBar
      step={wizard.step}
      busy={wizard.submitting}
      blockReason={wizard.step === 4 ? wizard.blockReason : undefined}
      onback={() => void wizard.setStep((wizard.step - 1) as 1 | 2 | 3 | 4)}
      oncontinue={() => void wizard.tryGoToStep((wizard.step + 1) as 1 | 2 | 3 | 4)}
      onsubmit={() => void wizard.submit()}
    />
  </div>
{/if}

<LeaveDraftDialog
  bind:open={wizard.leave.open}
  lost={lostDetail}
  onsave={() => void wizard.leave.saveAndLeave()}
  ondiscard={() => void wizard.leave.discardAndLeave()}
  onstay={() => wizard.leave.stay()}
/>

{#if wizard.draft.issue}
  <RestoreDraftDialog
    open={true}
    returned={wizard.draft.issue === 'returned'}
    onkeep={() => wizard.keepRestoredDraft()}
    ondiscard={() => void wizard.discardRestoredDraft()}
  />
{/if}

<ConflictDialog
  open={wizard.conflict.open}
  title={conflictTitle()}
  serverLine={wizard.conflict.serverLine}
  fields={wizard.conflict.fields}
  loading={wizard.conflict.loading}
  error={wizard.conflict.error}
  oncopy={() => wizard.conflict.copy(wizard.form)}
  onuseserver={() => wizard.applyServerCopy()}
  onclose={() => wizard.conflict.close()}
/>

<style>
  .wizard {
    margin-inline: auto;
    max-width: 1032px;
    /* Clears the fixed action bar so the last field stays reachable. */
    padding-bottom: 96px;
  }

  .restore-notice {
    background: var(--primary-subtle);
    border-radius: var(--radius-card);
    color: var(--text-primary);
    font-size: 13px;
    margin: 0 0 16px;
    padding: 8px 12px;
  }

  .wizard-grid {
    align-items: start;
    display: grid;
    gap: 32px;
    grid-template-columns: minmax(0, 720px) 280px;
  }

  .wizard-main {
    min-width: 0;
  }

  .wizard-rail {
    position: sticky;
    top: 24px;
  }

  .wizard-bar {
    display: none;
  }

  @media (max-width: 1279px) {
    .wizard-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .wizard-rail {
      display: none;
    }

    .wizard-bar {
      display: block;
      margin-bottom: 12px;
    }
  }

  .visually-hidden {
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }
</style>
