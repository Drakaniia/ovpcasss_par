<script lang="ts">
  import type { Role } from '@par/shared';

  import { subtitleFor } from '../application/report-list';

  let { role }: { role: Role | null } = $props();
</script>

<!-- The shell's tab row owns the single filled primary (+ New report) for submitters. -->
<header class="page-head">
  <div>
    <h1>My reports</h1>
    <p class="subtitle">{subtitleFor(role)}</p>
  </div>
</header>

<style>
  .page-head {
    align-items: flex-start;
    display: flex;
    gap: 24px;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  h1 {
    letter-spacing: -0.01em;
    margin: 0;
  }

  .subtitle {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 4px 0 0;
  }
</style>
