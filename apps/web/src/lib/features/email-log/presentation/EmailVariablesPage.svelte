<script lang="ts">
  import { AlertCircle, LoaderCircle } from '@lucide/svelte';
  import { onMount } from 'svelte';

  import ErrorState from '$lib/components/ErrorState.svelte';

  import { EmailVariablesState } from '../application/email-variables.svelte';
  import EmailTabs from './EmailTabs.svelte';

  const variables = new EmailVariablesState();

  onMount(() => {
    void variables.load();
  });

  function submit(event: SubmitEvent) {
    event.preventDefault();
    void variables.save();
  }

  function testSubmit(event: SubmitEvent) {
    event.preventDefault();
    void variables.sendTest();
  }
</script>

<svelte:head><title>Email variables · OVPCASSS Paperless PAR</title></svelte:head>

{#if variables.view === 'denied'}
  <div class="card">
    <ErrorState
      variant="permission"
      title="You do not have access to the email variables"
      description="The sender and provider key are available to administrators. Ask the OVPCASSS administrator if the sender needs to change."
      backHref="/"
      backLabel="Back to inbox"
    />
  </div>
{:else}
  <header class="page-head">
    <h1>Email</h1>
    <p>The sender and provider key used for outbound mail.</p>
  </header>

  <EmailTabs active="variables" />

  {#if variables.view === 'loading'}
    <div class="card skeleton-card" aria-hidden="true">
      <div class="skeleton" style="height: 16px; width: 180px"></div>
      <div class="skeleton" style="height: 32px; width: 100%"></div>
      <div class="skeleton" style="height: 32px; width: 100%"></div>
    </div>
  {:else if variables.view === 'error'}
    <div class="card">
      <ErrorState
        title="We could not load the email variables"
        description={variables.loadError ?? 'The request did not complete. Try again.'}
        onretry={() => void variables.load()}
        backHref="/"
        backLabel="Back to inbox"
      />
    </div>
  {:else}
    <form class="card settings-form" novalidate onsubmit={submit}>
      <div class="card-head">
        <h2>Sender variables</h2>
        <p>
          These values are stored in the database and take effect on the next message the system
          sends.
        </p>
      </div>

      <p class="source-note" class:is-saved={variables.saved?.source === 'database'}>
        {#if variables.saved?.source === 'database'}
          The values saved here are in use. They replace the deployment variables.
        {:else}
          The deployment variables are in use until a pair is saved here.
        {/if}
        {#if variables.consoleAdapter}
          Mail is carried by the console adapter, which prints every message to the Worker log and
          delivers nothing. No key or sender saved here reaches a mailbox until the deployment sets
          EMAIL_PROVIDER to brevo or resend and restarts.
        {:else}
          Mail is carried by {variables.providerLabel}.
        {/if}
      </p>

      <div class="field">
        <label class="field-label" for="email-from">Sending address</label>
        <input
          id="email-from"
          class="input"
          type="text"
          autocomplete="off"
          spellcheck="false"
          bind:value={variables.draft.from}
          aria-invalid={variables.errors.from ? 'true' : undefined}
          aria-describedby={variables.errors.from
            ? 'email-from-hint email-from-error'
            : 'email-from-hint'}
        />
        <p class="field-hint" id="email-from-hint">
          The address the provider has verified, with an optional display name, as in OVPCASSS PAR
          &lt;par@buksu.edu.ph&gt;.
        </p>
        {#if variables.errors.from}
          <p class="field-error" id="email-from-error">
            <AlertCircle size={16} aria-hidden="true" />
            {variables.errors.from}
          </p>
        {/if}
      </div>

      <div class="field">
        <label class="field-label" for="email-api-key">API key</label>
        <input
          id="email-api-key"
          class="input"
          type="password"
          autocomplete="off"
          spellcheck="false"
          placeholder={variables.keySaved
            ? 'Leave blank to keep the saved key'
            : 'Enter the API key'}
          bind:value={variables.draft.apiKey}
          aria-invalid={variables.errors.apiKey ? 'true' : undefined}
          aria-describedby={variables.errors.apiKey
            ? 'email-api-key-hint email-api-key-error'
            : 'email-api-key-hint'}
        />
        <p class="field-hint" id="email-api-key-hint">
          {#if variables.keySaved}
            A key ending {variables.saved?.apiKeyHint} is set. Only its last four characters are shown.
          {:else}
            No key is saved yet. The key stays on the server and is never shown in full.
          {/if}
        </p>
        {#if variables.errors.apiKey}
          <p class="field-error" id="email-api-key-error">
            <AlertCircle size={16} aria-hidden="true" />
            {variables.errors.apiKey}
          </p>
        {/if}
      </div>

      {#if variables.saveError}
        <p class="form-alert" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          {variables.saveError}
        </p>
      {/if}

      <div class="actions">
        <button class="btn btn-primary" type="submit" disabled={variables.saving}>
          {#if variables.saving}
            <LoaderCircle class="spin" size={16} aria-hidden="true" />
            Saving…
          {:else}
            Save variables
          {/if}
        </button>
      </div>
    </form>

    <form class="card settings-form" novalidate onsubmit={testSubmit}>
      <div class="card-head">
        <h2>Test delivery</h2>
        <p>
          Send one message through the values in use. It goes out now, and no report or receipt is
          created by it.
        </p>
      </div>

      <div class="field">
        <label class="field-label" for="email-test-to">Send a test to</label>
        <input
          id="email-test-to"
          class="input"
          type="email"
          autocomplete="off"
          spellcheck="false"
          bind:value={variables.testTo}
          aria-invalid={variables.testFieldError ? 'true' : undefined}
          aria-describedby={variables.testFieldError
            ? 'email-test-to-hint email-test-to-error'
            : 'email-test-to-hint'}
        />
        <p class="field-hint" id="email-test-to-hint">
          {#if variables.unsavedChanges}
            Save the variables first. The test sends the sending address and key that are saved.
          {:else if variables.saved?.source === 'environment'}
            No pair is saved yet, so the test uses the deployment variables.
          {:else}
            Only this address receives the message.
          {/if}
        </p>
        {#if variables.testFieldError}
          <p class="field-error" id="email-test-to-error">
            <AlertCircle size={16} aria-hidden="true" />
            {variables.testFieldError}
          </p>
        {/if}
      </div>

      {#if variables.testSummary}
        <p class="test-note" role="status">{variables.testSummary}</p>
      {/if}

      {#if variables.testError}
        <p class="form-alert" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          {variables.testError}
        </p>
      {/if}

      <div class="actions">
        <button
          class="btn btn-outline"
          type="submit"
          disabled={variables.testing || variables.unsavedChanges}
        >
          {#if variables.testing}
            <LoaderCircle class="spin" size={16} aria-hidden="true" />
            Sending…
          {:else}
            Send test message
          {/if}
        </button>
      </div>
    </form>
  {/if}
{/if}

<style>
  .page-head {
    margin-bottom: 16px;
  }

  .page-head h1 {
    letter-spacing: -0.01em;
    margin: 0;
  }

  .page-head p {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 4px 0 0;
  }

  .settings-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
    margin-bottom: 16px;
    max-width: 720px;
    padding: 24px;
  }

  .card-head h2 {
    margin: 0;
  }

  .card-head p {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 4px 0 0;
  }

  .source-note {
    background: var(--surface-page);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
    padding: 8px 12px;
  }

  .source-note.is-saved {
    background: var(--primary-subtle);
    border-color: transparent;
    color: var(--text-primary);
  }

  .form-alert {
    align-items: flex-start;
    display: flex;
    gap: 6px;
    margin: 0;
  }

  .test-note {
    background: var(--primary-subtle);
    border-radius: var(--radius-card);
    color: var(--text-primary);
    font-size: 13px;
    margin: 0;
    padding: 10px 12px;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
  }

  .skeleton-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 720px;
    padding: 24px;
  }
</style>
