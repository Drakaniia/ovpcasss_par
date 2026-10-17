<script lang="ts">
  const PHASES = {
    '01': 'auth and account',
    '02': 'work inbox',
    '03': 'users and roles',
    '04': 'reference data',
    '05': 'my reports',
    '06': 'create report',
    '07': 'edit returned report',
    '08': 'report facsimile',
    '09': 'queues and decisions',
    '10': 'repository search',
    '11': 'notifications',
    '12': 'global tools',
    '13': 'audit log',
    '14': 'exports',
    '15': 'desktop and offline',
    '16': 'quality pass',
  } as const;

  type PhaseId = keyof typeof PHASES;

  let {
    title,
    phase,
    plain = false,
  }: { title: string; phase: PhaseId; plain?: boolean } = $props();
</script>

<section class="placeholder" class:card={!plain} class:plain>
  <p class="eyebrow">Planned · Phase {phase}</p>
  <h1 class="title">{title}</h1>
  <p class="note">
    This screen is planned for phase {phase} ({PHASES[phase]}). The shell, design tokens, and shared
    components are in place.
  </p>
</section>

<style>
  .placeholder {
    padding: 32px;
  }

  .placeholder.plain {
    padding: 0;
  }

  .eyebrow {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.04em;
    margin: 0 0 4px;
    text-transform: uppercase;
  }

  .title {
    margin: 0 0 8px;
  }

  .note {
    color: var(--text-secondary);
    margin: 0;
    max-width: 62ch;
  }
</style>
