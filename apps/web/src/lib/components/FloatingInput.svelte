<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';

  type Props = Omit<HTMLInputAttributes, 'value' | 'onfocus' | 'onblur'> & {
    value?: string;
    label: string | Snippet;
    icon?: Snippet;
    onfocus?: (event: FocusEvent) => void;
    onblur?: (event: FocusEvent) => void;
  };

  let {
    value = $bindable(''),
    label,
    id,
    icon,
    placeholder = '',
    class: className = '',
    onfocus,
    onblur,
    ...rest
  }: Props = $props();

  let focused = $state(false);

  /** The label floats once the field is focused or holds a value. */
  const active = $derived(focused || value.length > 0);

  function handleFocus(event: FocusEvent) {
    focused = true;
    onfocus?.(event);
  }

  function handleBlur(event: FocusEvent) {
    focused = false;
    onblur?.(event);
  }
</script>

<div
  class="float-field"
  class:active
  class:with-icon={Boolean(icon)}
>
  <label class="float-label" for={id}>
    {#if typeof label === 'string'}{label}{:else}{@render label()}{/if}
  </label>

  {#if icon}
    <span class="float-icon" aria-hidden="true">{@render icon()}</span>
  {/if}

  <input
    {...rest}
    class="input float-input {className}"
    {id}
    {placeholder}
    bind:value
    onfocus={handleFocus}
    onblur={handleBlur}
  />

</div>

<style>
  .float-field {
    position: relative;
  }

  .float-input {
    font-size: 15px;
    height: 54px;
    padding: 24px 12px 8px;
  }

  /* Placeholder is only revealed once the label has floated clear of it. */
  .float-input::placeholder {
    color: transparent;
  }

  .float-field.active .float-input::placeholder {
    color: var(--text-disabled);
  }

  .float-label {
    align-items: baseline;
    color: var(--text-secondary);
    display: inline-flex;
    font-size: 15px;
    gap: 8px;
    left: 12px;
    line-height: 1.2;
    pointer-events: none;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    transform-origin: left top;
    transition:
      top 300ms cubic-bezier(0.22, 0.61, 0.36, 1),
      transform 300ms cubic-bezier(0.22, 0.61, 0.36, 1);
  }

  .float-field.active .float-label {
    top: 8px;
    transform: translateY(0) scale(0.8);
  }

  .float-icon {
    color: var(--text-disabled);
    left: 14px;
    pointer-events: none;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }

  .float-field.with-icon .float-label {
    left: 42px;
  }

  .float-field.with-icon .float-input {
    padding-left: 42px;
  }

  @media (prefers-reduced-motion: reduce) {
    .float-label {
      transition: none;
    }
  }
</style>
