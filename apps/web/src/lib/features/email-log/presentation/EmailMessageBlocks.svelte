<script lang="ts">
  import { Plus, Trash2 } from '@lucide/svelte';

  import type { EmailTemplateCopy, EmailTemplateDetail, EmailTemplateIssue } from '@par/shared';

  import { createFieldTracker } from '../application/email-field-tracker';
  import { branchLabel, issueFor, tokenExample } from '../application/email-template-draft';
  import EmailTokenMenu from './EmailTokenMenu.svelte';

  let {
    detail,
    draft,
    issues,
  }: {
    detail: EmailTemplateDetail;
    draft: EmailTemplateCopy;
    issues: readonly EmailTemplateIssue[];
  } = $props();

  const { track, insert } = createFieldTracker();
  const urlTokens = $derived(detail.tokens.filter((option) => option.token.endsWith('Url')));

  function addRow() {
    if (!draft.facts || draft.facts.rows.length >= 6) return;
    draft.facts.rows.push({
      label: '',
      value: detail.tokens[0] ? `{{${detail.tokens[0].token}}}` : '',
    });
  }
</script>

{#if detail.hasFacts && draft.facts}
  {@const factsBlock = draft.facts}
  <section class="block">
    <div class="block-head">
      <h3>Facts</h3>
      <label class="switch-line">
        <span>Show this block</span>
        <input type="checkbox" role="switch" bind:checked={factsBlock.enabled} />
      </label>
    </div>

    {#if factsBlock.enabled}
      {#if detail.factsSource === 'failures'}
        <p class="block-note">
          The rows are built when the digest is sent, one per failed message, so they are not edited
          here.
        </p>
      {:else}
        {#each factsBlock.rows as row, index (index)}
          <div class="fact-row">
            <input
              class="input"
              type="text"
              aria-label="Row label"
              placeholder="Label"
              bind:value={row.label}
              aria-invalid={issueFor(issues, `facts.${index}.label`) ? 'true' : undefined}
            />
            <select class="select" aria-label="Row value" bind:value={row.value}>
              {#each detail.tokens as option (option.token)}
                <option value={`{{${option.token}}}`}>
                  {option.label} — {tokenExample(option.example)}
                </option>
              {/each}
            </select>
            <button
              class="btn btn-ghost btn-sm"
              type="button"
              aria-label={`Remove the ${row.label || 'row'} row`}
              onclick={() => factsBlock.rows.splice(index, 1)}
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
          {#if issueFor(issues, `facts.${index}.value`)}
            <p class="field-error">{issueFor(issues, `facts.${index}.value`)}</p>
          {/if}
        {/each}

        {#if issueFor(issues, 'facts')}
          <p class="field-error">{issueFor(issues, 'facts')}</p>
        {/if}

        {#if factsBlock.rows.length < 6}
          <button class="btn btn-outline btn-sm add" type="button" onclick={addRow}>
            <Plus size={14} aria-hidden="true" /> Add row
          </button>
        {/if}
      {/if}
    {/if}
  </section>
{/if}

{#if detail.hasQuote && draft.quote}
  {@const quoteBlock = draft.quote}
  <section class="block">
    <div class="block-head">
      <h3>Comment quote</h3>
      <label class="switch-line">
        <span>Show this block</span>
        <input type="checkbox" role="switch" bind:checked={quoteBlock.enabled} />
      </label>
    </div>

    {#if quoteBlock.enabled}
      <div class="field">
        <div class="field-head">
          <label class="field-label" for="copy-quote-label">Label</label>
          <EmailTokenMenu
            tokens={detail.tokens}
            oninsert={(token) => insert('quote-label', token)}
          />
        </div>
        <input
          id="copy-quote-label"
          class="input"
          type="text"
          bind:value={quoteBlock.label}
          use:track={'quote-label'}
        />
      </div>
      <div class="field">
        <div class="field-head">
          <label class="field-label" for="copy-quote-body">Quoted text</label>
          <EmailTokenMenu
            tokens={detail.tokens}
            oninsert={(token) => insert('quote-body', token)}
          />
        </div>
        <textarea
          id="copy-quote-body"
          class="input body-input"
          rows="3"
          bind:value={quoteBlock.body}
          use:track={'quote-body'}
          aria-invalid={issueFor(issues, 'quote.body') ? 'true' : undefined}></textarea>
        {#if issueFor(issues, 'quote.body')}
          <p class="field-error">{issueFor(issues, 'quote.body')}</p>
        {/if}
      </div>
    {/if}
  </section>
{/if}

{#if detail.hasAction && draft.action}
  {@const actionBlock = draft.action}
  <section class="block">
    <div class="block-head">
      <h3>Button</h3>
      <label class="switch-line">
        <span>Show this block</span>
        <input type="checkbox" role="switch" bind:checked={actionBlock.enabled} />
      </label>
    </div>

    {#if actionBlock.enabled}
      {#each actionBlock.variants as variant, index (index)}
        <div class="action-row">
          <div class="field">
            <div class="field-head">
              <label class="field-label" for={`copy-action-${index}`}>
                Label
                <span class="branch-chip">{branchLabel(detail.branches, variant.when)}</span>
              </label>
              <EmailTokenMenu
                tokens={detail.tokens}
                oninsert={(token) => insert(`action-${index}`, token)}
              />
            </div>
            <input
              id={`copy-action-${index}`}
              class="input"
              type="text"
              bind:value={variant.label}
              use:track={`action-${index}`}
              aria-invalid={issueFor(issues, `action.${index}.label`) ? 'true' : undefined}
            />
          </div>
          <div class="field">
            <label class="field-label" for={`copy-action-url-${index}`}>Link</label>
            <select id={`copy-action-url-${index}`} class="select" bind:value={variant.urlToken}>
              {#each urlTokens as option (option.token)}
                <option value={`{{${option.token}}}`}>{option.label}</option>
              {/each}
            </select>
          </div>
        </div>
      {/each}
    {/if}
  </section>
{/if}

<section class="block">
  <div class="block-head">
    <h3>Footer</h3>
    <label class="switch-line">
      <span>Show this block</span>
      <input type="checkbox" role="switch" bind:checked={draft.footer.enabled} />
    </label>
  </div>

  {#if draft.footer.enabled}
    <div class="field">
      <div class="field-head">
        <label class="field-label" for="copy-footer-reference">Reference line</label>
        <EmailTokenMenu
          tokens={detail.tokens}
          oninsert={(token) => insert('footer-reference', token)}
        />
      </div>
      <input
        id="copy-footer-reference"
        class="input"
        type="text"
        bind:value={draft.footer.reference}
        use:track={'footer-reference'}
      />
    </div>
    <div class="field">
      <div class="field-head">
        <label class="field-label" for="copy-footer-note">Note</label>
        <EmailTokenMenu tokens={detail.tokens} oninsert={(token) => insert('footer-note', token)} />
      </div>
      <input
        id="copy-footer-note"
        class="input"
        type="text"
        bind:value={draft.footer.note}
        use:track={'footer-note'}
      />
    </div>
  {/if}

  <label class="switch-line">
    <span>Reply notice</span>
    <input type="checkbox" role="switch" bind:checked={draft.footer.replyNotice} />
  </label>
  <p class="field-hint">
    The notice tells the recipient that replies reach the office. The signature block below it is
    part of the office's format.
  </p>
</section>

<style>
  .field {
    margin-bottom: 16px;
  }

  .field:last-child {
    margin-bottom: 0;
  }

  .field-head {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .body-input {
    font-family: inherit;
    line-height: 1.5;
    min-height: 72px;
    resize: vertical;
  }

  .branch-chip {
    background: var(--primary-subtle);
    border-radius: 4px;
    color: var(--text-secondary);
    font-size: 10px;
    font-weight: 500;
    margin-left: 6px;
    padding: 1px 6px;
  }

  .block {
    border-top: 1px solid var(--border);
    margin-top: 20px;
    padding-top: 16px;
  }

  .block-head {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .block-head h3 {
    margin: 0;
  }

  .block-note {
    color: var(--text-secondary);
    flex-basis: 100%;
    font-size: 12px;
    margin: 0 0 8px;
  }

  .switch-line {
    align-items: center;
    color: var(--text-secondary);
    display: inline-flex;
    font-size: 12px;
    gap: 8px;
  }

  .switch-line input {
    accent-color: var(--brand-navy-800);
    height: 18px;
    width: 18px;
  }

  .fact-row {
    display: grid;
    gap: 8px;
    grid-template-columns: minmax(120px, 1fr) minmax(160px, 1.4fr) auto;
    margin-bottom: 8px;
  }

  .action-row {
    display: grid;
    gap: 8px;
    grid-template-columns: 1.4fr 1fr;
    margin-bottom: 8px;
  }

  .action-row .field {
    margin-bottom: 0;
  }

  .add {
    margin-top: 4px;
  }
</style>
