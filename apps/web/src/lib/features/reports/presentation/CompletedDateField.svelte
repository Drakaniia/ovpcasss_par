<script lang="ts">
  import type { ReportDetail } from '@par/shared';

  import { api } from '$lib/api/client';
  import DatePicker from '$lib/components/DatePicker.svelte';
  import { formatLongDate } from '$lib/format/datetime';
  import { toast } from '$lib/toast/toast.svelte';

  let {
    detail,
    onchanged,
  }: {
    detail: ReportDetail;
    onchanged: () => void | Promise<void>;
  } = $props();

  /**
   * `YYYY-MM-DD`. Empty means the sheet prints the approval date. Editing
   * overrides the record's value; reloading the record restores the saved one.
   */
  let completedOn = $derived(detail.completedOn ?? '');
  let saving = $state(false);
  let failure = $state('');

  const changed = $derived(completedOn !== (detail.completedOn ?? ''));

  async function save(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!changed || saving) return;

    saving = true;
    failure = '';

    try {
      await api.reports.setCompletedDate(detail.id, completedOn || null, detail.version);
      toast.success('Date completed saved.');
      await onchanged();
    } catch {
      failure = 'The date was not saved. Try again.';
    } finally {
      saving = false;
    }
  }
</script>

<form class="completed-date" onsubmit={(event) => void save(event)}>
  <label class="field-label" for="date-completed">Date completed</label>

  <DatePicker
    id="date-completed"
    label="Date completed"
    value={completedOn}
    disabled={saving}
    dense
    onchange={(iso) => (completedOn = iso)}
  />

  <button class="btn btn-primary btn-sm" type="submit" disabled={saving || !changed}>
    {saving ? 'Saving…' : 'Save'}
  </button>

  <p class="hint">
    {#if completedOn}
      The monitoring sheet prints {formatLongDate(completedOn)}.
    {:else if detail.approvedAt}
      Blank prints the approval date, {formatLongDate(detail.approvedAt)}.
    {:else}
      Blank prints the approval date.
    {/if}
  </p>

  {#if failure}
    <p class="field-error" role="alert">{failure}</p>
  {/if}
</form>

<style>
  .completed-date {
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 4px;
    padding-top: 10px;
  }

  .field-label {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 500;
  }

  .btn {
    align-self: flex-start;
  }

  .hint {
    color: var(--text-secondary);
    font-size: 11px;
    margin: 0;
  }
</style>
