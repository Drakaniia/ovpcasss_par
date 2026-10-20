<script lang="ts">
  import { Eraser, Undo2 } from '@lucide/svelte';
  import { onMount } from 'svelte';

  type Point = { x: number; y: number };

  /**
   * The Draw tab (UI spec §7.14): a 600×200 pointer canvas with clear and undo.
   * Strokes are kept as points and replayed, so undo is exact and the canvas
   * never keeps a bitmap history. Drawing needs a pointer; the Upload tab is the
   * equivalent path without one, and the hint says so.
   */
  let { onchange }: { onchange: (dataUrl: string | null) => void } = $props();

  const WIDTH = 600;
  const HEIGHT = 200;

  const hintId = $props.id();

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasInk = $state(false);
  let canUndo = $state(false);

  let context: CanvasRenderingContext2D | null = null;
  /** Plain array: pointer moves must not schedule work on every sample. */
  let strokes: Point[][] = [];
  let drawing = false;

  function position(event: PointerEvent): Point {
    const rect = canvas?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };

    return {
      x: ((event.clientX - rect.left) * WIDTH) / rect.width,
      y: ((event.clientY - rect.top) * HEIGHT) / rect.height,
    };
  }

  function segment(from: Point, to: Point) {
    if (!context) return;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }

  function redraw() {
    if (!context) return;
    context.clearRect(0, 0, WIDTH, HEIGHT);

    for (const stroke of strokes) {
      for (let index = 1; index < stroke.length; index += 1) {
        segment(stroke[index - 1], stroke[index]);
      }
    }
  }

  function publish() {
    hasInk = strokes.length > 0;
    canUndo = strokes.length > 0;
    onchange(canvas && hasInk ? canvas.toDataURL('image/png') : null);
  }

  function start(event: PointerEvent) {
    if (!context || !canvas) return;
    canvas.setPointerCapture(event.pointerId);
    drawing = true;
    strokes.push([position(event)]);
    hasInk = true;
  }

  function move(event: PointerEvent) {
    if (!drawing) return;

    const stroke = strokes[strokes.length - 1];
    if (!stroke) return;

    const point = position(event);
    const last = stroke[stroke.length - 1];
    if (last) segment(last, point);
    stroke.push(point);
  }

  function end(event: PointerEvent) {
    if (!drawing) return;
    drawing = false;
    canvas?.releasePointerCapture(event.pointerId);
    publish();
  }

  export function clear() {
    strokes = [];
    redraw();
    publish();
  }

  function undo() {
    strokes.pop();
    redraw();
    publish();
  }

  onMount(() => {
    if (!canvas) return;

    context = canvas.getContext('2d');
    if (!context) return;

    // Ink follows the page's text color, so the stroke is never a raw hex.
    context.lineWidth = 2.2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = getComputedStyle(canvas).color;
  });
</script>

<div class="canvas-wrap">
  <!-- The drawing surface itself is not reachable by keyboard: the label lives
       on the wrapper and the Upload tab is the pointer-free path. -->
  <div role="img" aria-label="Drawing area for your signature" aria-describedby={hintId}>
    <canvas
      bind:this={canvas}
      class="signature-canvas"
      width={WIDTH}
      height={HEIGHT}
      aria-hidden="true"
      onpointerdown={start}
      onpointermove={move}
      onpointerup={end}
      onpointercancel={end}
    ></canvas>
  </div>

  <div class="canvas-tools">
    <button class="btn btn-ghost btn-sm" type="button" disabled={!canUndo} onclick={undo}>
      <Undo2 size={14} aria-hidden="true" />
      Undo
    </button>
    <button class="btn btn-ghost btn-sm" type="button" disabled={!hasInk} onclick={clear}>
      <Eraser size={14} aria-hidden="true" />
      Clear
    </button>
    <span class="tool-hint" id={hintId}>
      {hasInk
        ? 'Save to keep this signature.'
        : 'Draw above the line with a mouse or pointer, or use the Upload tab.'}
    </span>
  </div>
</div>

<style>
  .canvas-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .signature-canvas {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-bottom: 2px solid var(--text-secondary);
    border-radius: var(--radius-card);
    color: var(--text-primary);
    cursor: crosshair;
    height: auto;
    max-width: 600px;
    touch-action: none;
    width: 100%;
  }

  .canvas-tools {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tool-hint {
    color: var(--text-secondary);
    font-size: 12px;
  }
</style>
