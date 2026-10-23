<script lang="ts">
  import type { ReportStatus, Role } from '@par/shared';
  import { AlertCircle } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { page } from '$app/state';

  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import DatePicker from '$lib/components/DatePicker.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import NextStepStrip from '$lib/components/NextStepStrip.svelte';
  import SkeletonDocument from '$lib/components/SkeletonDocument.svelte';
  import SkeletonTable from '$lib/components/SkeletonTable.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import { ROLE_LABELS } from '$lib/navigation/navigation';
  import { session } from '$lib/session/session.svelte';
  import { STATUS_PRESENTATION } from '$lib/status/report-status';
  import { toast } from '$lib/toast/toast.svelte';

  const STATUSES = Object.keys(STATUS_PRESENTATION) as ReportStatus[];

  const DEMO_NAMES: Record<Role, string> = {
    ADMIN: 'Paolo Cruz',
    PERSONNEL: 'Maria Santos',
  };

  let openDefault = $state(false);
  let openDestructive = $state(false);
  let retryCount = $state(0);
  let demoDate = $state('2026-03-15');

  function preview(role: Role) {
    session.user = {
      id: `demo-${role.toLowerCase()}`,
      fullName: DEMO_NAMES[role],
      email: `${role.toLowerCase()}@university.edu`,
      role,
      status: 'ACTIVE',
      campusUnit: 'College of Arts and Sciences',
      contactNumber: null,
      unreadNotifications: 3,
    };
  }

  function clearPreview() {
    session.user = null;
  }

  // Deep link for screenshots and quick checks: /dev/components?role=PERSONNEL.
  onMount(() => {
    const requested = new URLSearchParams(page.url.search).get('role')?.toUpperCase();
    if (requested && requested in ROLE_LABELS) preview(requested as Role);
  });
</script>

<svelte:head><title>Component gallery · OVPCASSS Paperless PAR</title></svelte:head>

<div class="gallery">
  <header>
    <h1>Component gallery</h1>
    <p class="lede">
      Development-only reference for the shell and shared primitives. Roles previewed here are not a
      sign-in.
    </p>
  </header>

  <section class="card section">
    <h2>Role-filtered shell</h2>
    <p class="hint">Sets the session placeholder so the header and section tabs update.</p>
    <div class="row">
      {#each Object.entries(ROLE_LABELS) as [role, label] (role)}
        <button class="btn btn-outline" type="button" onclick={() => preview(role as Role)}>
          {label}
        </button>
      {/each}
      <button class="btn btn-ghost" type="button" onclick={clearPreview}>Signed out</button>
    </div>
  </section>

  <section class="card section">
    <h2>Status badges</h2>
    <div class="row">
      {#each STATUSES as status (status)}
        <StatusBadge {status} />
      {/each}
    </div>
    <p class="hint">
      Text-only: {STATUSES.map((status) => STATUS_PRESENTATION[status].label).join(' · ')}
    </p>
  </section>

  <section class="card section">
    <h2>Next step</h2>
    <div class="stack">
      {#each STATUSES as status (status)}
        <NextStepStrip {status} completedAt="2026-03-20T01:00:00Z" />
      {/each}
    </div>
  </section>

  <section class="card section">
    <h2>Empty state</h2>
    <EmptyState
      title="No reports yet"
      description="Create a report to start the process."
      action={{ label: 'New record', href: '/reports/new' }}
    />
  </section>

  <section class="card section">
    <h2>Error states</h2>
    <ErrorState requestId="req_01HZX4K8Q2" onretry={() => (retryCount += 1)} backHref="/reports" />
    {#if retryCount > 0}
      <p class="hint">Retry pressed {retryCount} time(s).</p>
    {/if}
    <ErrorState variant="permission" requiredRole="ADMIN" />
    <ErrorState variant="not-found" />
  </section>

  <section class="card section">
    <h2>Tables</h2>
    <div class="table-scroll">
      <table class="data-table">
        <caption>Sample report rows</caption>
        <thead>
          <tr>
            <th scope="col" aria-sort="ascending">
              AR No. <span class="sort-indicator" aria-hidden="true">▲</span>
            </th>
            <th scope="col">Title</th>
            <th class="table-col-secondary" scope="col">Type</th>
            <th scope="col">Date</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="mono">OFF-2026-0001</td>
            <td>Marine survey in Batangas</td>
            <td class="table-col-secondary">Off campus</td>
            <td class="mono">14 Mar 2026</td>
            <td><StatusBadge status="SUBMITTED" /></td>
          </tr>
          <tr style="background: var(--row-selected)">
            <td class="mono">EDU-2026-0002</td>
            <td>Educational tour to the National Museum</td>
            <td class="table-col-secondary">Educational tour</td>
            <td class="mono">12 Mar 2026</td>
            <td><StatusBadge status="RETURNED" /></td>
          </tr>
          <tr>
            <td class="mono">INC-2026-0003</td>
            <td>Lecture series on coastal management</td>
            <td class="table-col-secondary">In campus</td>
            <td class="num">120</td>
            <td><StatusBadge status="APPROVED" /></td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 class="subhead">Skeleton table</h3>
    <SkeletonTable />
  </section>

  <section class="card section">
    <h2>Form styles</h2>
    <form class="form" onsubmit={(event) => event.preventDefault()}>
      <div class="error-summary">
        <a href="#demo-title">Enter the activity title.</a>
      </div>
      <div class="field">
        <label class="field-label" for="demo-title">
          <span>Activity title</span>
        </label>
        <input
          class="input"
          id="demo-title"
          aria-invalid="true"
          aria-describedby="demo-title-error"
          value=""
        />
        <p class="field-error" id="demo-title-error">
          <AlertCircle size={16} aria-hidden="true" />
          Enter the activity title.
        </p>
      </div>
      <div class="field">
        <label class="field-label" for="demo-notes">
          <span>Notes</span>
          <span class="field-optional">Optional</span>
        </label>
        <textarea class="textarea" id="demo-notes"></textarea>
        <p class="field-hint">Format: DD MMM YYYY</p>
      </div>
      <div class="row">
        <button class="btn btn-primary" type="submit">Save</button>
        <button class="btn btn-outline" type="button">Cancel</button>
      </div>
    </form>
  </section>

  <section class="card section">
    <h2>Date picker</h2>
    <p class="hint">Type DD MMM YYYY or open the calendar. Esc closes; arrows move days.</p>
    <div class="field">
      <label class="field-label" for="demo-date">Activity date</label>
      <DatePicker
        id="demo-date"
        label="Activity date"
        value={demoDate}
        onchange={(iso) => (demoDate = iso)}
      />
    </div>
  </section>

  <section class="card section">
    <h2>Document skeleton</h2>
    <SkeletonDocument />
  </section>

  <section class="card section">
    <h2>Dialogs and toasts</h2>
    <div class="row">
      <button class="btn btn-outline" type="button" onclick={() => (openDefault = true)}>
        Open confirm dialog
      </button>
      <button class="btn btn-outline" type="button" onclick={() => (openDestructive = true)}>
        Open destructive dialog
      </button>
      <button class="btn btn-outline" type="button" onclick={() => toast.success('Report saved.')}>
        Success toast
      </button>
      <button
        class="btn btn-outline"
        type="button"
        onclick={() => toast.error('The report could not be saved.')}>Error toast</button
      >
    </div>
  </section>

  <section class="card section">
    <h2>Keyboard</h2>
    <p class="hint">
      Press <kbd class="kbd">/</kbd> to focus search, <kbd class="kbd">?</kbd> for the keyboard
      shortcut help, <kbd class="kbd">Ctrl</kbd> + <kbd class="kbd">K</kbd> for the command palette,
      and <kbd class="kbd">Esc</kbd> to close the topmost layer.
    </p>
  </section>
</div>

<ConfirmDialog
  bind:open={openDefault}
  title="Submit this report?"
  description="The narrative will be sent to OVPCASSS for checking. The AR No. is already issued."
  confirmLabel="Submit report"
/>
<ConfirmDialog
  bind:open={openDestructive}
  title="Delete draft “Marine survey”?"
  description="The draft and its attachments will be removed from this device."
  confirmLabel="Delete draft"
  tone="destructive"
/>

<style>
  .gallery {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .lede {
    color: var(--text-secondary);
    margin: 4px 0 0;
    max-width: 72ch;
  }

  .section {
    padding: 24px;
  }

  .section h2 {
    margin: 0 0 12px;
  }

  .subhead {
    margin: 24px 0 8px;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .hint {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 12px 0 0;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 480px;
  }
</style>
