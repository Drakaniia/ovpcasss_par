/**
 * The routing line: the gantry beam, the shuttle rail and its hangers, the audit
 * ticker behind the rail, the suspended filing bin, and the parts that travel —
 * the trolley, its fork tray and the report on it.
 */
import {
  cylinder,
  dotsSvg,
  insetPlan,
  iso,
  lineOnTop,
  lineSvg,
  planOutline,
  ring,
  segment,
  sideSeam,
  slabOf,
  solidSvg,
  type Plan,
  type Point2,
} from './isometric';
import {
  BEAM,
  BEAM_H,
  BEAM_TOP,
  BEAM_Z,
  BIN,
  BIN_FLOOR,
  BIN_RIM,
  HEAD_TOP,
  P,
  PRESS_Y,
  RAIL_BOTTOM,
  RAIL_FROM,
  RAIL_TOP,
  RAIL_TO,
  RAIL_W,
  RAIL_WEB,
  SHEET_D,
  SHEET_W,
  STATION,
  TICKER,
  TRAY_D,
  TRAY_TOP,
  TRAY_W,
  TRAY_Y,
} from './par-line-layout';

const at = (point: [number, number, number]) => iso(point, P);
const S = solidSvg;
const L = lineSvg;
const D = dotsSvg;

const HANGER_X = [-140, -84, -28, 28, 84, 140];

/** The gantry beam: the only thing the whole line hangs from. */
export function beamParts(): string {
  const out: string[] = [];
  out.push(S(slabOf(BEAM, BEAM_Z, BEAM_H, P, 5, 1.2), { tone: 'mid' }));
  out.push(
    S(
      slabOf(
        { x: BEAM.x - 4, y: BEAM.y - 3, w: BEAM.w + 8, d: BEAM.d + 6, r: 4 },
        BEAM_TOP,
        5,
        P,
        5,
        0.7,
      ),
      { tone: 'mid' },
    ),
  );
  // A seam runs the length of the beam face, and a cable tray hangs under it.
  out.push(L(sideSeam(BEAM, BEAM_Z + 9, P, 5), { tone: 'faint' }));
  out.push(
    S(
      slabOf(
        { x: BEAM.x + 8, y: BEAM.y - 5, w: BEAM.w - 16, d: 6, r: 2 },
        BEAM_Z - 6,
        6,
        P,
        4,
        0.4,
      ),
      { tone: 'mid' },
    ),
  );
  out.push(
    L(lineOnTop([BEAM.x + 12, BEAM.y - 2], [BEAM.x + BEAM.w - 12, BEAM.y - 2], BEAM_Z, P), {
      tone: 'faint',
    }),
  );
  // Stiffener ribs stand proud of the front face, top to bottom.
  for (const rx of HANGER_X) {
    out.push(
      S(
        slabOf({ x: rx - 2.5, y: BEAM.y - 4.5, w: 5, d: 4.5, r: 1 }, BEAM_Z + 2, BEAM_H - 4, P, 3),
        { tone: 'mid', crease: 'none' },
      ),
    );
    out.push(
      D([at([rx, BEAM.y - 5, BEAM_Z + 11]), at([rx, BEAM.y - 5, BEAM_Z + 4])], {
        size: 0.36,
        tone: 'lo',
      }),
    );
  }
  // End cap plates, so the beam reads as a section of a longer line.
  for (const x of [BEAM.x - 4, BEAM.x + BEAM.w - 1]) {
    out.push(
      S(
        slabOf({ x, y: BEAM.y - 3, w: 5, d: BEAM.d + 6, r: 2 }, BEAM_Z - 3, BEAM_H + 8, P, 4, 0.5),
        {
          tone: 'mid',
        },
      ),
    );
  }
  // Ruler strip on the front face: its ticks hang from the strip's own top edge.
  const strip = { x: -140, y: BEAM.y - 4, w: 280, d: 3, r: 1 };
  out.push(S(slabOf(strip, BEAM_Z + 3, 4, P, 3), { tone: 'lo', crease: 'none' }));
  out.push(L(rulerTicks(strip), { tone: 'lo' }));
  out.push(
    L(
      [
        lineOnTop([strip.x, strip.y], [strip.x + strip.w, strip.y], BEAM_Z - 1, P),
        lineOnTop([strip.x, strip.y], [strip.x + strip.w, strip.y], BEAM_Z + 7, P),
      ].join(''),
      { tone: 'faint' },
    ),
  );
  return out.join('');
}

function rulerTicks(strip: Plan) {
  const ticks: string[] = [];
  for (let at = strip.x + 4, index = 0; at <= strip.x + strip.w - 4; at += 8, index += 1) {
    const length = index % 5 === 0 ? 3.4 : 1.8;
    ticks.push(
      lineSvg(
        segment([at, strip.y - 0.4, BEAM_Z + 3], [at, strip.y - 0.4, BEAM_Z + 3 - length], P),
        { tone: index % 5 === 0 ? 'mid' : 'lo' },
      ),
    );
  }
  return ticks.join('');
}

/** Rail hangers and the rail itself, with its end stops. */
export function railParts(): string {
  const out: string[] = [];
  for (const hx of HANGER_X) {
    out.push(
      S(slabOf({ x: hx - 5, y: -6, w: 10, d: 12, r: 2 }, BEAM_Z - 8, 8, P, 4, 0.4), {
        tone: 'mid',
      }),
    );
    out.push(S(cylinder(hx, 0, 1.9, 213, BEAM_Z - 213, P, 14), { tone: 'mid', crease: 'none' }));
    out.push(S(cylinder(hx, 0, 2.8, 220, 5, P, 14), { tone: 'mid' }));
    out.push(L([221, 229].map((z) => ring(hx, 0, 1.9, z, P, 12)).join(''), { tone: 'lo' }));
    out.push(
      S(slabOf({ x: hx - 7, y: -8, w: 14, d: 16, r: 2 }, RAIL_TOP + 3.5, 3.5, P, 4, 0.4), {
        tone: 'mid',
      }),
    );
    out.push(D([at([hx, -8.3, RAIL_TOP + 5.2])], { size: 0.36, tone: 'lo' }));
  }
  out.push(
    S(
      slabOf(
        { x: RAIL_FROM, y: -6, w: RAIL_TO - RAIL_FROM, d: RAIL_W, r: 1.5 },
        RAIL_TOP,
        3.5,
        P,
        4,
        0.4,
      ),
      {
        tone: 'mid',
      },
    ),
  );
  out.push(
    S(
      slabOf(
        { x: RAIL_FROM, y: -2.5, w: RAIL_TO - RAIL_FROM, d: 5, r: 1 },
        RAIL_WEB,
        RAIL_TOP - RAIL_WEB,
        P,
        3,
      ),
      {
        tone: 'mid',
        crease: 'none',
      },
    ),
  );
  out.push(
    S(
      slabOf(
        { x: RAIL_FROM, y: -5, w: RAIL_TO - RAIL_FROM, d: 10, r: 1.5 },
        RAIL_BOTTOM,
        RAIL_WEB - RAIL_BOTTOM,
        P,
        4,
        0.3,
      ),
      { tone: 'mid' },
    ),
  );
  const railBolts: Point2[] = [];
  for (let x = RAIL_FROM + 12; x <= RAIL_TO - 12; x += 28)
    railBolts.push(at([x, -5.1, RAIL_BOTTOM + 2]));
  out.push(D(railBolts, { size: 0.34, tone: 'lo' }));
  for (const x of [RAIL_FROM - 4, RAIL_TO]) {
    out.push(
      S(slabOf({ x, y: -8, w: 4, d: 16, r: 2 }, RAIL_BOTTOM - 1, 14, P, 4, 0.4), { tone: 'mid' }),
    );
    out.push(
      D([at([x + 2, -8.3, RAIL_TOP - 1]), at([x + 2, -8.3, RAIL_BOTTOM + 2])], { size: 0.36 }),
    );
  }
  return out.join('');
}

/** The audit ticker: a punched paper tape on a spindle, behind the rail. */
export function tickerParts(): string {
  const out: string[] = [];
  const cx = -105;
  const cy = 23;
  // Rear bracket and drop rods up to the beam.
  out.push(
    S(slabOf({ x: -134, y: 18, w: 56, d: 8, r: 2 }, BEAM_Z - 5, 5, P, 3, 0.4), { tone: 'mid' }),
  );
  for (const rx of [-128, -82]) {
    out.push(
      S(cylinder(rx, cy, 1.8, 214, BEAM_Z - 5 - 214, P, 12), { tone: 'mid', crease: 'none' }),
    );
    out.push(
      S(slabOf({ x: rx - 5, y: 18, w: 10, d: 10, r: 2 }, BEAM_Z - 10, 5, P, 3), { tone: 'mid' }),
    );
  }
  out.push(S(slabOf(TICKER, 196, 18, P, 4, 1), { tone: 'mid' }));
  out.push(S(slabOf(insetPlan(TICKER, 2), 214, 2.5, P, 4, 0.3), { tone: 'mid' }));
  out.push(L(planOutline(insetPlan(TICKER, 5), 216.5, P, 4), { tone: 'faint' }));
  // Tape roll on a vertical spindle.
  out.push(S(cylinder(cx, cy, 13, 216.5, 5.5, P, 36), { tone: 'hi', crease: 'lo' }));
  out.push(L([9.5, 6, 3].map((r) => ring(cx, cy, r, 222, P, 28)).join(''), { tone: 'lo' }));
  out.push(L(lineOnTop([cx, cy - 3], [cx, cy - 13], 222, P), { tone: 'mid' }));
  out.push(S(cylinder(cx, cy, 2.4, 216.5, 12, P, 14), { tone: 'mid' }));
  out.push(S(cylinder(cx, cy, 4, 228.5, 3, P, 16), { tone: 'mid' }));
  // The run of tape from the roll to the punch, with its sprocket holes.
  const runFrom: Point2 = [cx + 13, cy + 1];
  const runTo: Point2 = [cx + 24, cy - 8];
  out.push(
    L(
      [
        lineOnTop(runFrom, runTo, 222, P),
        lineOnTop([runFrom[0], runFrom[1] - 4.4], [runTo[0], runTo[1] - 4.4], 222, P),
      ].join(''),
      { tone: 'lo' },
    ),
  );
  const holes: Point2[] = [];
  for (let step = 0; step < 5; step += 1) {
    const share = (step + 0.5) / 5;
    holes.push(
      at([
        runFrom[0] + (runTo[0] - runFrom[0]) * share,
        runFrom[1] + (runTo[1] - runFrom[1]) * share,
        222.1,
      ]),
    );
  }
  out.push(D(holes, { size: 0.4, tone: 'mid' }));
  // Punch head: it taps the tape as the tape advances.
  out.push(
    `<g id="punch">${S(
      slabOf({ x: cx + 18, y: cy - 11, w: 13, d: 11, r: 2 }, 222, 5.5, P, 3, 0.4),
      { tone: 'mid' },
    )}${S(cylinder(cx + 24.5, cy - 5.5, 3.2, 227.5, 4, P, 16), { tone: 'mid' })}</g>`,
  );
  // Chad drawer and name plate on the front of the housing.
  out.push(S(slabOf({ x: -132, y: 2, w: 22, d: 5, r: 1.5 }, 202, 7, P, 3, 0.4), { tone: 'mid' }));
  out.push(L(lineOnTop([-129, 1.6], [-113, 1.6], 209, P), { tone: 'lo' }));
  out.push(D([at([-113, 1.7, 205])], { size: 0.38, tone: 'hi' }));
  out.push(
    S(slabOf({ x: -105, y: 2, w: 18, d: 2, r: 1 }, 204, 8, P, 3), { tone: 'lo', crease: 'none' }),
  );
  out.push(
    L(
      [
        lineOnTop([-102, 1.4], [-90, 1.4], 208, P),
        lineOnTop([-102, 1.4], [-94, 1.4], 206.4, P),
      ].join(''),
      { tone: 'lo', free: true },
    ),
  );
  return out.join('');
}

/** The filing bin, hanging from the beam on two long rods. */
export function binParts(): string {
  const out: string[] = [];
  for (const rx of [BIN.x - 3, BIN.x + BIN.w + 3]) {
    out.push(
      S(cylinder(rx, -28, 1.9, BIN_RIM, BEAM_Z - BIN_RIM, P, 14), { tone: 'mid', crease: 'none' }),
    );
    out.push(
      S(slabOf({ x: rx - 6, y: -33, w: 12, d: 14, r: 2 }, BEAM_Z - 6, 6, P, 3, 0.4), {
        tone: 'mid',
      }),
    );
    out.push(S(cylinder(rx, -28, 2.8, 186, 5, P, 14), { tone: 'mid' }));
    out.push(L([182, 192].map((z) => ring(rx, -28, 1.9, z, P, 12)).join(''), { tone: 'lo' }));
  }
  out.push(S(slabOf(BIN, BIN_FLOOR, 5, P, 4, 0.8), { tone: 'mid' }));
  const wall = BIN_RIM - BIN_FLOOR - 5;
  out.push(
    S(slabOf({ x: BIN.x, y: BIN.y, w: 3.5, d: BIN.d, r: 1.5 }, BIN_FLOOR + 5, wall, P, 4, 0.4), {
      tone: 'mid',
    }),
  );
  out.push(
    S(
      slabOf(
        { x: BIN.x + BIN.w - 3.5, y: BIN.y, w: 3.5, d: BIN.d, r: 1.5 },
        BIN_FLOOR + 5,
        wall,
        P,
        4,
        0.4,
      ),
      { tone: 'mid' },
    ),
  );
  out.push(
    S(
      slabOf(
        { x: BIN.x, y: BIN.y + BIN.d - 3.5, w: BIN.w, d: 3.5, r: 1.5 },
        BIN_FLOOR + 5,
        wall,
        P,
        4,
        0.4,
      ),
      { tone: 'mid' },
    ),
  );
  out.push(L(planOutline(insetPlan(BIN, 2), BIN_FLOOR + 5, P, 4), { tone: 'faint' }));
  // Filed reports, lying in the bin.
  for (let index = 0; index < 3; index += 1) {
    out.push(
      S(
        slabOf(
          { x: BIN.x + 6, y: BIN.y + 7, w: BIN.w - 12, d: BIN.d - 13, r: 1.5 },
          BIN_FLOOR + 5.3 + index * 0.8,
          0.6,
          P,
          3,
        ),
        { tone: 'lo', crease: 'none' },
      ),
    );
  }
  out.push(
    D(
      [
        at([BIN.x + 7, BIN.y - 0.2, BIN_FLOOR + 2]),
        at([BIN.x + BIN.w - 7, BIN.y - 0.2, BIN_FLOOR + 2]),
      ],
      {
        size: 0.36,
      },
    ),
  );
  return out.join('');
}

/** The trolley, its crossbars and rods, and the fork tray they carry. */
export function carrierParts(): string {
  const out: string[] = [];
  out.push(
    S(slabOf({ x: -13, y: -10, w: 26, d: 20, r: 3 }, RAIL_TOP + 3.5, 4.5, P, 4, 0.5), {
      tone: 'mid',
    }),
  );
  out.push(
    D([at([-9, -10, RAIL_TOP + 8]), at([9, -10, RAIL_TOP + 8])], { size: 0.36, tone: 'lo' }),
  );
  out.push(
    S(slabOf({ x: -5, y: -46, w: 10, d: 38, r: 2 }, RAIL_TOP + 3.5, 3, P, 3), {
      tone: 'mid',
      crease: 'none',
    }),
  );
  for (const barY of [-46, -12]) {
    out.push(S(slabOf({ x: -32, y: barY, w: 64, d: 5, r: 2 }, 206, 4, P, 3, 0.4), { tone: 'mid' }));
    out.push(
      D([at([-26, barY + 2.5, 210]), at([26, barY + 2.5, 210])], { size: 0.34, tone: 'lo' }),
    );
  }
  for (const [rx, ry] of [
    [-26, -43],
    [26, -43],
    [-26, -13],
    [26, -13],
  ]) {
    out.push(S(cylinder(rx, ry, 1.7, TRAY_TOP, 16, P, 12), { tone: 'mid', crease: 'none' }));
    out.push(S(cylinder(rx, ry, 2.8, TRAY_TOP, 1.4, P, 12), { tone: 'mid' }));
    out.push(S(cylinder(rx, ry, 2.8, 204, 2, P, 12), { tone: 'mid' }));
  }
  // Fork tray: two rails and a rear crossbar, so the report drops between them.
  const half = TRAY_W / 2;
  for (const x of [-half, half - 5]) {
    out.push(
      S(
        slabOf(
          { x, y: TRAY_Y - TRAY_D / 2, w: 5, d: TRAY_D, r: 1.5 },
          TRAY_TOP - 3.5,
          3.5,
          P,
          4,
          0.4,
        ),
        { tone: 'mid' },
      ),
    );
  }
  out.push(
    S(
      slabOf(
        { x: -half, y: TRAY_Y - TRAY_D / 2 - 3, w: TRAY_W, d: 4.5, r: 1.5 },
        TRAY_TOP - 3.5,
        3.5,
        P,
        4,
        0.4,
      ),
      { tone: 'mid' },
    ),
  );
  for (const x of [-20, 14]) {
    out.push(
      S(slabOf({ x, y: TRAY_Y - TRAY_D / 2 - 1, w: 7, d: 5, r: 1 }, TRAY_TOP, 2.6, P, 3, 0.3), {
        tone: 'mid',
      }),
    );
    out.push(
      D([at([x + 3.5, TRAY_Y - TRAY_D / 2 + 1, TRAY_TOP + 2.6])], { size: 0.32, tone: 'hi' }),
    );
  }
  return out.join('');
}

/** The report, lying on the fork tray. Marks are revealed as it moves. */
export function sheetParts(): string {
  const plan: Plan = { x: -SHEET_W / 2, y: TRAY_Y - SHEET_D / 2, w: SHEET_W, d: SHEET_D, r: 1.5 };
  const out: string[] = [
    `<path class="iso-shadow" d="${planOutline({ ...plan, x: plan.x + 1, y: plan.y + 2 }, TRAY_TOP + 0.05, P, 4)}"/>`,
  ];
  out.push(S(slabOf(plan, TRAY_TOP, 0.7, P, 4), { tone: 'hi' }));
  const rules: string[] = [];
  const left = plan.x + 4;
  const right = plan.x + plan.w - 4;
  for (let index = 0; index < 7; index += 1) {
    const y = plan.y + 7 + index * 3.4;
    const end = index === 6 ? right - 10 : right;
    rules.push(lineOnTop([left, y], [end, y], 190.7, P));
  }
  out.push(L(rules.join(''), { tone: 'faint', free: true }));
  out.push(
    L(lineOnTop([left, plan.y + 4], [left + 9, plan.y + 4], 190.7, P), { tone: 'mid', free: true }),
  );
  out.push(`<g id="mark-number" opacity="0">${stampMark(plan)}</g>`);
  out.push(
    `<g id="mark-endorse" opacity="0">${L(
      [
        lineOnTop([plan.x + 26, plan.y + 22], [plan.x + 40, plan.y + 22], 190.7, P),
        ring(plan.x + 37, plan.y + 26, 1.5, 190.72, P, 12),
      ].join(''),
      { tone: 'mid', free: true },
    )}</g>`,
  );
  out.push(
    `<g id="mark-approve" opacity="0"><path class="iso-mark" data-tone="lit" d="${planOutline(
      { x: plan.x + 4, y: plan.y + 22, w: 13, d: 5.5, r: 2.6 },
      190.72,
      P,
      8,
    )}"/>${L(ring(plan.x + 10.5, plan.y + 24.7, 3.8, 190.75, P, 18), { tone: 'lit' })}</g>`,
  );
  return out.join('');
}

function stampMark(plan: Plan) {
  const block = { x: plan.x + 25, y: plan.y + 3, w: 15, d: 6, r: 0.8 };
  return `<path class="iso-mark" data-tone="mid" d="${planOutline(block, 190.72, P, 3)}"/>${L(
    [
      lineOnTop([block.x + 2.5, block.y + 2.8], [block.x + 11, block.y + 2.8], 190.74, P),
      lineOnTop([block.x + 2.5, block.y + 4.2], [block.x + 8.5, block.y + 4.2], 190.74, P),
    ].join(''),
    { tone: 'paper', free: true },
  )}`;
}

/** Tie rods that hang each press head from the beam. */
export function pressRigParts(): string {
  const out: string[] = [];
  for (const sx of [STATION.registry, STATION.review, STATION.approve]) {
    for (const rx of [sx - 15, sx + 15]) {
      out.push(
        S(cylinder(rx, PRESS_Y, 1.8, HEAD_TOP, BEAM_Z - HEAD_TOP - 2, P, 12), {
          tone: 'mid',
          crease: 'none',
        }),
      );
      out.push(S(cylinder(rx, PRESS_Y, 2.6, 233, 4.5, P, 12), { tone: 'mid' }));
      out.push(L(ring(rx, PRESS_Y, 1.8, 232, P, 10), { tone: 'lo' }));
      out.push(
        S(slabOf({ x: rx - 4.5, y: PRESS_Y - 4.5, w: 9, d: 9, r: 2 }, BEAM_Z - 7, 5, P, 3, 0.3), {
          tone: 'mid',
        }),
      );
    }
  }
  return out.join('');
}
