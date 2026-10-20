/**
 * The stations the tray passes: three press heads hung from the beam. The
 * registry press stamps the tracking number, the review press carries a loupe
 * and a return lever, the approval press carries the seal.
 */
import {
  cylinder,
  dotsSvg,
  insetPlan,
  iso,
  knurl,
  lineOnTop,
  lineSvg,
  planOutline,
  radialTicks,
  ring,
  sideArc,
  slabOf,
  solidSvg,
  type Plan,
  type Point2,
} from './isometric';
import { HEAD_TOP, HEAD_Z, HEAD_H, P, PRESS_Y } from './par-line-layout';

export type PressKind = 'registry' | 'review' | 'approve';

const at = (point: [number, number, number]) => iso(point, P);
const S = solidSvg;
const L = lineSvg;
const D = dotsSvg;

const WIDTH: Record<PressKind, number> = { registry: 44, review: 38, approve: 48 };
const DEPTH: Record<PressKind, number> = { registry: 32, review: 28, approve: 34 };
const WHEEL: Record<PressKind, number> = { registry: 9, review: 8, approve: 10.5 };

/** Everything that stays put: the head, its handwheel, the register, the lever base. */
export function pressHead(kind: PressKind, sx: number): string {
  const out: string[] = [];
  const w = WIDTH[kind];
  const d = DEPTH[kind];
  const body: Plan = { x: sx - w / 2, y: PRESS_Y - d / 2, w, d, r: 4 };
  out.push(S(slabOf(body, HEAD_Z, HEAD_H, P, 4, 0.8), { tone: 'mid' }));
  out.push(S(slabOf(insetPlan(body, 2.5), HEAD_TOP, 2.5, P, 4, 0.3), { tone: 'mid' }));
  out.push(L(planOutline(insetPlan(body, 5), HEAD_TOP + 2.5, P, 4), { tone: 'faint' }));
  // The ram leaves the head through a bronze bushing.
  out.push(S(cylinder(sx, PRESS_Y, 5.6, HEAD_Z - 2.2, 2.2, P, 20), { tone: 'mid' }));
  out.push(L(sideArc(sx, PRESS_Y, 5.6, HEAD_Z - 2.2, P, 16), { tone: 'lo' }));
  // Ribs and bolts on the front face.
  for (const rx of [sx - w / 2 + 6, sx + w / 2 - 6]) {
    out.push(
      S(
        slabOf({ x: rx - 2, y: body.y - 2.5, w: 4, d: 2.5, r: 1 }, HEAD_Z + 1.5, HEAD_H - 3, P, 3),
        {
          tone: 'mid',
          crease: 'none',
        },
      ),
    );
  }
  const bolts = [sx - w / 2 + 4, sx + w / 2 - 4].flatMap((x) => [
    at([x, body.y - 0.3, HEAD_Z + 3]),
    at([x, body.y - 0.3, HEAD_TOP - 2.5]),
  ]);
  out.push(D(bolts, { size: 0.36, tone: 'lo' }));
  out.push(handwheel(kind, sx));
  if (kind === 'registry') out.push(register(sx, body.y));
  if (kind === 'approve') out.push(counterweight(sx, body));
  if (kind === 'review') out.push(leverBase(sx, body.y));
  return out.join('');
}

function handwheel(kind: PressKind, sx: number) {
  const out: string[] = [];
  const r = WHEEL[kind];
  const cy = PRESS_Y + (kind === 'approve' ? 9 : 7);
  const base = HEAD_TOP + 2.5;
  out.push(S(cylinder(sx, cy, r, base, 4, P, 28, 0.4), { tone: 'mid' }));
  out.push(L(knurl(sx, cy, r, base, base + 4, 30, P, 0.5), { tone: 'lo' }));
  out.push(L(ring(sx, cy, r - 1.6, base + 4, P, 28), { tone: 'lo' }));
  const ticks = radialTicks(sx, cy, r - 1.6, 20, 5, base + 4, [1.1, 2.4], P);
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }));
  out.push(S(cylinder(sx, cy, 2.8, base + 4, 3, P, 14), { tone: 'mid' }));
  out.push(L(lineOnTop([sx, cy], [sx, cy - r + 2.6], base + 4.1, P), { tone: 'hi' }));
  out.push(D([at([sx, cy, base + 7])], { size: 0.42, tone: 'hi' }));
  return out.join('');
}

/** Four register drums on the intake head: one step per number issued. */
function register(sx: number, faceY: number) {
  const out: string[] = [];
  const tray: Plan = { x: sx - 18, y: faceY + 1.5, w: 36, d: 11, r: 2 };
  out.push(S(slabOf(tray, HEAD_TOP + 2.5, 2.2, P, 3, 0.3), { tone: 'lo', crease: 'none' }));
  for (let index = 0; index < 4; index += 1) {
    const dx = sx - 12.75 + index * 8.5;
    const dy = faceY + 7;
    out.push(S(cylinder(dx, dy, 3.2, HEAD_TOP + 4.7, 1.8, P, 16), { tone: 'hi', crease: 'lo' }));
    out.push(L(ring(dx, dy, 3.2, HEAD_TOP + 6.5, P, 16), { tone: 'lo' }));
    const mark = lineOnTop([dx, dy], [dx, dy - 2.7], HEAD_TOP + 6.6, P);
    if (index === 3) {
      const [cx, cy] = at([dx, dy, HEAD_TOP + 6.6]);
      out.push(
        `<g id="register-units" data-cx="${cx.toFixed(2)}" data-cy="${cy.toFixed(2)}">${L(mark, { tone: 'mid' })}</g>`,
      );
    } else {
      out.push(L(mark, { tone: 'mid' }));
    }
  }
  return out.join('');
}

/** The approval press carries a counterweight so the seal falls under its own mass. */
function counterweight(sx: number, body: Plan) {
  const out: string[] = [];
  const back = body.y + body.d;
  out.push(
    S(slabOf({ x: sx - 3, y: back, w: 6, d: 12, r: 2 }, HEAD_TOP - 6, 3.5, P, 3), { tone: 'mid' }),
  );
  out.push(S(cylinder(sx, back + 12, 5.4, HEAD_TOP - 10, 7, P, 22), { tone: 'mid' }));
  out.push(L(sideArc(sx, back + 12, 5.4, HEAD_TOP - 5, P, 18), { tone: 'lo' }));
  out.push(D([at([sx, back + 12, HEAD_TOP - 3])], { size: 0.42, tone: 'lo' }));
  return out.join('');
}

/** Where the return lever is pinned: on the review head's front corner. */
export function leverPivot(sx: number, faceY: number): Point2 {
  return iso([sx + 13, faceY + 5, 231], P);
}

function leverBase(sx: number, faceY: number) {
  const out: string[] = [];
  out.push(
    S(slabOf({ x: sx + 8, y: faceY + 1, w: 10, d: 8, r: 2 }, HEAD_TOP + 1, 4, P, 3, 0.4), {
      tone: 'mid',
    }),
  );
  return out.join('');
}

/** The return lever, thrown to send a report back to its submitter. */
export function leverParts(sx: number, faceY: number) {
  const out: string[] = [];
  out.push(
    S(slabOf({ x: sx + 11, y: faceY + 3, w: 4, d: 4, r: 1.2 }, 231, 17, P, 3, 0.3), {
      tone: 'mid',
    }),
  );
  out.push(S(cylinder(sx + 13, faceY + 5, 3.6, 247, 4.5, P, 18), { tone: 'mid' }));
  out.push(L(sideArc(sx + 13, faceY + 5, 3.6, 251.5, P, 16), { tone: 'lo' }));
  out.push(D([at([sx + 13, faceY + 5, 251.5])], { size: 0.4, tone: 'lo' }));
  return out.join('');
}

/** The ram: piston, yoke and the working face (die, loupe or seal). */
export function pressRam(kind: PressKind, sx: number): string {
  const out: string[] = [];
  out.push(S(cylinder(sx, PRESS_Y, 2.6, 208, 7, P, 14), { tone: 'mid', crease: 'none' }));
  out.push(S(cylinder(sx, PRESS_Y, 3.8, 208, 2, P, 16), { tone: 'mid' }));
  out.push(L(sideArc(sx, PRESS_Y, 3.8, 210, P, 16), { tone: 'lo' }));
  const yoke: Plan = { x: sx - 11, y: PRESS_Y - 9, w: 22, d: 18, r: 2.5 };
  out.push(S(slabOf(yoke, 205.5, 4.5, P, 4, 0.4), { tone: 'hi' }));
  out.push(L(planOutline(insetPlan(yoke, 3), 210, P, 4), { tone: 'lo' }));
  out.push(
    D(
      [
        [yoke.x + 3.5, yoke.y + 3.5],
        [yoke.x + yoke.w - 3.5, yoke.y + 3.5],
        [yoke.x + 3.5, yoke.y + yoke.d - 3.5],
        [yoke.x + yoke.w - 3.5, yoke.y + yoke.d - 3.5],
      ].map(([x, y]) => at([x, y, 210])),
      { size: 0.34, tone: 'lo' },
    ),
  );
  if (kind === 'registry') {
    out.push(S(cylinder(sx, PRESS_Y, 7, 200.5, 2.6, P, 28, 0.3), { tone: 'hi' }));
    out.push(L(knurl(sx, PRESS_Y, 7, 200.5, 203.1, 28, P, 0.4), { tone: 'lo' }));
    out.push(L(ring(sx, PRESS_Y, 5, 200.45, P, 20), { tone: 'lo' }));
  } else if (kind === 'review') {
    out.push(S(cylinder(sx, PRESS_Y, 9.5, 200.5, 4, P, 32, 0.4), { tone: 'hi' }));
    out.push(L(knurl(sx, PRESS_Y, 9.5, 200.5, 204.5, 34, P, 0.5), { tone: 'lo' }));
    out.push(L(ring(sx, PRESS_Y, 7.4, 200.45, P, 26), { tone: 'mid' }));
    out.push(S(cylinder(sx, PRESS_Y, 6.2, 200.3, 0.5, P, 24), { tone: 'lo', crease: 'none' }));
  } else {
    out.push(S(cylinder(sx, PRESS_Y, 8.5, 200.5, 3.8, P, 30, 0.4), { tone: 'hi' }));
    out.push(L(knurl(sx, PRESS_Y, 8.5, 200.5, 204.3, 30, P, 0.5), { tone: 'lo' }));
    out.push(L(ring(sx, PRESS_Y, 6.2, 200.45, P, 24), { tone: 'mid' }));
  }
  return out.join('');
}
