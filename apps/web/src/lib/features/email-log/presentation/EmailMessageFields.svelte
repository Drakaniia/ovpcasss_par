<script lang="ts">
  import { Plus, Trash2 } from '@lucide/svelte';

  import type { EmailTemplateCopy, EmailTemplateDetail, EmailTemplateIssue } from '@par/shared';

  import { createFieldTracker } from '../application/email-field-tracker';
  import {
    branchIndex,
    branchLabel,
    issueFor,
    subjectRemaining,
  } from '../application/email-template-draft';
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

  const subjectLeft = $derived(subjectRemaining(draft.subject));
  const branchRows = $derived(
    detail.branches.map((branch) => ({ branch, index: branchIndex(draft, branch.key) })),
  );
  const plainRows = $derived(
    draft.intro.flatMap((paragraph, index) =>
      paragraph.when === null ? [{ paragraph, index }] : [],
    ),
  );

  function addParagraph() {
    if (draft.intro.filter((paragraph) => paragraph.when === null).length >= 6) return;
    draft.intro.push({ text: '', when: null });
  }
</script>

<div class="field">
  <div class="field-head">
    <label class="field-label" for="copy-subject">Subject</label>
    <div class="field-tools">
      <span class="count" class:is-short={subjectLeft < 0}>{subjectLeft} characters left</span>
      <EmailTokenMenu tokens={detail.tokens} oninsert={(token) => insert('subject', token)} />
    </div>
  </div>
  <div class="subject-line">
    <span class="tag-chip" aria-label="The office subject tag, not editable">[OVPCASSS PAR]</span>
    <input
      id="copy-subject"
      class="input"
      type="text"
      autocomplete="off"
      bind:value={draft.subject}
      use:track={'subject'}
      aria-invalid={issueFor(issues, 'subject') ? 'true' : undefined}
      aria-describedby={issueFor(issues, 'subject') ? 'copy-subject-error' : undefined}
    />
  </div>
  {#if issueFor(issues, 'subject')}
    <p class="field-error" id="copy-subject-error">{issueFor(issues, 'subject')}</p>
  {/if}
</div>

<div class="field">
  <div class="field-head">
    <label class="field-label" for="copy-heading">Heading</label>
    <EmailTokenMenu tokens={detail.tokens} oninsert={(token) => insert('heading', token)} />
  </div>
  <input
    id="copy-heading"
    class="input"
    type="text"
    autocomplete="off"
    bind:value={draft.heading}
    use:track={'heading'}
    aria-invalid={issueFor(issues, 'heading') ? 'true' : undefined}
  />
  {#if issueFor(issues, 'heading')}
    <p class="field-error">{issueFor(issues, 'heading')}</p>
  {/if}
</div>

<div class="field">
  <label class="field-label" for="copy-greeting">Greeting</label>
  <input
    id="copy-greeting"
    class="input"
    type="text"
    autocomplete="off"
    bind:value={draft.greeting}
    aria-invalid={issueFor(issues, 'greeting') ? 'true' : undefined}
  />
  <p class="field-hint">
    The first line of the message. The hidden inbox preview follows the first body paragraph.
  </p>
  {#if issueFor(issues, 'greeting')}
    <p class="field-error">{issueFor(issues, 'greeting')}</p>
  {/if}
</div>

<section class="block">
  <div class="block-head">
    <h3>Body</h3>
    <p class="block-note">One paragraph per case. Only the case that applies is sent.</p>
  </div>

  {#each branchRows as row (row.branch.key)}
    {#if row.index >= 0}
      <div class="field">
        <div class="field-head">
          <label class="field-label" for={`intro-${row.index}`}>
            {branchLabel(detail.branches, row.branch.key)}
            <span class="branch-chip">{row.branch.label}</span>
          </label>
          <EmailTokenMenu
            tokens={detail.tokens}
            oninsert={(token) => insert(`intro-${row.index}`, token)}
          />
        </div>
        <textarea
          id={`intro-${row.index}`}
          class="input body-input"
          rows="3"
          bind:value={draft.intro[row.index].text}
          use:track={`intro-${row.index}`}
          aria-invalid={issueFor(issues, `intro.${row.index}.text`) ? 'true' : undefined}
        ></textarea>
        {#if issueFor(issues, `intro.${row.index}.text`)}
          <p class="field-error">{issueFor(issues, `intro.${row.index}.text`)}</p>
        {/if}
      </div>
    {/if}
  {/each}

  {#each plainRows as row (row.index)}
    <div class="field">
      <div class="field-head">
        <label class="field-label" for={`intro-${row.index}`}>Body paragraph</label>
        <div class="field-tools">
          {#if plainRows.length > 1}
            <button
              class="btn btn-ghost btn-sm"
              type="button"
              aria-label="Remove this paragraph"
              onclick={() => draft.intro.splice(row.index, 1)}
            >
              <Trash2 size={14} aria-hidden="true" /> Remove
            </button>
          {/if}
          <EmailTokenMenu
            tokens={detail.tokens}
            oninsert={(token) => insert(`intro-${row.index}`, token)}
          />
        </div>
      </div>
      <textarea
        id={`intro-${row.index}`}
        class="input body-input"
        rows="3"
        bind:value={row.paragraph.text}
        use:track={`intro-${row.index}`}
        aria-invalid={issueFor(issues, `intro.${row.index}.text`) ? 'true' : undefined}></textarea>
      {#if issueFor(issues, `intro.${row.index}.text`)}
        <p class="field-error">{issueFor(issues, `intro.${row.index}.text`)}</p>
      {/if}
    </div>
  {/each}

  {#if plainRows.length < 6}
    <button class="btn btn-outline btn-sm add" type="button" onclick={addParagraph}>
      <Plus size={14} aria-hidden="true" /> Add paragraph
    </button>
  {/if}
  {#if issueFor(issues, 'intro')}
    <p class="field-error">{issueFor(issues, 'intro')}</p>
  {/if}
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

  .field-tools {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  .count {
    color: var(--text-secondary);
    font-size: 11px;
  }

  .count.is-short {
    color: var(--status-danger-fg);
  }

  .subject-line {
    align-items: stretch;
    display: flex;
    gap: 8px;
  }

  .subject-line .input {
    flex: 1;
  }

  .tag-chip {
    align-items: center;
    background: var(--status-neutral-bg);
    border-radius: 4px;
    color: var(--status-neutral-fg);
    display: inline-flex;
    flex: none;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.3px;
    padding: 0 8px;
    white-space: nowrap;
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

  .add {
    margin-top: 4px;
  }
</style>
