<script module lang="ts">
  /** The four numbers of a tab's box that the underline needs. */
  export type TabBox = {
    offsetLeft: number;
    offsetTop: number;
    offsetWidth: number;
    offsetHeight: number;
  };

  /** The underline sits on the tab's own bottom border, wherever that border is. */
  export function indicatorBox(tab: TabBox, thickness: number) {
    return {
      x: tab.offsetLeft,
      y: tab.offsetTop + tab.offsetHeight - thickness,
      width: tab.offsetWidth,
    };
  }
</script>

<script lang="ts">
  /**
   * The underline of a tab row. It follows the active tab by key, so a click
   * reads as one selection moving instead of one underline blinking out and
   * another blinking in. The row keeps its own markup: it passes the element
   * that holds the tabs and the key of the active one.
   */
  let { row, active }: { row: HTMLElement | undefined; active: string | null } = $props();

  let x = $state(0);
  let y = $state(0);
  let width = $state(0);
  let thickness = $state(2);
  let jumping = $state(false);

  /** The tab the underline last sat on. */
  let last: HTMLElement | null = null;

  function place(tab: HTMLElement, animate: boolean) {
    const border = Number.parseFloat(getComputedStyle(tab).borderBottomWidth) || 0;
    const box = indicatorBox(tab, border);

    jumping = !animate;
    thickness = border;
    x = box.x;
    y = box.y;
    width = box.width;
    last = tab;

    // Release the jump once the browser has painted the new position.
    if (!animate) requestAnimationFrame(() => (jumping = false));
  }

  $effect(() => {
    const container = row;
    const key = active;

    if (!container || !key) {
      width = 0;
      last = null;
      return;
    }

    const tab = container.querySelector<HTMLElement>(`[data-tab-key="${CSS.escape(key)}"]`);

    if (!tab) {
      width = 0;
      last = null;
      return;
    }

    // A row whose tabs were replaced (a new section) jumps; the same row slides.
    place(tab, last !== null && last.isConnected);

    // Any tab resizing moves the others, so watch them all. The active tab
    // grows when it takes the active weight, and the bar follows it there.
    const observer = new ResizeObserver(() => place(tab, true));
    observer.observe(container);
    for (const item of container.querySelectorAll('[data-tab-key]')) observer.observe(item);

    return () => observer.disconnect();
  });
</script>

<span
  class="indicator"
  class:jumping
  style:transform="translate({x}px, {y}px)"
  style:width="{width}px"
  style:height="{thickness}px"
  aria-hidden="true"
></span>

<style>
  .indicator {
    background: var(--primary);
    left: 0;
    pointer-events: none;
    position: absolute;
    top: 0;
    transition:
      transform var(--duration-base) var(--ease-standard),
      width var(--duration-base) var(--ease-standard);
  }

  /* A jump paints the new position without travelling to it. */
  .indicator.jumping {
    transition: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .indicator {
      transition: none;
    }
  }
</style>
