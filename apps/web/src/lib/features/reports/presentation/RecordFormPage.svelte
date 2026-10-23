<script lang="ts">
  import type { ReportDetail } from '@par/shared';
  import { Check, Plus } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  import ErrorState from '$lib/components/ErrorState.svelte';
  import SkeletonDocument from '$lib/components/SkeletonDocument.svelte';
  import { loadSession } from '$lib/session/session.svelte';
  import { toast } from '$lib/toast/toast.svelte';

  import { wizardKeyAction, type WizardStep } from '../application/record-form';
  import { RecordFormState } from '../application/record-state.svelte';
  import RecordFormWizard from './RecordFormWizard.svelte';

  let {
    mode,
    id,
    detail,
  }: {
    mode: 'create' | 'edit';
    id?: string;
    detail?: ReportDetail;
  } = $props();

  let form = $state<RecordFormState>(
    new RecordFormState({
      mode,
      ...(id ? { id } : {}),
      ...(detail ? { detail } : {}),
    }),
  );
  let signedOut = $state(false);

  async function boot(): Promise<void> {
    const account = await loadSession();

    if (!account) {
      signedOut = true;
      await goto('/login', { replaceState: true });
      return;
    }

    if (account.role !== 'ADMIN') {
      await goto('/reports', { replaceState: true });
      return;
    }

    await form.boot();
  }

  onMount(() => {
    void boot();
  });

  async function save(): Promise<void> {
    const saved = await form.save();
    if (!saved) return;

    if (mode === 'edit') {
      toast.success('Record saved.');
      await goto(`/reports/${id}`);
    }
  }

  async function createAnother(): Promise<void> {
    form = new RecordFormState({ mode: 'create' });
    await form.boot();
  }

  function onKeydown(event: KeyboardEvent): void {
    const action = wizardKeyAction(event, form.step);
    if (!action) return;

    event.preventDefault();
    if (action.step < form.step) void form.setStep(action.step);
    else if (form.step < 3) void form.continue();
    else void save();
  }

  function focusField(id: string | undefined): void {
    if (id) document.getElementById(id)?.focus();
  }
</script>

<svelte:head>
  <title>{mode === 'create' ? 'New record' : 'Edit record'} · OVPCASSS Paperless PAR</title>
</svelte:head>

{#if signedOut}
  <p>Taking you to sign in…</p>
{:else if form.created}
  <section class="confirmation" aria-labelledby="created-title">
    <span class="seal" aria-hidden="true"><Check size={22} /></span>
    <h1 id="created-title">{form.created.referenceNo}</h1>
    <p class="created-copy">
      Sent to {form.created.sentTo}
      {form.created.sentTo === 1 ? 'personnel in charge' : 'personnel in charge'}. They will write
      and submit the narrative report.
    </p>
    <div class="created-actions">
      <a class="btn btn-primary" href="/reports/{form.created.id}">Open record</a>
      <button class="btn btn-outline" type="button" onclick={() => void createAnother()}>
        <Plus size={16} aria-hidden="true" /> Create another
      </button>
    </div>
  </section>
{:else if form.auth === 'denied'}
  <ErrorState
    variant="permission"
    title="You cannot open this record"
    description="The office register is available to administrators. Contact the OVPCASSS administrator if you believe this is a mistake."
    backHref="/"
    backLabel="Back to home"
  />
{:else if form.auth === 'error'}
  <ErrorState
    title="We could not load the record form"
    description="The form options did not load. Try again, or return to the register."
    onretry={() => void boot()}
    backHref="/reports"
    backLabel="Back to reports"
  />
{:else if !form.ready}
  <SkeletonDocument />
{:else}
  {#if mode === 'edit' && detail && (detail.status === 'SUBMITTED' || detail.status === 'RETURNED')}
    <div class="reason-card">
      <label class="reason-label" for="edit-reason">Reason for the correction</label>
      <p class="reason-hint">
        The narrative has been submitted, so every personnel in charge is told what changed and why.
        The narrative, its attachments, and the signature are not editable here.
      </p>
      <textarea
        id="edit-reason"
        class="textarea"
        rows="3"
        maxlength="500"
        bind:value={form.reason}
        required></textarea>
    </div>
  {/if}

  <RecordFormWizard
    state={form}
    heading={form.heading}
    onstep={(step: WizardStep) => void form.goTo(step)}
    oncontinue={() => void form.continue()}
    onsave={() => void save()}
    onback={() => void goto(form.step === 1 ? '/reports' : '/reports')}
    onfocus={focusField}
    onkeydown={onKeydown}
  />

  {#if form.saveError}
    <div class="save-error" role="alert">
      <p>{form.saveError.message}</p>
      {#if form.saveError.requestId}
        <p class="request-id">Request ID: {form.saveError.requestId}</p>
      {/if}
    </div>
  {/if}

  {#if form.referencesError}
    <p class="save-error" role="alert">
      The reference lists did not load. Reload the page before saving.
    </p>
  {/if}
{/if}

<style>
  .confirmation {
    align-items: center;
    display: flex;
    flex-direction: column;
    margin: 48px auto 0;
    max-width: 520px;
    text-align: center;
  }

  .seal {
    align-items: center;
    background: var(--status-success-bg);
    border-radius: 50%;
    color: var(--status-success-fg);
    display: inline-flex;
    height: 44px;
    justify-content: center;
    margin-bottom: 12px;
    width: 44px;
  }

  h1 {
    font-size: 28px;
    letter-spacing: -0.01em;
    margin: 0;
  }

  .created-copy {
    color: var(--text-secondary);
    font-size: 14px;
    margin: 6px 0 20px;
  }

  .created-actions {
    display: flex;
    gap: 10px;
  }

  .created-actions .btn {
    display: inline-flex;
    gap: 6px;
  }

  .reason-card {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
    max-width: 880px;
    padding: 14px 16px;
  }

  .reason-label {
    font-size: 13px;
    font-weight: 500;
  }

  .reason-hint {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.5;
    margin: 0;
  }

  .save-error {
    background: var(--status-danger-bg);
    border: 1px solid var(--status-danger-fg);
    border-radius: var(--radius-card);
    color: var(--status-danger-fg);
    font-size: 13px;
    margin-top: 16px;
    padding: 8px 12px;
  }

  .save-error p {
    margin: 0;
  }

  .request-id {
    font-family: var(--font-mono);
    font-size: 11px;
    margin-top: 4px;
    opacity: 0.8;
  }
</style>
