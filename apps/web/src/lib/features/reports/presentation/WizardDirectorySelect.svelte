<script lang="ts">
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import EditableSelect from '$lib/components/EditableSelect.svelte';
  import {
    createDirectoryEntry,
    removeDirectoryEntry,
    renameDirectoryEntry,
    restoreDirectoryEntry,
    sortDirectory,
    upsertDirectoryEntry,
    type DirectoryEntity,
    type DirectoryEntry,
  } from '$lib/features/admin/application/directory-entries';
  import { toast } from '$lib/toast/toast.svelte';

  import WizardField from './WizardField.svelte';

  /**
   * Department and Office (UI phase 06 §3). The list is the office's official
   * list: an admin may add a missing entry, rename one, or remove one from the
   * dropdown itself, and the form keeps the plain name so a report saved before
   * a rename still reads correctly. Anyone else may type a value the list does
   * not hold, which is what "Other (specify)" used to be.
   */
  let {
    id,
    label,
    value,
    entity,
    entries,
    error,
    optional = false,
    flagged = false,
    disabled = false,
    canManage = false,
    canRemove = false,
    confirmManage = false,
    onchange,
    onentrieschange,
  }: {
    id: string;
    label: string;
    value: string;
    entity: DirectoryEntity;
    entries: readonly DirectoryEntry[];
    error?: string;
    optional?: boolean;
    flagged?: boolean;
    disabled?: boolean;
    /** The signed-in account may add or rename entries in the official list. */
    canManage?: boolean;
    /** Only administrators may remove entries from the official list. */
    canRemove?: boolean;
    confirmManage?: boolean;
    onchange: (value: string) => void;
    onentrieschange?: (entity: DirectoryEntity, entries: readonly DirectoryEntry[]) => void;
  } = $props();

  let pending = $state<{
    title: string;
    description: string;
    confirmLabel: string;
    run: () => Promise<void>;
    resolve: (err?: unknown) => void;
  } | null>(null);

  function askConfirm(
    title: string,
    description: string,
    confirmLabel: string,
    run: () => Promise<void>,
  ): Promise<void> {
    if (!confirmManage) return run();
    return new Promise((resolve, reject) => {
      pending = {
        title,
        description,
        confirmLabel,
        run,
        resolve: (err) => (err ? reject(err) : resolve()),
      };
    });
  }

  const options = $derived(
    sortDirectory(entries).map((entry) => ({
      value: entry.name,
      label: entry.isActive ? entry.name : `${entry.name} (inactive)`,
    })),
  );

  function publish(entry: DirectoryEntry): void {
    if (!onentrieschange) return;
    onentrieschange(entity, sortDirectory(upsertDirectoryEntry(entries, entry)));
  }

  async function create(name: string): Promise<void> {
    await askConfirm(
      `Add ${label.toLowerCase()}`,
      `Add "${name.trim()}" to the shared ${label.toLowerCase()} list?`,
      'Add entry',
      async () => {
        const entry = await createDirectoryEntry(entity, name, entries);
        publish(entry);
        onchange(entry.name);
      },
    );
  }

  async function rename(current: string, name: string): Promise<void> {
    const target = entries.find((entry) => entry.name === current);
    if (!target) throw new Error('That entry is no longer in the list.');

    await askConfirm(
      `Update ${label.toLowerCase()}`,
      `Rename "${current}" to "${name.trim()}" in the shared ${label.toLowerCase()} list?`,
      'Save change',
      async () => {
        const entry = await renameDirectoryEntry(entity, target, name);
        publish(entry);
        if (value === current) onchange(entry.name);
      },
    );
  }

  async function remove(name: string): Promise<void> {
    const target = entries.find((entry) => entry.name === name);
    if (!target) throw new Error('That entry is no longer in the list.');

    const entry = await removeDirectoryEntry(entity, target);
    publish(entry);
    toast.success(`${label} removed`, {
      action: { label: 'Undo', run: () => void restore(entry) },
    });
  }

  async function restore(entry: DirectoryEntry): Promise<void> {
    try {
      publish(await restoreDirectoryEntry(entity, entry));
      toast.success(`${label} restored`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The entry was not restored.');
    }
  }

  const manage = $derived(
    canManage && onentrieschange
      ? {
          onCreate: create,
          onRename: rename,
          ...(canRemove ? { onRemove: remove } : {}),
        }
      : undefined,
  );
</script>

<ConfirmDialog
  open={Boolean(pending)}
  title={pending?.title ?? ''}
  description={pending?.description ?? ''}
  confirmLabel={pending?.confirmLabel ?? 'Confirm'}
  onconfirm={() => {
    const job = pending;
    pending = null;
    if (!job) return;
    void job.run().then(
      () => job.resolve(),
      (err) => job.resolve(err),
    );
  }}
  oncancel={() => {
    const job = pending;
    pending = null;
    job?.resolve();
  }}
/>

<WizardField {id} {label} {error} {optional} {flagged}>
  {#snippet children({ describedBy, invalid })}
    <EditableSelect
      {id}
      {label}
      {value}
      {options}
      {describedBy}
      {invalid}
      {disabled}
      allowCustom
      emptyMessage="No entries yet. Type a name to add one."
      {manage}
      {onchange}
    />
  {/snippet}
</WizardField>
