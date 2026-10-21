<script lang="ts">
  import type { ReportType } from '@par/shared';

  let {
    schoolYears,
    semesters,
    type = $bindable(),
    schoolYear = $bindable(),
    semester = $bindable(),
    includeInProgress = $bindable(),
    previewLoading = false,
    canDownload = false,
    downloading = false,
    ondownload,
    ontemplate,
    onsend,
  }: {
    schoolYears: readonly string[];
    semesters: readonly { value: 1 | 2; label: string }[];
    type: ReportType;
    schoolYear: string;
    semester: 1 | 2;
    includeInProgress: boolean;
    previewLoading?: boolean;
    canDownload?: boolean;
    downloading?: boolean;
    ondownload: () => void;
    ontemplate: () => void;
    onsend: () => void;
  } = $props();

  const TYPE_OPTIONS = [
    { value: 'OFF_CAMPUS', label: 'Off-campus' },
    { value: 'EDUCATIONAL_TOUR', label: 'Educational tour' },
    { value: 'IN_CAMPUS', label: 'In-campus' },
  ] as const;

  function onYearChange() {
    const first = semesters[0];
    if (first) semester = first.value;
  }
</script>

<div class="card form-card">
  <fieldset class="field type-field">
    <legend class="field-label">Monitoring sheet</legend>
    <div class="type-options">
      {#each TYPE_OPTIONS as option (option.value)}
        <label class="radio-label">
          <input type="radio" bind:group={type} value={option.value} />
          {option.label}
        </label>
      {/each}
    </div>
  </fieldset>

  <div class="field">
    <label class="field-label" for="export-year">School year</label>
    <select
      id="export-year"
      class="select"
      bind:value={schoolYear}
      onchange={onYearChange}
      disabled={schoolYears.length === 0}
    >
      {#each schoolYears as year (year)}
        <option value={year}>{year}</option>
      {/each}
    </select>
  </div>

  <div class="field">
    <label class="field-label" for="export-semester">Semester</label>
    <select
      id="export-semester"
      class="select"
      bind:value={semester}
      disabled={semesters.length === 0}
    >
      {#each semesters as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </div>

  <div class="field checkbox-field">
    <label class="checkbox-label" for="export-in-progress">
      <input id="export-in-progress" type="checkbox" bind:checked={includeInProgress} />
      Include in-progress reports
    </label>
    <p class="field-hint">Adds submitted and endorsed reports with Date Completed blank.</p>
  </div>

  <div class="actions">
    <button class="btn btn-outline" type="button" onclick={ontemplate} disabled={downloading}>
      Blank template
    </button>
    <button
      class="btn btn-outline"
      type="button"
      onclick={onsend}
      disabled={!canDownload || downloading || previewLoading}
    >
      Send by email
    </button>
    <button
      class="btn btn-primary"
      type="button"
      onclick={ondownload}
      disabled={!canDownload || downloading || previewLoading}
    >
      {downloading ? 'Preparing…' : 'Review & download'}
    </button>
  </div>
</div>

<style>
  .form-card {
    align-items: end;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    padding: 16px;
  }

  .field {
    min-width: 180px;
  }

  .type-field {
    border: 0;
    margin: 0;
    padding: 0;
  }

  .type-field .field-label {
    margin-bottom: 8px;
    padding: 0;
  }

  .type-options {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    min-height: 32px;
  }

  .radio-label {
    align-items: center;
    display: inline-flex;
    font-size: 13px;
    gap: 6px;
  }

  .checkbox-field {
    min-width: 260px;
  }

  .checkbox-label {
    align-items: center;
    display: flex;
    font-size: 13px;
    gap: 8px;
  }

  .actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }

  @media (max-width: 1279px) {
    .form-card {
      align-items: stretch;
    }

    .actions {
      margin-left: 0;
    }
  }
</style>
