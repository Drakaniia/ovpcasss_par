<script lang="ts">
  import type { ReportCommentRound, ReportDetail } from '@par/shared';
  import { onMount } from 'svelte';

  import { registerCommand } from '$lib/features/window-chrome/application/command-registry.svelte';

  import type { FacsimileReferences } from '../application/facsimile-document';
  import type { SignatureBlock } from '../application/facsimile-people';
  import { estimatePageCount, printFooter } from '../application/facsimile-print';
  import FacsimileDocument from './FacsimileDocument.svelte';
  import PrintToolbar from './PrintToolbar.svelte';

  /**
   * Print preview (UI spec §7.8): A4 portrait, 15 mm margins, the letterhead and
   * sections I–IV plus attachments and the signature block, and a footer with
   * the generation time, tracking number, and page count. Screen chrome, the
   * rail, the stepper, comments, and history are not part of this view.
   */
  let {
    detail,
    references,
    rounds,
    block,
    pdfBusy = false,
    pdfError,
    ondownload,
  }: {
    detail: ReportDetail;
    references: FacsimileReferences;
    rounds: ReportCommentRound[];
    block: SignatureBlock;
    pdfBusy?: boolean;
    pdfError?: string;
    ondownload: () => void;
  } = $props();

  const generatedAt = new Date();

  let sheet = $state<HTMLElement | null>(null);
  let pageCount = $state(1);
  let ready = $state(false);

  const generatedStamp = $derived(
    printFooter({
      now: generatedAt,
      trackingNumber: detail.trackingNumber,
      pageCount,
    }),
  );

  $effect(() => {
    const element = sheet;
    if (!element) return;

    const measure = () => {
      pageCount = estimatePageCount(element.getBoundingClientRect().height);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  });

  onMount(() => {
    let cancelled = false;

    void (async () => {
      if (typeof document !== 'undefined' && document.fonts) await document.fonts.ready;

      const images = Array.from(sheet?.querySelectorAll('img') ?? []);
      await Promise.all(
        images.map(
          (image) =>
            new Promise<void>((resolve) => {
              if (image.complete) {
                resolve();
                return;
              }
              image.addEventListener('load', () => resolve(), { once: true });
              image.addEventListener('error', () => resolve(), { once: true });
            }),
        ),
      );

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (!cancelled) ready = true;
    })();

    return () => {
      cancelled = true;
    };
  });

  function print() {
    if (!ready || typeof window === 'undefined') return;
    window.print();
  }

  // File > Print and `Ctrl+P` both resolve through the chrome's registry, so the
  // shortcut and the menu can never disagree and neither runs twice.
  onMount(() =>
    registerCommand({
      id: 'file.print',
      enabled: () => ready,
      disabledReason: () => 'The document is still rendering.',
      run: () => print(),
    }),
  );
</script>

<div class="print-preview">
  <PrintToolbar
    id={detail.id}
    status={detail.status}
    {ready}
    {pdfBusy}
    {pdfError}
    onprint={print}
    {ondownload}
    onretry={ondownload}
  />

  <div class="print-sheet" bind:this={sheet}>
    <FacsimileDocument {detail} {references} {rounds} {block} print />

    <p class="print-footer">{generatedStamp}</p>
  </div>
</div>

<style>
  /* Paper colour and the document fill come from the phase 08 stylesheet, so
     the print and screen variants stay one source of truth. */
  .print-sheet {
    border: 1px solid color-mix(in srgb, var(--text-paper) 12%, transparent);
    border-radius: 2px;
    box-shadow: var(--shadow-raised);
    margin-inline: auto;
    min-height: 297mm;
    padding: 15mm;
    width: 210mm;
  }

  .print-footer {
    border-top: 1px solid color-mix(in srgb, var(--print-text) 16%, transparent);
    color: color-mix(in srgb, var(--print-text) 62%, transparent);
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.02em;
    margin: 28px 0 0;
    padding-top: 6px;
  }

  @media (max-width: 900px) {
    .print-sheet {
      min-height: 0;
      padding: 24px;
      width: 100%;
    }
  }

  @media print {
    .print-sheet {
      border: 0;
      box-shadow: none;
      margin: 0;
      min-height: 0;
      padding: 0;
      width: auto;
    }

    .print-footer {
      bottom: 15mm;
      left: 15mm;
      margin: 0;
      position: fixed;
      right: 15mm;
    }
  }
</style>
