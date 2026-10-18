<script lang="ts">
  import type { Sdg } from '@par/shared';

  import { newPic, type WizardForm, type WizardPic } from '../application/wizard-form';
  import type { FieldErrors } from '../application/wizard-validation';
  import PicRows from './PicRows.svelte';
  import SdgPicker from './SdgPicker.svelte';
  import WizardField from './WizardField.svelte';

  /**
   * Step 3 — people and outcomes (UI phase 06 §3). Counts are whole numbers; the
   * PIC count must agree with the rows, and at least one SDG is required.
   */
  let {
    form,
    errors,
    sdgs,
    flagged,
    disabled = false,
    onchange,
  }: {
    form: WizardForm;
    errors: FieldErrors;
    sdgs: readonly Sdg[];
    /** Fields named in a return comment; only phase 07 sets this. */
    flagged?: ReadonlySet<string>;
    disabled?: boolean;
    onchange: (patch: Partial<WizardForm>) => void;
  } = $props();

  function patchPic(id: string, patch: Partial<Omit<WizardPic, 'id'>>): void {
    onchange({
      pics: form.pics.map((pic) => (pic.id === id ? { ...pic, ...patch } : pic)),
    });
  }

  function addPic(): void {
    onchange({ pics: [...form.pics, newPic()] });
  }

  function removePic(id: string): void {
    onchange({ pics: form.pics.filter((pic) => pic.id !== id) });
  }
</script>

<div class="step-fields">
  <div class="count-row">
    <WizardField
      id="wiz-totalStudents"
      label="Total number of students"
      error={errors.totalStudents}
      flagged={flagged?.has('totalStudents')}
      required
    >
      {#snippet children({ describedBy, invalid })}
        <input
          id="wiz-totalStudents"
          class="input count"
          type="number"
          inputmode="numeric"
          min="0"
          step="1"
          value={form.totalStudents}
          {disabled}
          aria-invalid={invalid ? 'true' : undefined}
          aria-describedby={describedBy}
          oninput={(event) => onchange({ totalStudents: event.currentTarget.value })}
        />
      {/snippet}
    </WizardField>

    <WizardField
      id="wiz-totalPic"
      label="Total number of PIC"
      error={errors.totalPic}
      flagged={flagged?.has('totalPic')}
      required
      hint="Must match the rows below."
    >
      {#snippet children({ describedBy, invalid })}
        <input
          id="wiz-totalPic"
          class="input count"
          type="number"
          inputmode="numeric"
          min="0"
          step="1"
          value={form.totalPic}
          {disabled}
          aria-invalid={invalid ? 'true' : undefined}
          aria-describedby={describedBy}
          oninput={(event) => onchange({ totalPic: event.currentTarget.value })}
        />
      {/snippet}
    </WizardField>
  </div>

  <div class="field-group">
    <h2 class="group-title">People in charge</h2>
    <PicRows
      pics={form.pics}
      {errors}
      flagged={flagged?.has('pics')}
      {disabled}
      onchange={patchPic}
      onadd={addPic}
      onremove={removePic}
    />
  </div>

  <SdgPicker
    id="wiz-sdgIds"
    selected={form.sdgIds}
    options={sdgs}
    error={errors.sdgIds}
    flagged={flagged?.has('sdgIds')}
    {disabled}
    onchange={(sdgIds) => onchange({ sdgIds })}
  />
</div>

<style>
  .step-fields {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .count-row {
    display: grid;
    gap: 16px;
    grid-template-columns: 1fr 1fr;
  }

  .count {
    font-variant-numeric: tabular-nums;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .group-title {
    font-size: 15px;
    margin: 0;
  }
</style>
