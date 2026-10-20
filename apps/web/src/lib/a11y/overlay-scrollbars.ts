const THUMB_SIZE = 7;
const EDGE_INSET = 2;
const MIN_THUMB_LENGTH = 28;
const SCROLL_END_DELAY = 140;
const HIDE_DELAY = 700;
const LEAVE_DELAY = 180;

export interface ThumbGeometry {
  length: number;
  position: number;
}

/**
 * Maps a scroll position onto a thumb inside `track` pixels. Returns null when
 * the axis has nothing to scroll.
 */
export function thumbGeometry(
  view: number,
  total: number,
  offset: number,
  track: number,
): ThumbGeometry | null {
  if (view <= 0 || total <= view || track <= 0) return null;

  const length = Math.min(track, Math.max(MIN_THUMB_LENGTH, (view / total) * track));
  const travel = track - length;
  const maxOffset = total - view;
  const position = Math.min(travel, Math.max(0, (offset / maxOffset) * travel));

  return { length, position };
}

function createThumb(): HTMLDivElement {
  const thumb = document.createElement('div');
  thumb.className = 'par-scrollbar';
  return thumb;
}

/**
 * Apple-style overlay scrollbars for the desktop shell: native bars are hidden
 * in CSS, and these thumbs fade in on hover or scroll without taking layout
 * space. Returns a cleanup function.
 */
export function startOverlayScrollbars(): () => void {
  if (typeof document === 'undefined' || !document.body) return () => {};

  const layer = document.createElement('div');
  layer.className = 'par-scrollbar-layer';

  const vertical = createThumb();
  const horizontal = createThumb();
  layer.append(vertical, horizontal);
  document.body.append(layer);

  let target: HTMLElement | null = null;
  let hovered: HTMLElement | null = null;
  let dragging = false;
  let scrolling = false;
  let frame = 0;
  let hideTimer = 0;
  let scrollEndTimer = 0;

  function metrics(el: HTMLElement) {
    if (el === document.scrollingElement) {
      return {
        top: 0,
        left: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
        width: window.innerWidth,
        height: window.innerHeight,
        scrollTop: el.scrollTop,
        scrollLeft: el.scrollLeft,
        scrollHeight: el.scrollHeight,
        scrollWidth: el.scrollWidth,
      };
    }

    const rect = el.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      width: el.clientWidth,
      height: el.clientHeight,
      scrollTop: el.scrollTop,
      scrollLeft: el.scrollLeft,
      scrollHeight: el.scrollHeight,
      scrollWidth: el.scrollWidth,
    };
  }

  function place(thumb: HTMLDivElement, x: number, y: number, width: number, height: number) {
    thumb.style.width = `${width}px`;
    thumb.style.height = `${height}px`;
    thumb.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  function update() {
    frame = 0;
    if (!target || !target.isConnected) {
      hide();
      return;
    }

    const m = metrics(target);

    const vTrack = m.height - EDGE_INSET * 2;
    const vGeo = thumbGeometry(m.height, m.scrollHeight, m.scrollTop, vTrack);
    if (vGeo) {
      place(
        vertical,
        m.right - THUMB_SIZE - EDGE_INSET,
        m.top + EDGE_INSET + vGeo.position,
        THUMB_SIZE,
        vGeo.length,
      );
    }
    vertical.style.display = vGeo ? 'block' : 'none';

    const hTrack = m.width - EDGE_INSET * 2;
    const hGeo = thumbGeometry(m.width, m.scrollWidth, m.scrollLeft, hTrack);
    if (hGeo) {
      place(
        horizontal,
        m.left + EDGE_INSET + hGeo.position,
        m.bottom - THUMB_SIZE - EDGE_INSET,
        hGeo.length,
        THUMB_SIZE,
      );
    }
    horizontal.style.display = hGeo ? 'block' : 'none';
  }

  function scheduleUpdate() {
    if (frame) return;
    frame = window.requestAnimationFrame(update);
  }

  function reveal() {
    window.clearTimeout(hideTimer);
    layer.classList.add('is-visible');
  }

  function scheduleHide(delay = HIDE_DELAY) {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      if (dragging || scrolling || hovered === target) return;
      layer.classList.remove('is-visible');
    }, delay);
  }

  function hide() {
    window.clearTimeout(hideTimer);
    layer.classList.remove('is-visible');
    target = null;
  }

  function isScrollable(el: HTMLElement): boolean {
    const style = getComputedStyle(el);

    if (el === document.scrollingElement) {
      const scrollableY = style.overflowY !== 'hidden' && style.overflowY !== 'clip';
      const scrollableX = style.overflowX !== 'hidden' && style.overflowX !== 'clip';

      return (
        (scrollableY && el.scrollHeight > el.clientHeight) ||
        (scrollableX && el.scrollWidth > el.clientWidth)
      );
    }

    const verticalOverflow = style.overflowY === 'auto' || style.overflowY === 'scroll';
    const horizontalOverflow = style.overflowX === 'auto' || style.overflowX === 'scroll';

    return (
      (verticalOverflow && el.scrollHeight > el.clientHeight) ||
      (horizontalOverflow && el.scrollWidth > el.clientWidth)
    );
  }

  function scrollableAncestor(node: EventTarget | null): HTMLElement | null {
    let el = node instanceof Element ? node : null;

    while (el) {
      if (el instanceof HTMLElement && isScrollable(el)) return el;
      el = el.parentElement;
    }

    const root = document.scrollingElement;
    return root instanceof HTMLElement && isScrollable(root) ? root : null;
  }

  function onScroll(event: Event) {
    const el =
      event.target === document
        ? document.scrollingElement
        : event.target instanceof HTMLElement
          ? event.target
          : null;

    if (!(el instanceof HTMLElement) || !isScrollable(el)) return;

    target = el;
    scrolling = true;
    reveal();
    scheduleUpdate();

    window.clearTimeout(scrollEndTimer);
    scrollEndTimer = window.setTimeout(() => {
      scrolling = false;
      scheduleHide();
    }, SCROLL_END_DELAY);
  }

  function onPointerOver(event: PointerEvent) {
    if (layer.contains(event.target as Node)) return;

    const el = scrollableAncestor(event.target);
    hovered = el;

    if (!el) {
      scheduleHide(LEAVE_DELAY);
      return;
    }

    if (el !== target) {
      target = el;
      scheduleUpdate();
    }
    reveal();
  }

  function onPointerOut(event: PointerEvent) {
    if (event.relatedTarget !== null) return;
    hovered = null;
    if (!dragging) scheduleHide(LEAVE_DELAY);
  }

  function onPointerDown(event: PointerEvent, axis: 'x' | 'y') {
    if (!target || !target.isConnected) return;

    const el = target;
    const m = metrics(el);
    const view = axis === 'y' ? m.height : m.width;
    const total = axis === 'y' ? m.scrollHeight : m.scrollWidth;
    const offset = axis === 'y' ? m.scrollTop : m.scrollLeft;
    const track = view - EDGE_INSET * 2;
    const geo = thumbGeometry(view, total, offset, track);
    const thumb = axis === 'y' ? vertical : horizontal;

    if (!geo) return;

    event.preventDefault();
    dragging = true;
    reveal();

    const start = axis === 'y' ? event.clientY : event.clientX;
    const travel = track - geo.length;
    const maxOffset = total - view;

    const move = (ev: PointerEvent) => {
      const delta = (axis === 'y' ? ev.clientY : ev.clientX) - start;
      const next = travel > 0 ? offset + (delta / travel) * maxOffset : 0;
      if (axis === 'y') el.scrollTop = next;
      else el.scrollLeft = next;
      scheduleUpdate();
    };

    const end = () => {
      if (!dragging) return;
      dragging = false;
      thumb.removeEventListener('pointermove', move);
      thumb.removeEventListener('pointerup', end);
      thumb.removeEventListener('pointercancel', end);
      if (thumb.hasPointerCapture(event.pointerId)) {
        thumb.releasePointerCapture(event.pointerId);
      }
      scheduleHide();
    };

    thumb.setPointerCapture(event.pointerId);
    thumb.addEventListener('pointermove', move);
    thumb.addEventListener('pointerup', end);
    thumb.addEventListener('pointercancel', end);
  }

  function onResize() {
    scheduleUpdate();
  }

  vertical.addEventListener('pointerdown', (event) => onPointerDown(event, 'y'));
  horizontal.addEventListener('pointerdown', (event) => onPointerDown(event, 'x'));
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
  document.addEventListener('pointerover', onPointerOver, true);
  document.addEventListener('pointerout', onPointerOut, true);
  window.addEventListener('resize', onResize);

  return () => {
    window.cancelAnimationFrame(frame);
    window.clearTimeout(hideTimer);
    window.clearTimeout(scrollEndTimer);
    document.removeEventListener('scroll', onScroll, { capture: true });
    document.removeEventListener('pointerover', onPointerOver, true);
    document.removeEventListener('pointerout', onPointerOut, true);
    window.removeEventListener('resize', onResize);
    layer.remove();
  };
}
