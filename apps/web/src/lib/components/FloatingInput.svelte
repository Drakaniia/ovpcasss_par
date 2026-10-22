<script lang="ts">
  import { Eye, EyeOff } from '@lucide/svelte';
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
  let field = $state<HTMLInputElement | null>(null);

  /** A password field offers a reveal; every other type ignores the control. */
  const isPassword = $derived(rest.type === 'password');
  let revealed = $state(false);

  /** The label floats once the field is focused or holds a value. */
  const active = $derived(focused || value.length > 0);

  function toggleReveal() {
    revealed = !revealed;
    field?.focus();
  }

  function handleFocus(event: FocusEvent) {
    focused = true;
    onfocus?.(event);
  }

  function handleBlur(event: FocusEvent) {
    focused = false;
    onblur?.(event);
  }
</script>

<div class="float-field" class:active class:with-icon={Boolean(icon)} class:with-reveal={isPassword}>
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
    type={isPassword && revealed ? 'text' : rest.type}
    bind:this={field}
    bind:value
    onfocus={handleFocus}
    onblur={handleBlur}
  />

  {#if isPassword}
    <button
      class="reveal"
      type="button"
      aria-label={revealed ? 'Hide password' : 'Show password'}
      aria-pressed={revealed}
      onclick={toggleReveal}
    >
      {#if revealed}
        <EyeOff size={17} aria-hidden="true" />
      {:else}
        <Eye size={17} aria-hidden="true" />
      {/if}
    </button>
  {/if}
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

  .float-field.with-reveal .float-input {
    padding-right: 44px;
  }

  /* The reveal appears with the field's own hover or focus, never before. */
  .reveal {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: var(--radius-card);
    color: var(--text-disabled);
    display: inline-flex;
    height: 30px;
    justify-content: center;
    opacity: 0;
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    transition: opacity 140ms ease;
    width: 30px;
  }

  .float-field:hover .reveal,
  .float-field:focus-within .reveal {
    opacity: 1;
  }

  .reveal:hover {
    background: var(--surface-page);
    color: var(--text-primary);
  }

  @media (prefers-reduced-motion: reduce) {
    .float-label {
      transition: none;
    }
  }
</style>
