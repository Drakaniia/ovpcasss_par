<script lang="ts">
  import type { EmailTemplateCopy, EmailTemplateDetail, EmailTemplateIssue } from '@par/shared';

  import EmailMessageBlocks from './EmailMessageBlocks.svelte';
  import EmailMessageFields from './EmailMessageFields.svelte';

  let {
    detail,
    draft,
    issues,
  }: {
    detail: EmailTemplateDetail;
    draft: EmailTemplateCopy;
    issues: readonly EmailTemplateIssue[];
  } = $props();
</script>

{#if issues.length > 0}
  <div class="issue-summary" id="message-issues" tabindex="-1" role="alert">
    <p class="issue-title">
      {issues.length === 1 ? 'One field needs attention' : `${issues.length} fields need attention`}
    </p>
    <ul>
      {#each issues as issue, index (index)}
        <li>
          {issue.message}
          <span class="issue-path">{issue.path}</span>
        </li>
      {/each}
    </ul>
  </div>
{/if}

<EmailMessageFields {detail} {draft} {issues} />
<EmailMessageBlocks {detail} {draft} {issues} />

<p class="fixed-note">
  The header, the university signature block, and the <span class="tag-chip">[OVPCASSS PAR]</span>
  subject tag are part of the office's format and are not editable.
</p>

<style>
  .issue-summary {
    background: var(--status-danger-bg);
    border: 1px solid var(--status-danger-fg);
    border-radius: var(--radius-card);
    margin-bottom: 16px;
    padding: 12px 14px;
  }

  .issue-summary:focus-visible {
    outline: 2px solid var(--brand-navy-800);
    outline-offset: 2px;
  }

  .issue-title {
    color: var(--status-danger-fg);
    font-size: 13px;
    font-weight: 600;
    margin: 0 0 4px;
  }

  .issue-summary ul {
    margin: 0;
    padding-left: 18px;
  }

  .issue-summary li {
    font-size: 12px;
    margin: 2px 0;
  }

  .issue-path {
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: 10px;
    margin-left: 4px;
  }

  .fixed-note {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 20px 0 0;
  }

  .tag-chip {
    background: var(--status-neutral-bg);
    border-radius: 4px;
    color: var(--status-neutral-fg);
    font-family: var(--font-mono);
    font-size: 11px;
    padding: 1px 5px;
  }
</style>
