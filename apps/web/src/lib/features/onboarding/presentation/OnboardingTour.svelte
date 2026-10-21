<script lang="ts">
  import { page } from '$app/state';

  import { trapFocus } from '$lib/a11y/focus-trap';

  import {
    backStep,
    closeTour,
    currentStep,
    finishTour,
    maybeAutoStart,
    nextStep,
    setViewport,
    skipTour,
    tour,
  } from '../application/tour-controller.svelte';
  import { TOUR_MIN_WIDTH } from '../application/tour-eligibility';
  import { placeTooltip, spotlightRect, type Rect } from '../application/tour-placement';
  import type { ResolvedStep } from '../application/tour-steps';
  import TourCard from './TourCard.svelte';

  /**
   * The tour layer (onboarding spec §8.4, §10–§12). A native modal `<dialog>`
   * supplies the top layer, the focus trap and Escape; this component owns the
   * measurements, the spotlight geometry and the page-level side effects.
   */
  const step = $derived(currentStep());
  const announcement = $derived(
    step ? `Step ${step.position} of ${step.total}. ${step.title}.` : '',
  );

  let dialog = $state<HTMLDialogElement | null>(null);
  let surface = $state<HTMLDivElement | null>(null);
  /** `null` while a step is measured; the card is hidden until it is placed. */
  let cardAt = $state<{ top: number; left: number } | null>(null);
  let hole = $state<Rect | null>(null);

  let viewportWidth = $state(typeof window === 'undefined' ? 0 : window.innerWidth);
  let restoreTarget: Element | null = null;
  let frame: number | null = null;
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  let positionToken = 0;

  // The gate. Every input it reads is reactive, so a route change, a resize, a
  // session change or the inbox finishing all re-evaluate eligibility.
  $effect(() => {
    setViewport(viewportWidth);
    maybeAutoStart({ pathname: page.url.pathname, viewportWidth });
  });

  $effect(() => {
    const element = dialog;
    if (!element) return;

    if (tour.status === 'active' && !element.open) {
      restoreTarget = document.activeElement;
      element.showModal();
    }

    if (tour.status === 'idle' && element.open) {
      element.close();
      restoreFocus();
    }
  });

  $effect(() => {
    const active = step;
    const node = surface;
    const index = tour.index;

    if (tour.status !== 'active' || !active || !node) return;
    // `index` and `step` are both read so a same-node step change re-measures.
    void index;
    void positionStep(active, node);
  });

  // The tour only exists on Home; leaving the route closes it without recording
  // anything, so it opens again on the next visit.
  $effect(() => {
    if (page.url.pathname !== '/' && tour.status === 'active') closeTour(false);
  });

  $effect(() => {
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeTimer = null;
        viewportWidth = window.innerWidth;
        setViewport(viewportWidth);

        if (tour.status !== 'active') return;
        if (viewportWidth < TOUR_MIN_WIDTH) {
          // The foundation notice owns this width; leave the tour armed.
          closeTour(false);
          return;
        }

        const active = currentStep();
        if (active && surface) void positionStep(active, surface);
      }, 100);
    };

    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  });

  // The page is inert behind a modal, but a wheel still scrolls the document.
  // Space is not intercepted: it must keep activating the focused control.
  $effect(() => {
    if (tour.status !== 'active') return;

    const blockScroll = (event: Event) => event.preventDefault();
    const blockPageKeys = (event: KeyboardEvent) => {
      if (['PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) event.preventDefault();
    };

    window.addEventListener('wheel', blockScroll, { passive: false });
    window.addEventListener('touchmove', blockScroll, { passive: false });
    window.addEventListener('keydown', blockPageKeys);

    return () => {
      window.removeEventListener('wheel', blockScroll);
      window.removeEventListener('touchmove', blockScroll);
      window.removeEventListener('keydown', blockPageKeys);
    };
  });

  $effect(() => () => cancelFrame());

  function cancelFrame(): void {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  }

  function nextFrame(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof requestAnimationFrame !== 'function') {
        resolve();
        return;
      }

      frame = requestAnimationFrame(() => {
        frame = null;
        resolve();
      });
    });
  }

  async function positionStep(active: ResolvedStep, node: HTMLElement): Promise<void> {
    const token = ++positionToken;

    // Hide first: a new step must never paint at the previous step's position.
    cardAt = null;
    if (!active.anchor) hole = null;

    const target = active.anchor
      ? document.querySelector<HTMLElement>(`[data-tour="${active.anchor}"]`)
      : null;

    if (active.anchor && !isVisible(target)) {
      // The target left the DOM between resolution and display; walk on.
      nextStep();
      return;
    }

    if (target) {
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
      await nextFrame();
      if (token !== positionToken) return;
    }

    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const nextHole = target ? spotlightRect(target.getBoundingClientRect(), 8, viewport) : null;
    const size = { width: node.offsetWidth, height: node.offsetHeight };

    if (nextHole) {
      hole = nextHole;
      cardAt = placeTooltip({
        target: nextHole,
        tooltip: size,
        viewport,
        preferred: active.placement,
      });
    } else {
      hole = null;
      cardAt = {
        top: Math.max(16, (viewport.height - size.height) / 2),
        left: Math.max(16, (viewport.width - size.width) / 2),
      };
    }

    // One flush so the card is visible before it takes focus; an invisible
    // element cannot be focused.
    await nextFrame();
    if (token !== positionToken) return;

    node.querySelector<HTMLElement>('[data-tour-primary]')?.focus();
  }

  function isVisible(element: HTMLElement | null): element is HTMLElement {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    return getComputedStyle(element).visibility !== 'hidden';
  }

  function restoreFocus(): void {
    const remembered = restoreTarget instanceof HTMLElement ? restoreTarget : null;
    restoreTarget = null;

    const fallback = document.getElementById('content');
    const target = remembered && document.contains(remembered) ? remembered : fallback;
    target?.focus();
  }

  function dismiss(): void {
    if (step?.final) {
      // Escape on the summary is the same ending as Start exploring.
      finishTour();
      return;
    }

    skipTour();
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!dialog) return;

    trapFocus(event, dialog);

    if (event.key === 'ArrowRight' && !step?.final) {
      event.preventDefault();
      nextStep();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      backStep();
    }
  }
</script>

<dialog
  bind:this={dialog}
  class="tour"
  data-onboarding-tour
  aria-labelledby="tour-title"
  aria-describedby="tour-description"
  oncancel={(event) => {
    event.preventDefault();
    dismiss();
  }}
  onkeydown={onKeydown}
>
  {#if step}
    <p class="sr-only" aria-live="polite">{announcement}</p>

    {#if hole}
      <div
        class="hole"
        aria-hidden="true"
        style:top="{hole.top}px"
        style:left="{hole.left}px"
        style:width="{hole.width}px"
        style:height="{hole.height}px"
      ></div>
    {:else}
      <div class="scrim" aria-hidden="true"></div>
    {/if}

    <div
      class="tour-surface"
      bind:this={surface}
      style:top="{cardAt?.top ?? 0}px"
      style:left="{cardAt?.left ?? 0}px"
      style:visibility={cardAt ? 'visible' : 'hidden'}
    >
      {#key step.id}
        <div class="card-enter" class:bookend={!step.anchor}>
          <TourCard {step} onback={backStep} onnext={nextStep} onskip={skipTour} />
        </div>
      {/key}
    </div>
  {/if}
</dialog>

<style>
  .tour {
    background: transparent;
    border: 0;
    height: 100dvh;
    inset: 0;
    margin: 0;
    max-height: none;
    max-width: none;
    overflow: visible;
    padding: 0;
    width: 100vw;
  }

  /* The hole paints the scrim; the UA backdrop would double-darken it. */
  .tour::backdrop {
    background: transparent;
  }

  .scrim {
    background: var(--backdrop-strong);
    inset: 0;
    pointer-events: none;
    position: fixed;
  }

  /*
   * The ring is drawn outward from a transparent hole: 2 px navy, 6 px white
   * halo, then the scrim spread over everything except the hole itself.
   */
  .hole {
    border-radius: 8px;
    box-shadow:
      0 0 0 2px var(--brand-navy-700),
      0 0 0 6px var(--tour-halo),
      0 0 0 100vmax var(--backdrop-strong);
    pointer-events: none;
    position: fixed;
    transition:
      top var(--duration-slow) var(--ease-standard),
      left var(--duration-slow) var(--ease-standard),
      width var(--duration-slow) var(--ease-standard),
      height var(--duration-slow) var(--ease-standard);
  }

  .tour-surface {
    position: fixed;
    z-index: 1;
  }

  .card-enter {
    animation: tour-card-in 160ms var(--ease-standard) both;
  }

  /* Bookends are the layer's own subject: a fade, no travel. */
  .card-enter.bookend {
    animation-name: tour-card-fade;
  }

  @keyframes tour-card-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }

    to {
      opacity: 1;
      transform: none;
    }
  }

  @keyframes tour-card-fade {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hole {
      transition: none;
    }

    .card-enter,
    .card-enter.bookend {
      animation: none;
    }
  }
</style>
