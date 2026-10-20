<script lang="ts">
  import DatePicker from '$lib/components/DatePicker.svelte';

  import WizardField from './WizardField.svelte';

  let {
    id,
    label,
    value,
    text,
    error,
    optional = false,
    flagged = false,
    disabled = false,
    ontext,
    onchange,
  }: {
    id: string;
    label: string;
    value: string;
    text: string;
    error?: string;
    optional?: boolean;
    flagged?: boolean;
    disabled?: boolean;
    ontext: (text: string) => void;
    onchange: (iso: string) => void;
  } = $props();
</script>

<WizardField {id} {label} {error} {optional} {flagged} hint="DD MMM YYYY">
  {#snippet children({ describedBy, invalid })}
    <DatePicker
      {id}
      {label}
      {value}
      {text}
      {disabled}
      {invalid}
      {describedBy}
      revertInvalid={false}
      {ontext}
      {onchange}
    />
  {/snippet}
</WizardField>
