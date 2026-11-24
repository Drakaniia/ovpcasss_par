<div class="wizard-skeleton" aria-busy="true">
  <span class="sr-only" role="status">Loading the record form</span>
  <div class="wizard-head" aria-hidden="true">
    <div class="skeleton line back"></div>
    <div class="skeleton line title"></div>
  </div>
  <div class="stepper" aria-hidden="true">
    {#each [1, 2, 3] as step (step)}
      <div class="step-item">
        <div class="skeleton dot"></div>
        <div class="skeleton line step-label"></div>
      </div>
    {/each}
  </div>
  <div class="form-card" aria-hidden="true">
    <div class="two-col">
      {#each [1, 2, 3, 4, 5, 6, 7, 8] as field (field)}
        <div class="field-skel">
          <div class="skeleton line label"></div>
          <div class="skeleton input-box"></div>
        </div>
      {/each}
    </div>
  </div>
  <div class="action-bar" aria-hidden="true">
    <div class="skeleton button"></div>
  </div>
</div>

<style>
  .wizard-skeleton {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin: 0 auto;
    max-width: 780px;
  }

  .wizard-head {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .line {
    height: 12px;
  }

  .back {
    width: 110px;
  }

  .title {
    height: 24px;
    width: 180px;
  }

  .stepper {
    display: flex;
    gap: 24px;
    padding: 8px 0;
  }

  .step-item {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  .dot {
    border-radius: 999px;
    height: 24px;
    width: 24px;
  }

  .step-label {
    width: 88px;
  }

  .form-card {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    padding: 24px;
  }

  .two-col {
    display: grid;
    gap: 16px 24px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .field-skel {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .label {
    width: 45%;
  }

  .input-box {
    border-radius: var(--radius-input);
    height: 36px;
  }

  .action-bar {
    display: flex;
    justify-content: flex-end;
  }

  .button {
    border-radius: var(--radius-input);
    height: 36px;
    width: 120px;
  }

  @media (max-width: 1023px) {
    .two-col {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
