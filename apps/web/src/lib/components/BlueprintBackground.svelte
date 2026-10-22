<script lang="ts">
  const rightDots: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 14; c++) rightDots.push({ x: 1278 + c * 21.5, y: 31 + r * 22.5 });
  for (let r = 0; r < 2; r++)
    for (let c = 6; c < 14; c++) rightDots.push({ x: 1278 + c * 21.5, y: 163 + r * 23 });

  function hatch(x: number, y: number, w: number, h: number): string[] {
    const lines: string[] = [];
    for (let i = 0; x + i * 6 + h * 0.5 <= x + w; i++)
      lines.push(`M${x + i * 6} ${y + h}l${h * 0.5} ${-h}`);
    return lines;
  }

  const topHatch = hatch(1438, 172, 88, 18);
  const bottomHatch = hatch(1438, 852, 114, 43);

  const contours: string[] = [];
  {
    const outer: Array<[number, number]> = [
      [0, 645],
      [50, 650],
      [100, 710],
      [140, 770],
      [175, 822],
      [218, 830],
      [226, 885],
      [233, 945],
      [120, 1090],
      [0, 1130],
    ];
    for (let i = 0; i < 10; i++) {
      const k = 1 - i * 0.085;
      const p = outer.map(([x, y]) => [(x * k).toFixed(1), (935 + (y - 935) * k).toFixed(1)]);
      contours.push(
        `M${p[0]}C${p[1]} ${p[2]} ${p[3]}C${p[4]} ${p[5]} ${p[6]}C${p[7]} ${p[8]} ${p[9]}`,
      );
    }
  }

  const nodeXs = [271, 303, 334, 366, 397, 429];
  const nodeYs = [861, 899, 937];
</script>

<div class="bp-bg" aria-hidden="true">
  <svg class="bp-tl" viewBox="0 0 360 330">
    <g class="line">
      <path d="M112 0A162 162 0 0 1 0 155" />
      <path d="M168 0A219.7 219.7 0 0 1 0 187" />
      <path d="M0 15L183 185" />
      <path d="M152 67H313" />
      <path d="M313 0V67" stroke-dasharray="4 3" />
      <path d="M313 67H356" stroke-dasharray="4 3" />
      <path d="M52 100V320" />
      <path d="M0 125H72" stroke-dasharray="4 3" />
    </g>
    <g class="dot">
      <circle cx="68" cy="67" r="2" /><circle cx="140" cy="92" r="2" />
      <circle cx="112" cy="126" r="2" /><circle cx="82" cy="154" r="2" />
      <circle cx="313" cy="67" r="2.5" /><circle cx="52" cy="272" r="2" />
      <path d="M52 98l-3 7h6zM52 322l-3-7h6zM357 67l-7-3v6zM72 125l-7-3v6z" />
    </g>
    <g class="line thin"><path d="M20 95h14M27 88v14" /></g>
    <g class="line thin"><path d="M171 228h14M178 221v14" /></g>
  </svg>

  <svg class="bp-tc" viewBox="600 0 230 175">
    <g class="line">
      <path d="M619 0A98 100 0 0 0 717 100A98 100 0 0 0 815 0" />
      <path d="M699 0V167" />
      <path d="M606 28Q620 108 700 112L818 115" stroke-dasharray="4 3" />
    </g>
    <g class="dot"><path d="M604 24l-3 8l6-1zM819 115l-7-3v6z" /></g>
    <g class="line thin"><path d="M661 41h10M666 36v10" /></g>
  </svg>

  <svg class="bp-tr" viewBox="1240 0 346 335">
    <g class="dot dim">
      {#each rightDots as d, i (i)}<circle cx={d.x} cy={d.y} r="1.1" />{/each}
    </g>
    <g class="line"
      >{#each topHatch as d, i (i)}<path {d} />{/each}</g
    >
    <g class="line thin"><path d="M1243 185h16M1251 177v16" /></g>
    <g class="line">
      <path d="M1407 247H1527" />
      <path d="M1368 262H1526" />
      <path d="M1557 222V325" />
      <path d="M1538 247H1573" />
    </g>
    <g class="dot">
      <circle cx="1407" cy="247" r="2" /><circle cx="1557" cy="247" r="2" />
      <path d="M1367 262l7-3v6z" />
    </g>
  </svg>

  <svg class="bp-bl" viewBox="0 620 545 372">
    <g class="line dim"
      >{#each contours as d, i (i)}<path {d} />{/each}</g
    >
    <g class="line dim">
      <path d="M256 827H452" />
      {#each nodeXs as x (x)}<path d={`M${x} 812V958`} />{/each}
      {#each nodeYs as y (y)}<path d={`M256 ${y}H445`} />{/each}
      <path d="M429 803V958" />
      <path class="thin" d="M421 829l3 6M431 829l3 6" />
      <path d="M430 861H540" stroke-dasharray="4 3" />
    </g>
    <g class="dot dim">
      {#each nodeXs as x (x)}
        {#each nodeYs as y (y)}<circle cx={x} cy={y} r="2.2" />{/each}
      {/each}
    </g>
    <g class="line thin"><path d="M69 630h16M77 622v16" /></g>
    <g class="line thin"><path d="M150 710h16M158 702v16" /></g>
    <g class="line thin"><path d="M221 962h14M228 955v14" /></g>
  </svg>

  <svg class="bp-br" viewBox="1000 470 586 522">
    <g class="line">
      <path d="M1552 482V788" />
      <path d="M1408 563H1552" />
      <path d="M1552 770V788" stroke-dasharray="3 3" />
      <circle cx="1255" cy="935" r="158" stroke-dasharray="5 4" />
      <path d="M1277 770V992" />
      <path d="M1015 932H1586" />
      <path d="M1252 871H1428" />
      <path d="M1417 814V992" />
    </g>
    <g class="dot">
      <circle cx="1552" cy="563" r="2.5" />
      <path
        d="M1552 480l-3 8h6zM1552 790l-3-8h6zM1407 563l7-3v6zM1015 932l7-3v6zM1417 812l-3 8h6z"
      />
    </g>
    <g class="line"
      >{#each bottomHatch as d, i (i)}<path {d} />{/each}</g
    >
  </svg>
</div>

<style>
  .bp-bg {
    background: var(--surface-blueprint);
    color: var(--blueprint-line);
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    position: absolute;
    z-index: 0;
  }

  .bp-bg > svg {
    height: auto;
    overflow: visible;
    position: absolute;
  }

  .bp-tl {
    left: 0;
    top: 0;
    width: 22.7%;
  }
  .bp-tc {
    left: 37.8%;
    top: 0;
    width: 14.5%;
  }
  .bp-tr {
    right: 0;
    top: 0;
    width: 21.8%;
  }
  .bp-bl {
    bottom: 0;
    left: 0;
    width: 34.4%;
  }
  .bp-br {
    bottom: 0;
    right: 0;
    width: 37%;
  }

  .line {
    fill: none;
    stroke: currentColor;
    stroke-width: 1;
  }
  .line.thin {
    stroke-width: 0.8;
  }
  .line.dim {
    opacity: 0.9;
  }
  .dot {
    fill: currentColor;
    stroke: none;
  }
  .dot.dim {
    opacity: 0.8;
  }

  @media (max-width: 640px) {
    .bp-tc {
      display: none;
    }
  }
</style>
