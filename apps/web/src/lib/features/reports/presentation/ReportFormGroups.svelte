<script lang="ts">
  import {
    FIELD_GROUPS,
    isReportFieldKey,
    type EditReferences,
    type ReportFieldKey,
  } from '../application/report-field-values';
  import { activeRequirements, completenessItems } from '../application/wizard-completeness';
  import type { WizardForm } from '../application/wizard-form';
  import { fieldDomId } from '../application/wizard-validation';
  import type { AttachmentItem } from '$lib/features/attachments/application/attachment-items';
  import AttachmentUploader from '$lib/features/attachments/presentation/AttachmentUploader.svelte';

  import CompletenessChecklist from './CompletenessChecklist.svelte';
  import WizardField from './WizardField.svelte';
  import WizardStepClassify from './WizardStepClassify.svelte';
  import WizardStepDetails from './WizardStepDetails.svelte';
  import WizardStepPeople from './WizardStepPeople.svelte';

  /**
   * One page, four fieldset groups in wizard order (UI spec §7.6). The controls
   * are the wizard's own components, so a returned report is edited with exactly
   * the fields, labels, and validation the submitter saw when authoring it.
   */
  let {
    form,
    references,
    errors,
    flagged,
    disabled = false,
    trackingNumber,
    attachments = $bindable(),
    reportId,
    labelOptions,
    onchange,
  }: {
    form: WizardForm;
    references: EditReferences;
    errors: Record<string, string>;
    /** Fields named in a return comment; only phase 07 sets this. */
    flagged?: ReadonlySet<ReportFieldKey>;
    disabled?: boolean;
    trackingNumber?: string | null;
    attachments: AttachmentItem[];
    reportId: string;
    labelOptions: readonly string[];
    onchange: (key: ReportFieldKey) => void;
  } = $props();

  const requiredForType = $derived(activeRequirements(references.requirements, form.type));
  const checklist = $derived(completenessItems(form, references.requirements, attachments));

  /** Applies a wizard patch, reporting each touched field so its flag can clear. */
  function patchForm(patch: Partial<WizardForm>) {
    Object.assign(form, patch);
    for (const key of Object.keys(patch)) {
      if (isReportFieldKey(key)) onchange(key);
    }
  }

  function scrollToAttachments() {
    document.getElementById('attachments')?.scrollIntoView({ block: 'start' });
  }
</script>

<fieldset class="scope" {disabled}>
  {#each FIELD_GROUPS as group (group.id)}
    <fieldset class="group" id={group.id} data-report-section>
      <legend>
        <span class="numeral">{group.numeral}</span>
        {group.title}
      </legend>

      {#if group.id === 'activity-classification'}
        <WizardStepClassify
          {form}
          campuses={references.campuses}
          units={references.units}
          departments={references.departments}
          offices={references.offices}
          {errors}
          {flagged}
          {disabled}
          onchange={patchForm}
        />
        {#if trackingNumber}
          <p class="field-hint">
            Changing the type does not change this report's tracking number ({trackingNumber}).
          </p>
        {/if}
      {:else if group.id === 'activity'}
        <WizardStepDetails {form} {errors} {flagged} {disabled} onchange={patchForm} />
      {:else if group.id === 'people'}
        <WizardStepPeople
          {form}
          sdgs={references.sdgs}
          {errors}
          {flagged}
          {disabled}
          onchange={patchForm}
        />
      {:else}
        <WizardField
          id={fieldDomId('narrative')}
          label="Narrative"
          error={errors.narrative}
          flagged={flagged?.has('narrative')}
          required
          hint="Formatting is limited to paragraphs. Blank lines are preserved."
        >
          {#snippet children({ describedBy, invalid })}
            <textarea
              id={fieldDomId('narrative')}
              class="textarea narrative"
              rows="12"
              spellcheck="true"
              value={form.narrative}
              {disabled}
              aria-invalid={invalid ? 'true' : undefined}
              aria-describedby={describedBy}
              oninput={(event) => patchForm({ narrative: event.currentTarget.value })}></textarea>
          {/snippet}
        </WizardField>

        <section class="attachments-block" id="attachments" aria-labelledby="attachments-heading">
          <h3 id="attachments-heading">Attachments</h3>

          <CompletenessChecklist items={checklist} onstep={() => scrollToAttachments()} />

          {#if requiredForType.length > 0}
            <p class="required-labels">
              Required labels for this activity type: {requiredForType
                .map((entry) => entry.label)
                .join(', ')}.
            </p>
          {/if}

          <AttachmentUploader
            bind:items={attachments}
            {reportId}
            ensureReportId={async () => reportId}
            {labelOptions}
            {disabled}
          />
        </section>
      {/if}
    </fieldset>
  {/each}
</fieldset>

<style>
  .scope {
    border: 0;
    margin: 0;
    min-width: 0;
    padding: 0;
  }

  .group {
    border: 0;
    border-top: 1px solid var(--border);
    margin: 0;
    min-width: 0;
    padding: 20px 0 24px;
    scroll-margin-top: 80px;
  }

  .group:first-child {
    border-top: 0;
    padding-top: 0;
  }

  legend {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    margin-bottom: 12px;
    padding: 0;
    text-transform: uppercase;
  }

  .numeral {
    font-family: var(--font-mono);
    font-weight: 500;
    margin-right: 6px;
  }

  .narrative {
    min-height: 220px;
  }

  .attachments-block {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 24px;
    scroll-margin-top: 80px;
  }

  .attachments-block h3 {
    font-size: 13px;
    margin: 0;
  }

  .required-labels {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
  }
</style>
