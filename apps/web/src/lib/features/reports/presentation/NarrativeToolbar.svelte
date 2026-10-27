<script lang="ts">
  import { Bold, Heading1, Heading2, Italic, List, ListOrdered, Underline } from '@lucide/svelte';

  import type { NarrativeCommand } from '../application/narrative-editor';

  /**
   * The formatting toolbar (report 7). Each button formats the selected text
   * directly on the narrative surface, so the page shows the result at once and
   * no Markdown marker is ever typed.
   */
  let {
    oncommand,
    disabled = false,
  }: {
    oncommand: (command: NarrativeCommand) => void;
    disabled?: boolean;
  } = $props();

  const COMMANDS: readonly { id: NarrativeCommand; label: string; icon: typeof Bold }[] = [
    { id: 'h1', label: 'Heading 1', icon: Heading1 },
    { id: 'h2', label: 'Heading 2', icon: Heading2 },
    { id: 'bold', label: 'Bold', icon: Bold },
    { id: 'italic', label: 'Italic', icon: Italic },
    { id: 'underline', label: 'Underline', icon: Underline },
    { id: 'bullet', label: 'Bulleted list', icon: List },
    { id: 'number', label: 'Numbered list', icon: ListOrdered },
  ];

  function preventBlur(event: MouseEvent): void {
    // Keeping the textarea focused preserves its selection for the command.
    event.preventDefault();
  }
</script>

<div class="toolbar" role="toolbar" aria-label="Narrative formatting">
  {#each COMMANDS as command (command.id)}
    {@const Icon = command.icon}
    <button
      class="tool"
      type="button"
      {disabled}
      aria-label={command.label}
      title={command.label}
      onmousedown={preventBlur}
      onclick={() => oncommand(command.id)}
    >
      <Icon size={15} aria-hidden="true" />
    </button>
  {/each}
</div>

<style>
  .toolbar {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
  }

  .tool {
    align-items: center;
    background: transparent;
    border-radius: var(--radius-card);
    color: var(--text-secondary);
    display: inline-flex;
    height: 30px;
    justify-content: center;
    width: 30px;
  }

  .tool:hover:not(:disabled) {
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .tool:disabled {
    opacity: 0.45;
  }
</style>
