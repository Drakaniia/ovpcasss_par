<script lang="ts">
  /**
   * Parked: the isometric routing-line figure is built but not wired into the
   * auth screen yet. AuthLayout renders the original single-column page, and
   * `styles/par-line.css` is left un-imported until this is picked back up.
   */
  import { onMount } from 'svelte';

  import { STATUS_PRESENTATION } from '$lib/status/report-status';

  import {
    ART_MARKUP,
    carrierTransform,
    leverTransform,
    punchTransform,
    ramTransform,
    registerTransform,
    sheetTransform,
  } from './par-line/par-line-art';
  import { VIEW_H, VIEW_W, type StationId } from './par-line/par-line-layout';
  import { BEATS, beatForStation, ease, lerpPose, type Pose } from './par-line/par-line-timeline';

  /**
   * The routing line on the auth screen: one Post-Activity Report travelling a
   * hanging conveyor past the registry, the reviewer and the approving officer.
   * The drawing is decoration that carries an explanation — the tour runs on its
   * own, and the station buttons jump it to the step they name.
   */
  const STATIONS: { id: StationId; label: string; note: string }[] = [
    {
      id: 'registry',
      label: 'Register',
      note: 'Submission validates the report and issues its tracking number, once, at first submission. A resubmission keeps the same number.',
    },
    {
      id: 'review',
      label: 'Review',
      note: 'The reviewer reads the report and either endorses it to the approving officer or returns it to its submitter with the reason.',
    },
    {
      id: 'approve',
      label: 'Approve',
      note: 'The approving officer seals the report, which records the approval date and the officer’s name. No one approves a report they submitted.',
    },
    {
      id: 'archive',
      label: 'Archive',
      note: 'The approved report is filed and its acknowledgement rendered. Every step is appended to the audit log, which is never edited.',
    },
  ];

  let host = $state<SVGSVGElement>();
  let cycle = $state(1);
  let step = $state({ status: BEATS[0].status, caption: BEATS[0].caption, showsNumber: false });

  const number = $derived(`OFF-2026-${String(cycle).padStart(4, '0')}`);
  const label = $derived(STATUS_PRESENTATION[step.status].label);

  type Parts = {
    carrier: SVGGElement;
    sheet: SVGGElement;
    lever: SVGGElement;
    punch: SVGGElement;
    units: SVGGElement;
    rams: SVGGElement[];
    marks: SVGGElement[];
  };

  let parts: Parts | undefined;
  let index = 0;
  let previous: Pose = BEATS[BEATS.length - 1].pose;
  let startedAt = 0;
  let frameId = 0;
  let still = false;

  function collect(svg: SVGSVGElement): Parts {
    const find = <T extends Element>(id: string) => {
      const node = svg.querySelector<T>(`#${id}`);
      if (!node) throw new Error(`par-line: missing #${id}`);
      return node;
    };
    return {
      carrier: find<SVGGElement>('carrier'),
      sheet: find<SVGGElement>('sheet'),
      lever: find<SVGGElement>('lever'),
      punch: find<SVGGElement>('punch'),
      units: find<SVGGElement>('register-units'),
      rams: ['ram-registry', 'ram-review', 'ram-approve'].map((id) => find<SVGGElement>(id)),
      marks: ['mark-number', 'mark-endorse', 'mark-approve'].map((id) => find<SVGGElement>(id)),
    };
  }

  function apply(pose: Pose) {
    if (!parts) return;
    parts.carrier.setAttribute('transform', carrierTransform(pose.x));
    parts.sheet.setAttribute('transform', sheetTransform(pose.sheetX, pose.fall));
    parts.sheet.setAttribute('opacity', pose.ink.toFixed(3));
    parts.rams.forEach((ram, order) => ram.setAttribute('transform', ramTransform(pose.rams[order])));
    parts.lever.setAttribute('transform', leverTransform(pose.lever));
    parts.punch.setAttribute('transform', punchTransform(pose.punch));
    parts.marks.forEach((mark, order) => mark.setAttribute('opacity', pose.marks[order].toFixed(3)));
    const cx = Number(parts.units.dataset.cx ?? 0);
    const cy = Number(parts.units.dataset.cy ?? 0);
    parts.units.setAttribute('transform', registerTransform(pose.unit + cycle - 1, cx, cy));
  }

  function show(order: number) {
    const beat = BEATS[order];
    step = { status: beat.status, caption: beat.caption, showsNumber: beat.showsNumber };
  }

  function tick(now: number) {
    const beat = BEATS[index];
    const elapsed = (now - startedAt) / 1000;
    apply(lerpPose(previous, beat.pose, ease(elapsed / beat.dur, beat.ease)));
    if (elapsed >= beat.dur) {
      previous = beat.pose;
      index = (index + 1) % BEATS.length;
      if (index === 0) cycle += 1;
      startedAt = now;
      show(index);
    }
    frameId = requestAnimationFrame(tick);
  }

  function select(station: StationId) {
    const order = beatForStation(station);
    index = order;
    previous = BEATS[order].pose;
    startedAt = performance.now();
    show(order);
    apply(lerpPose(previous, BEATS[order].pose, 1));
  }

  onMount(() => {
    const svg = host;
    if (!svg) return;
    svg.innerHTML = ART_MARKUP;
    parts = collect(svg);
    still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (still) {
      index = beatForStation('review');
      previous = BEATS[index].pose;
      show(index);
      apply(previous);
      return;
    }

    startedAt = performance.now();
    frameId = requestAnimationFrame(tick);

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (!frameId) {
          startedAt = performance.now();
          frameId = requestAnimationFrame(tick);
        }
      } else if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    });
    observer.observe(svg);

    return () => {
      observer.disconnect();
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
    };
  });
</script>

<div class="par-line">
  <p class="par-line-title">How a Post-Activity Report moves</p>

  <svg
    bind:this={host}
    class="par-line-svg"
    viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
    role="img"
    aria-label="A Post-Activity Report on a hanging conveyor: the registry issues its tracking number, the reviewer endorses or returns it, the approving officer seals it, and the approved report is filed."
  >
  </svg>

  <div class="par-line-stations">
    {#each STATIONS as station (station.id)}
      <button
        type="button"
        class="par-line-station"
        aria-describedby={`par-line-note-${station.id}`}
        onclick={() => select(station.id)}
      >
        {station.label}
      </button>
      <p class="sr-only" id={`par-line-note-${station.id}`}>{station.note}</p>
    {/each}
  </div>

  <div class="par-line-readout" aria-hidden="true">
    <p class="par-line-status">
      <span>{label}</span>
      <span class="par-line-number">{step.showsNumber ? number : 'No number issued'}</span>
    </p>
    <p class="par-line-caption">{step.caption}</p>
  </div>
</div>
