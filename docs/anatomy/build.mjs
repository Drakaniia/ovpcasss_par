import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "file:///C:/Users/Qwenzy/.agents/skills/anatomy/kit/iso-kit.mjs";
import * as G from "file:///C:/Users/Qwenzy/.agents/skills/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "file:///C:/Users/Qwenzy/.agents/skills/anatomy/kit/tube.mjs";
import * as A from "file:///C:/Users/Qwenzy/.agents/skills/anatomy/kit/audit.mjs";
import { kitScript } from "file:///C:/Users/Qwenzy/.agents/skills/anatomy/scripts/inline-kit.mjs";
import {
  DIAL_POSITIONS,
  TRACKING_NUMBER,
  WORKFLOW_STEPS,
  dialAngleRadForStatus,
  formatReadout,
} from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 640;
const HEIGHT = 390;
const AZIMUTH = 50;
const ELEVATION = 30;

// 1. Base plate & feet
const PLATE = { x: -136, y: -56, w: 272, d: 116, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [-126, -48, 72],
    [124, 48, 79],
    [-18, -38, 63],
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: AZIMUTH, elevation: ELEVATION },
);

const V = G.viewOf(P);
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const R = A.recorder(P);
const record = R.solid;

function put(name, ref, svg, shapes = [], { bias = 0, cls = "", attrs = "", ...rest } = {}) {
  return R.put({ name, at: ref, bias, svg, shapes, piece: "rig", cls, attrs, ...rest });
}

function box(name, [x0, y0, z0], [x1, y1, z1], style = {}, { r = 0.6, steps = 3, bevel = 0, extra = "", inner = "", bias = 0, cls = "", attrs = "", owner, ground = false } = {}) {
  const plan = { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r };
  const shape = record(A.slab(plan, z0, z1 - z0, { name, owner, ground }, steps));
  put(
    name,
    [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2],
    S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style, inner }) + extra,
    [shape],
    { bias, cls, attrs },
  );
  return shape;
}

function cyl(name, cx, cy, r, z0, h, style = {}, { steps = 32, bevel = 0, extra = "", inner = "", bias = 0, cls = "", attrs = "", owner, ground = false } = {}) {
  const shape = record(A.cylinder(cx, cy, r, z0, h, { name, owner, ground }));
  put(
    name,
    [cx, cy, z0 + h / 2],
    S(k.cylinder(cx, cy, r, z0, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra,
    [shape],
    { bias, cls, attrs },
  );
  return shape;
}

const CABLES = [];
function cable(name, points, r = 0.55, { tone = "mid", bend = 3.2, ends = [true, true], shells = [false, false], rings, maxLength = 14, bias = 0.05, limp = true, touch, bundle } = {}) {
  const route = G.fillet(points, Math.max(bend, r * 2.8), 10, { P, tube: r });
  const total = G.pathLength(route);
  const SHELL = Math.max(1.6, r * 2.4);
  const gaps = [...(shells[0] ? [[0, SHELL]] : []), ...(shells[1] ? [[total - SHELL, total]] : [])];
  R.route(name, route, r, { gaps, limp, touch, bundle, rims: shells.map((on) => (on ? r * 1.9 : r)), piece: "rig" });
  CABLES.push(name);
  tubePieces(route, r, P, { maxLength, spacing: Math.max(0.6, Math.min(1.4, r)), gaps, ...(rings ? { rings } : {}) }).forEach((piece, index) =>
    put(`${name}:${index}`, piece.mid, tubeSvg(piece, { tone }), [A.tube(piece.points, piece.radii)], {
      bias,
      route: name,
      chunk: index,
      attrs: ` data-route="${name}" data-chunk="${index}"`,
    }),
  );
  [0, 1].forEach((index) => {
    const end = index ? route[route.length - 1] : route[0];
    if (shells[index]) {
      const tangent = G.tangentAlong(route, index ? total : 0);
      const F = G.frameAlong(end, tangent);
      const [s0, s1] = index ? [-SHELL, 0] : [0, SHELL];
      const shape = record(A.disc(F, s0, s1, r * 1.9, { name: `${name}.shell${index}`, owner: name }));
      put(`${name}.shell${index}`, G.add3(end, G.mul3(tangent, (s0 + s1) / 2)), S(G.disc(s0, s1, r * 1.9, F, P, { steps: 20, bevel: 0.2 }), { tone: "mid" }), [shape], { bias: bias + 0.1 });
    } else if (ends[index]) {
      put(`${name}.end${index}`, end, Dots([at(end)], { size: Math.max(0.5, r * KS * 0.9), tone: "hi" }), [A.ball(end, Math.max(0.5, r * KS * 0.9) / KS, { name: `${name}.end${index}`, owner: name })], { bias: bias + 0.15 });
    }
  });
  return route;
}

// ============================================================================
// BASE PLATE, FEET, RULER STRIP & NAMEPLATE
// ============================================================================
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
  back.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  record(A.cylinder(x, y, 7, -PLATE_H - FOOT_H, FOOT_H, { name: "stand.foot", ground: true }));
}
back.push(
  S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), {
    tone: "mid",
    inner: Ln(k.sideSeam(PLATE, -4, P, 8), { tone: "faint" }),
  }),
);
back.push(Ln(k.planOutline(k.insetPlan(PLATE, 4.5), 0, P, 8), { tone: "lo" }));
const plateScrews = k.corners(PLATE, 9.5);
back.push(Ln(plateScrews.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
back.push(Dots(plateScrews.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
record(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate", ground: true }, 8));

// Front ruler strip on base plate
const STRIP = { x: -118, y: PLATE.y + PLATE.d - 12, w: 170, d: 6, r: 1 };
back.push(S(k.slabOf(STRIP, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
const stripTicks = k.topTicks(STRIP.x + 4, STRIP.x + STRIP.w - 4, 4, 5, STRIP.y, 0.6, [1.8, 3.4], P);
back.push(Ln(stripTicks.minor, { tone: "lo" }), Ln(stripTicks.major, { tone: "mid" }));
back.push(Dots([at([STRIP.x + 2, STRIP.y + 3, 0.6]), at([STRIP.x + STRIP.w - 2, STRIP.y + 3, 0.6])], { size: 0.42 }));
record(A.slab(STRIP, 0, 0.6, { name: "stand.ruler", ground: true }, 3));

// Engraved brass/gold institutional nameplate on front-right of base plate
const LABEL_PLATE = { x: 60, y: PLATE.y + PLATE.d - 14, w: 58, d: 9, r: 1.2 };
back.push(
  `<g class="par-gold-trim">${S(k.slabOf(LABEL_PLATE, 0, 0.8, P, 3), { tone: "mid", crease: "none" })}` +
    Ln(k.planOutline(k.insetPlan(LABEL_PLATE, 1.4), 0.8, P, 3), { tone: "faint" }) +
    Ln(
      [38, 26, 32]
        .map((w, i) => k.lineOnTop([LABEL_PLATE.x + 5, LABEL_PLATE.y + 2.5 + i * 2], [LABEL_PLATE.x + 5 + w, LABEL_PLATE.y + 2.5 + i * 2], 0.8, P))
        .join(""),
      { tone: "lo", free: true },
    ) +
    Dots(
      [
        at([LABEL_PLATE.x + 2.5, LABEL_PLATE.y + 4.5, 0.8]),
        at([LABEL_PLATE.x + LABEL_PLATE.w - 2.5, LABEL_PLATE.y + 4.5, 0.8]),
      ],
      { size: 0.42 },
    ) +
    `</g>`,
);
record(A.slab(LABEL_PLATE, 0, 0.8, { name: "stand.label", ground: true }, 3));

// ============================================================================
// MAIN TRACK RAILS & SUPPORT PEDESTALS (y = -8.5 and y = +8.5, x = -88 to +84)
// ============================================================================
const RAIL_X0 = -88;
const RAIL_X1 = 84;
const RAIL_Z0 = 10;
const RAIL_H = 3.2;

for (const rx of [-72, 24]) {
  box(
    `rail.stanchion.${rx}`,
    [rx - 3.5, -10.5, 0],
    [rx + 3.5, 10.5, RAIL_Z0],
    { tone: "lo" },
    {
      r: 0.8,
      steps: 2,
      extra: Dots([at([rx, -8.5, RAIL_Z0]), at([rx, 8.5, RAIL_Z0])], { size: 0.4 }),
    },
  );
}

// Far rail (y = -10.5..-6.5) and Near rail (y = 6.5..10.5) spanning x = -88 .. +84
box("rail.far", [RAIL_X0, -10.5, RAIL_Z0], [RAIL_X1, -6.5, RAIL_Z0 + RAIL_H], { tone: "mid" }, { r: 0.8, steps: 2, bevel: 0.4 });
{
  const rTicks = k.topTicks(RAIL_X0 + 6, RAIL_X1 - 6, 4, 5, 6.5, RAIL_Z0 + RAIL_H, [1.4, 2.6], P);
  box(
    "rail.near",
    [RAIL_X0, 6.5, RAIL_Z0],
    [RAIL_X1, 10.5, RAIL_Z0 + RAIL_H],
    { tone: "mid" },
    {
      r: 0.8,
      steps: 2,
      bevel: 0.4,
      extra: Ln(rTicks.minor, { tone: "lo" }) + Ln(rTicks.major, { tone: "mid" }),
    },
  );
}

// ============================================================================
// STATION 1: SUBMITTER INTAKE TRAY (x = -124 .. -88, y = -16 .. +16)
// ============================================================================
box(
  "intake.plinth",
  [-124, -16, 0],
  [-88, 16, 10],
  { tone: "lo" },
  {
    r: 2,
    steps: 4,
    bevel: 0.6,
    inner: Ln(k.sideSeam({ x: -124, y: -16, w: 36, d: 32, r: 2 }, 5, P, 4), { tone: "faint" }),
  },
);
box(
  "intake.bed",
  [-124, -14, 10],
  [-88, 14, 13.2],
  { tone: "mid" },
  {
    r: 1.6,
    steps: 3,
    bevel: 0.5,
    extra:
      Ln(k.planOutline({ x: -119, y: -10, w: 26, d: 20, r: 1.2 }, 13.2, P, 3), { tone: "lo" }) +
      Dots(
        [
          at([-121, -12, 13.2]),
          at([-91, -12, 13.2]),
          at([-121, 12, 13.2]),
          at([-91, 12, 13.2]),
        ],
        { size: 0.45 },
      ),
  },
);
// Back and side hopper guide rails on intake tray
box("intake.guide.far", [-122, -13.5, 13.2], [-90, -10.5, 17.5], { tone: "mid" }, { r: 0.6, steps: 2, bevel: 0.3 });
box("intake.guide.left", [-122, -10.5, 13.2], [-118.5, 10.5, 17.5], { tone: "mid" }, { r: 0.6, steps: 2, bevel: 0.3 });
// Optical presence sensor post at intake with decorative gold bezel
cyl("intake.sensor", -92, -12, 1.8, 17.5, 4, { tone: "hi" }, { steps: 20, cls: "par-gold-trim", extra: Dots([at([-92, -12, 21.5])], { size: 0.55, tone: "hi" }) });

// Station 1 Control: ONE filled navy push-button on left console of intake (x = -124..-112, y = 16..28)
box("intake.ctrl.pedestal", [-124, 16, 0], [-112, 28, 11], { tone: "mid" }, { r: 1.5, steps: 3, bevel: 0.4 });
cyl("intake.ctrl.bezel", -118, 22, 4.2, 11, 1.4, { tone: "lo" }, { steps: 28 });
cyl(
  "intake.ctrl.navy",
  -118,
  22,
  3.2,
  12.4,
  2.8,
  { tone: "hi" },
  {
    steps: 28,
    bevel: 0.4,
    cls: "par-navy-control",
    attrs: ' data-station="submit"',
    extra: Ln(k.knurl(-118, 22, 3.2, 12.8, 14.8, 24, P, 0.25), { tone: "lo" }),
  },
);

// ============================================================================
// STATION 2: TRACKING-NUMBER STAMPER (x = -54, y = 0)
// Punches OFF-2026-0001 once on first submission; cam latch holds it on resubmission
// ============================================================================
box("stamper.base.far", [-61, -21, 0], [-47, -10.5, 14], { tone: "lo" }, { r: 1.2, steps: 3, bevel: 0.4 });
box("stamper.base.near", [-61, 10.5, 0], [-47, 20, 14], { tone: "lo" }, { r: 1.2, steps: 3, bevel: 0.4 });
cyl(
  "stamper.col.far",
  -54,
  -15.5,
  2.6,
  14,
  32,
  { tone: "mid" },
  {
    steps: 24,
    inner: Ln(k.sideArc(-54, -15.5, 2.6, 24, P, 16) + k.sideArc(-54, -15.5, 2.6, 36, P, 16), { tone: "faint" }),
  },
);
cyl(
  "stamper.col.near",
  -54,
  15,
  2.6,
  14,
  32,
  { tone: "mid" },
  {
    steps: 24,
    inner: Ln(k.sideArc(-54, 15, 2.6, 24, P, 16) + k.sideArc(-54, 15, 2.6, 36, P, 16), { tone: "faint" }),
  },
);
box("stamper.anvil", [-60, -6.5, 0], [-48, 6.5, 13.2], { tone: "lo" }, { r: 1, steps: 2 });

// Stamper bridge yoke at z = 46..54
box(
  "stamper.yoke",
  [-61, -19, 46],
  [-47, 18.5, 54],
  { tone: "mid" },
  {
    r: 2,
    steps: 4,
    bevel: 0.6,
    inner: Ln(k.sideSeam({ x: -61, y: -19, w: 14, d: 37.5, r: 2 }, 50, P, 4), { tone: "faint" }),
    extra:
      Ln(k.planOutline({ x: -58.5, y: -16.5, w: 9, d: 32.5, r: 1.2 }, 54, P, 3), { tone: "faint" }) +
      Dots([at([-54, -15.5, 54]), at([-54, 15, 54])], { size: 0.5, tone: "hi" }),
  },
);

// Gold decorative bezel collar on stamper yoke top
cyl("stamper.collar.gold", -54, 0, 4.8, 54, 2.2, { tone: "mid" }, { steps: 28, bevel: 0.3, cls: "par-gold-trim" });

// Station 2 Control: ONE filled navy solenoid actuator cap on stamper top (z = 56.2 .. 61.5)
cyl(
  "stamper.cap.top",
  -54,
  0,
  3.4,
  56.2,
  5.2,
  { tone: "hi" },
  {
    steps: 28,
    bevel: 0.4,
    cls: "par-navy-control",
    attrs: ' data-move="stamp-ram" data-station="submit"',
    extra: Ln(k.knurl(-54, 0, 3.4, 56.8, 60.8, 22, P, 0.25), { tone: "lo" }),
  },
);

// Lower moving stamper ram & punch head below yoke (z = 25 .. 46)
cyl(
  "stamper.ram",
  -54,
  0,
  2.2,
  30,
  16,
  { tone: "hi" },
  {
    steps: 24,
    bevel: 0.3,
    attrs: ' data-move="stamp-ram"',
    extra: Ln(
      Array.from({ length: 5 }, (_, i) => k.ring(-54, 0, 3.4, 33 + i * 2.4, P, 20)).join(""),
      { tone: "mid" },
    ),
  },
);
box(
  "stamper.head",
  [-59.5, -6.2, 25],
  [-48.5, 6.2, 30],
  { tone: "hi" },
  {
    r: 1,
    steps: 3,
    bevel: 0.4,
    attrs: ' data-move="stamp-head"',
    extra: k.faceTextSvg(k.topMatrix([-54, 1.5], 30, P, "x"), "OFF-26", { size: 2.3, tone: "lo", anchor: "middle" }),
  },
);

// One-shot mechanical lockout cam pawl on the right side of the stamper yoke (flush at x = -47)
box(
  "stamper.pawl.mount",
  [-47, -4, 47],
  [-42.5, 4, 53],
  { tone: "lo" },
  { r: 0.6, steps: 2, extra: Dots([at([-44.5, 0, 53])], { size: 0.45 }) },
);
box(
  "stamper.pawl.latch",
  [-47, -2.2, 42],
  [-42.5, 2.2, 47],
  { tone: "hi" },
  { r: 0.5, steps: 2, bevel: 0.3, cls: "par-gold-trim", attrs: ' data-part="stamp-latch"' },
);

// ============================================================================
// STATION 3: REVIEWER'S INSPECTION DESK & DIVERT GATE (x = -24 .. +8)
// ============================================================================
box(
  "review.plinth",
  [-24, -18, 0],
  [8, 18, 10],
  { tone: "lo" },
  {
    r: 2,
    steps: 4,
    bevel: 0.5,
    inner: Ln(k.sideSeam({ x: -24, y: -18, w: 32, d: 36, r: 2 }, 5, P, 4), { tone: "faint" }),
  },
);
box(
  "review.bed",
  [-22, -6.5, 10],
  [6, 6.5, 13.2],
  { tone: "mid" },
  {
    r: 1.2,
    steps: 3,
    bevel: 0.4,
    extra: Ln(k.planOutline({ x: -19, y: -4.5, w: 22, d: 9, r: 0.8 }, 13.2, P, 3), { tone: "lo" }),
  },
);
box("review.deck.far", [-22, -16.5, 10], [6, -10.5, 13.2], { tone: "mid" }, { r: 1, steps: 2, bevel: 0.3 });
box("review.deck.near", [-22, 10.5, 10], [6, 18, 12.2], { tone: "mid" }, { r: 1, steps: 2, bevel: 0.3 });

// Optical inspection column & lens hood over Reviewer Desk (back deck y = -13.5)
cyl("review.post.base", -8, -13.5, 2.8, 13.2, 3, { tone: "lo" }, { steps: 24 });
cyl(
  "review.post",
  -8,
  -13.5,
  2.0,
  16.2,
  24,
  { tone: "mid" },
  { steps: 22, inner: Ln(k.sideArc(-8, -13.5, 2.0, 28, P, 16), { tone: "faint" }) },
);
box("review.arm", [-12, -15.5, 40.2], [-4, 1.5, 44], { tone: "mid" }, { r: 1, steps: 3, bevel: 0.4, extra: Dots([at([-8, -13.5, 44]), at([-8, -1, 44])], { size: 0.45 }) });
cyl(
  "review.lens.bezel",
  -8,
  -1,
  6.2,
  36.5,
  3.7,
  { tone: "hi" },
  {
    steps: 32,
    bevel: 0.4,
    cls: "par-gold-trim",
    extra: Ln(k.ring(-8, -1, 4.4, 40.2, P, 28), { tone: "lo" }),
  },
);

// Reviewer divert gate blade (flush beside pivot post at x = 2.0)
cyl("review.gate.pivot", 3.6, -4.5, 1.5, 13.2, 4.2, { tone: "lo" }, { steps: 18, extra: Dots([at([3.6, -4.5, 17.4])], { size: 0.45, tone: "hi" }) });
box(
  "review.gate.blade",
  [-11, -5.4, 13.2],
  [2.1, -3.6, 16.8],
  { tone: "hi" },
  { r: 0.4, steps: 2, bevel: 0.2, attrs: ' data-part="review-gate"' },
);

// Station 3 Control: ONE filled navy rotary knob on Reviewer front console deck (x = -16, y = 14)
cyl("review.ctrl.collar", -16, 14, 3.0, 12.2, 1.2, { tone: "lo" }, { steps: 28 });
cyl(
  "review.ctrl.navy",
  -16,
  14,
  2.5,
  13.4,
  3.4,
  { tone: "hi" },
  {
    steps: 28,
    bevel: 0.4,
    cls: "par-navy-control",
    attrs: ' data-station="review"',
    extra:
      Ln(k.knurl(-16, 14, 2.5, 13.8, 16.4, 20, P, 0.25), { tone: "lo" }) +
      Ln(k.lineOnTop([-16, 14], [-16, 16.1], 16.8, P), { tone: "hi", free: "start" }),
  },
);

// ============================================================================
// SEPARATION OF DUTIES GUARD BAR (x = 24, between Reviewer/Submitter & Approver)
// "A small separator bar keeps the submitter's hand out of the approver's press."
// ============================================================================
box("guard.foot.far", [20.5, -16, 0], [27.5, -10.5, 13.2], { tone: "lo" }, { r: 0.8, steps: 2 });
box("guard.foot.near", [20.5, 10.5, 0], [27.5, 16, 13.2], { tone: "lo" }, { r: 0.8, steps: 2 });
cyl("guard.post.far", 24, -13.2, 1.9, 13.2, 22, { tone: "mid" }, { steps: 20 });
cyl("guard.post.near", 24, 13.2, 1.9, 13.2, 22, { tone: "mid" }, { steps: 20 });
box(
  "guard.crossbar",
  [21.2, -15.5, 35.2],
  [26.8, 15.5, 39.2],
  { tone: "hi" },
  {
    r: 1,
    steps: 3,
    bevel: 0.5,
    cls: "par-gold-trim",
    extra:
      Ln(k.planOutline({ x: 22.4, y: -12, w: 3.2, d: 24, r: 0.6 }, 39.2, P, 2), { tone: "lo" }) +
      Dots([at([24, -13.2, 39.2]), at([24, 13.2, 39.2])], { size: 0.48, tone: "hi" }),
  },
);
box(
  "guard.shield",
  [23.1, -11.3, 22.5],
  [24.9, 11.3, 35.2],
  { tone: "mid" },
  {
    r: 0.4,
    steps: 2,
    inner: Ln(k.sideSeam({ x: 23.1, y: -11.3, w: 1.8, d: 22.6, r: 0.4 }, 28.5, P, 2), { tone: "faint" }),
  },
);

// ============================================================================
// STATION 4: APPROVER'S SEAL PRESS (x = 40 .. 72, y = -18 .. +18)
// ============================================================================
box(
  "approver.plinth",
  [40, -18, 0],
  [72, 18, 10],
  { tone: "lo" },
  {
    r: 2,
    steps: 4,
    bevel: 0.5,
    inner: Ln(k.sideSeam({ x: 40, y: -18, w: 32, d: 36, r: 2 }, 5, P, 4), { tone: "faint" }),
  },
);
box(
  "approver.bed",
  [42, -6.5, 10],
  [70, 6.5, 13.2],
  { tone: "mid" },
  {
    r: 1.2,
    steps: 3,
    bevel: 0.4,
    extra: Ln(k.ring(56, 0, 5.2, 13.2, P, 28), { tone: "lo" }),
  },
);
box("approver.deck.far", [42, -16.5, 10], [70, -10.5, 13.2], { tone: "mid" }, { r: 1, steps: 2, bevel: 0.3 });
box("approver.deck.near", [42, 10.5, 10], [70, 18, 12.2], { tone: "mid" }, { r: 1, steps: 2, bevel: 0.3 });

// Heavy twin columns of the Approver Seal Press (on the far/near decks at y = -13.5 and y = +13.5)
cyl(
  "approver.col.far",
  56,
  -13.5,
  2.5,
  13.2,
  36,
  { tone: "mid" },
  {
    steps: 24,
    inner: Ln(k.sideArc(56, -13.5, 2.5, 25, P, 16) + k.sideArc(56, -13.5, 2.5, 38, P, 16), { tone: "faint" }),
  },
);
cyl(
  "approver.col.near",
  56,
  13.5,
  2.5,
  12.2,
  37,
  { tone: "mid" },
  {
    steps: 24,
    inner: Ln(k.sideArc(56, 13.5, 2.5, 25, P, 16) + k.sideArc(56, 13.5, 2.5, 38, P, 16), { tone: "faint" }),
  },
);

// Press crown bridge at z = 49.2..58
box(
  "approver.crown",
  [48, -16.5, 49.2],
  [64, 16.5, 58],
  { tone: "mid" },
  {
    r: 2,
    steps: 4,
    bevel: 0.7,
    inner: Ln(k.sideSeam({ x: 48, y: -16.5, w: 16, d: 33, r: 2 }, 53.6, P, 4), { tone: "faint" }),
    extra:
      Ln(k.planOutline({ x: 50.5, y: -14, w: 11, d: 28, r: 1.2 }, 58, P, 3), { tone: "faint" }) +
      Dots([at([56, -13.5, 58]), at([56, 13.5, 58])], { size: 0.55, tone: "hi" }),
  },
);

// Decorative gold seal ring on the press crown top
cyl("approver.crown.gold", 56, 0, 5.6, 58, 2.2, { tone: "mid" }, { steps: 32, bevel: 0.3, cls: "par-gold-trim" });

// Upper press screw stem above crown gold ring (z = 60.2..64)
cyl("approver.screw.upper", 56, 0, 2.5, 60.2, 3.8, { tone: "hi" }, { steps: 24, attrs: ' data-move="seal-ram"' });

// Lower moving seal press screw & die head below crown (z = 26..49.2)
cyl(
  "approver.screw",
  56,
  0,
  2.5,
  31,
  18.2,
  { tone: "hi" },
  {
    steps: 24,
    bevel: 0.3,
    attrs: ' data-move="seal-ram"',
    extra: Ln(
      Array.from({ length: 6 }, (_, i) => k.ring(56, 0, 3.8, 34 + i * 2.2, P, 20)).join(""),
      { tone: "mid" },
    ),
  },
);
cyl(
  "approver.die",
  56,
  0,
  6.2,
  26,
  5,
  { tone: "hi" },
  {
    steps: 36,
    bevel: 0.5,
    cls: "par-gold-trim",
    attrs: ' data-move="seal-die"',
    extra: Ln(k.ring(56, 0, 4.5, 31, P, 28), { tone: "lo" }),
  },
);

// Station 4 Control: ONE filled navy fly-wheel / press cap at top of screw (z = 64..69)
cyl(
  "approver.ctrl.navy",
  56,
  0,
  8.2,
  64,
  4.8,
  { tone: "hi" },
  {
    steps: 40,
    bevel: 0.6,
    cls: "par-navy-control",
    attrs: ' data-move="seal-cap" data-station="approve"',
    extra:
      Ln(k.knurl(56, 0, 8.2, 64.6, 68.2, 36, P, 0.3), { tone: "lo" }) +
      Ln(k.ring(56, 0, 5.6, 68.8, P, 32), { tone: "faint" }) +
      Dots([at([56, 0, 68.8])], { size: 0.6, tone: "hi" }),
  },
);

// ============================================================================
// CONTINUOUS RETURN CHUTE (front track y = 21 .. 31, x = -98 .. +68)
// Maroon workflow accent: "The return chute feeds back to the intake, so a returned report is clearly the same document moving backwards, not a new one."
// Built in 5 flush contiguous spans so every pier, bed, and curb sorts cleanly with zero gaps!
// ============================================================================
const CHUTE_SPANS = [
  [-98, -66],
  [-66, -32],
  [-32, 2],
  [2, 36],
  [36, 68],
];
CHUTE_SPANS.forEach(([x0, x1], idx) => {
  const cx = (x0 + x1) / 2;
  box(
    `chute.pier.${idx}`,
    [cx - 3.5, 22.5, 0],
    [cx + 3.5, 29.5, 10.0],
    { tone: "lo" },
    { r: 0.8, steps: 2 },
  );
  box(
    `chute.bed.${idx}`,
    [x0, 21, 10.0],
    [x1, 30.2, 12.2],
    { tone: "mid" },
    {
      r: 0.4,
      steps: 2,
      bevel: 0.25,
      cls: "par-maroon-chute",
      extra: Dots([at([x0 + 5, 25.6, 12.2]), at([x1 - 5, 25.6, 12.2])], { size: 0.36, tone: "lo" }),
    },
  );
  // Near curb on each span
  box(
    `chute.curb.near.${idx}`,
    [x0, 28.6, 12.2],
    [x1, 30.2, 14.4],
    { tone: "mid" },
    { r: 0.3, steps: 2, bevel: 0.2, cls: "par-maroon-chute" },
  );
});

// Far curb segments with openings at Intake (-98..-90), Reviewer (-12..-4), and Approver (58..68)
box("chute.curb.far.0", [-90, 21, 12.2], [-66, 22.5, 14.4], { tone: "mid" }, { r: 0.3, steps: 2, cls: "par-maroon-chute" });
box("chute.curb.far.1", [-66, 21, 12.2], [-32, 22.5, 14.4], { tone: "mid" }, { r: 0.3, steps: 2, cls: "par-maroon-chute" });
box("chute.curb.far.2", [-32, 21, 12.2], [-12, 22.5, 14.4], { tone: "mid" }, { r: 0.3, steps: 2, cls: "par-maroon-chute" });
box("chute.curb.far.3", [-4, 21, 12.2], [36, 22.5, 14.4], { tone: "mid" }, { r: 0.3, steps: 2, cls: "par-maroon-chute" });
box("chute.curb.far.4", [36, 21, 12.2], [58, 22.5, 14.4], { tone: "mid" }, { r: 0.3, steps: 2, cls: "par-maroon-chute" });

// Crossover transfer bridges connecting Reviewer (x=-12..-4, y=18..21) and Approver (x=58..66, y=18..21) to Return Chute
box(
  "chute.branch.rev",
  [-12, 18, 10.0],
  [-4, 21, 12.2],
  { tone: "mid" },
  {
    r: 0.4,
    steps: 2,
    cls: "par-maroon-chute",
    extra: Ln(k.lineOnTop([-10, 18], [-10, 21], 12.2, P) + k.lineOnTop([-6, 18], [-6, 21], 12.2, P), { tone: "lo" }),
  },
);
box(
  "chute.branch.app",
  [58, 18, 10.0],
  [66, 21, 12.2],
  { tone: "mid" },
  {
    r: 0.4,
    steps: 2,
    cls: "par-maroon-chute",
    extra: Ln(k.lineOnTop([60, 18], [60, 21], 12.2, P) + k.lineOnTop([64, 18], [64, 21], 12.2, P), { tone: "lo" }),
  },
);
// Return feed ramp at Intake (x=-98..-90, y=16..21) returning token into intake tray
box(
  "chute.return.intake",
  [-98, 16, 10.0],
  [-90, 21, 12.2],
  { tone: "mid" },
  {
    r: 0.4,
    steps: 2,
    cls: "par-maroon-chute",
    extra: Ln(k.lineOnTop([-96, 16], [-96, 21], 12.2, P) + k.lineOnTop([-92, 16], [-92, 21], 12.2, P), { tone: "lo" }),
  },
);

// ============================================================================
// STATION 5: CARD-INDEX DRAWER & GLASS LIGHT-ARCHIVE CYLINDER (x = 84 .. 124)
// ============================================================================
box(
  "archive.cabinet",
  [84, -22, 0],
  [124, 22, 26],
  { tone: "mid" },
  {
    r: 2.2,
    steps: 4,
    bevel: 0.8,
    inner: Ln(k.sideSeam({ x: 84, y: -22, w: 40, d: 44, r: 2.2 }, 13, P, 4), { tone: "faint" }),
    extra:
      Ln(k.planOutline({ x: 87, y: -19, w: 34, d: 38, r: 1.5 }, 26, P, 4), { tone: "lo" }) +
      Dots([at([87, -19, 26]), at([121, -19, 26]), at([87, 19, 26]), at([121, 19, 26])], { size: 0.5 }),
  },
);

// Sliding Card-Index Drawer extending from the front (+y = 22) face of the archive cabinet
box(
  "archive.drawer.box",
  [90, 22, 4],
  [118, 29, 21],
  { tone: "lo" },
  {
    r: 1,
    steps: 2,
    attrs: ' data-move="drawer"',
    extra: Ln(
      [1.5, 3.5, 5.5].map((dy) => k.lineOnTop([90, 22 + dy], [118, 22 + dy], 21, P)).join(""),
      { tone: "mid" },
    ),
  },
);
box(
  "archive.drawer.front",
  [88, 29, 3],
  [120, 32, 22],
  { tone: "hi" },
  {
    r: 1.2,
    steps: 3,
    bevel: 0.4,
    attrs: ' data-move="drawer"',
    inner: Ln(k.sideSeam({ x: 88, y: 29, w: 32, d: 3, r: 1.2 }, 12.5, P, 3), { tone: "faint" }),
  },
);
// Brass label frame and navy pull handle on the card-index drawer front
box(
  "archive.drawer.frame",
  [96, 32, 13.5],
  [112, 33.2, 19.5],
  { tone: "mid" },
  {
    r: 0.4,
    steps: 2,
    cls: "par-gold-trim",
    attrs: ' data-move="drawer"',
    extra: Dots([at([97.5, 33.2, 16.5]), at([110.5, 33.2, 16.5])], { size: 0.4 }),
  },
);
// Station 5 Control: ONE filled navy drawer pull handle on the card-index drawer
box(
  "archive.ctrl.navy",
  [98, 32, 6.5],
  [110, 35.2, 10.2],
  { tone: "hi" },
  {
    r: 0.8,
    steps: 2,
    bevel: 0.3,
    cls: "par-navy-control",
    attrs: ' data-move="drawer" data-station="archive"',
  },
);

// Glass Light-Archive Cylinder mounted atop the Card-Index Cabinet (x = 104, y = 0, z = 26..76)
cyl("archive.base.ring", 104, 0, 13.5, 26, 3.5, { tone: "lo" }, { steps: 44, bevel: 0.5 });
cyl("archive.plinth.gold", 104, 0, 12.2, 29.5, 2.0, { tone: "mid" }, { steps: 44, bevel: 0.3, cls: "par-gold-trim" });

// Outer glass cylinder wall & luminous light-core stacks inside
{
  const glassRings = [36, 42, 48, 54, 60, 66]
    .map((z) => k.ring(104, 0, 7.6, z, P, 36))
    .join("");
  const coreDiscs = [36, 42, 48, 54, 60, 66]
    .map((z, idx) => `<path class="par-light-disc" data-disc="${idx}" d="${k.ring(104, 0, 6.4, z, P, 32)}"/>`)
    .join("");
  cyl(
    "archive.glass",
    104,
    0,
    11.2,
    31.5,
    40,
    { tone: "hi" },
    {
      steps: 48,
      bevel: 0.5,
      cls: "par-glass-cylinder",
      attrs: ' data-part="archive-glass"',
      inner: Ln(k.sideArc(104, 0, 11.2, 44, P, 32) + k.sideArc(104, 0, 11.2, 58, P, 32), { tone: "faint" }),
      extra: `<g class="par-archive-cores" data-part="archive-cores">${coreDiscs}${Ln(glassRings, { tone: "mid" })}</g>`,
    },
  );
}
// 4 vertical brass tie-rods around the glass cylinder
for (const [idx, [tx, ty]] of [
  [104 - 12.2, -4],
  [104 + 12.2, -4],
  [104 - 4, 12.2],
  [104 + 4, -12.2],
].entries()) {
  cyl(`archive.rod.${idx}`, tx, ty, 0.75, 29.5, 42, { tone: "mid" }, { steps: 14, cls: "par-gold-trim" });
}
// Archive cylinder top cap & finial
cyl(
  "archive.cap",
  104,
  0,
  12.4,
  71.5,
  4.2,
  { tone: "mid" },
  {
    steps: 44,
    bevel: 0.6,
    extra:
      Ln(k.knurl(104, 0, 12.4, 72.2, 75.2, 48, P, 0.3), { tone: "lo" }) +
      Ln(k.ring(104, 0, 9.2, 75.7, P, 36), { tone: "lo" }),
  },
);
cyl("archive.finial.gold", 104, 0, 3.8, 75.7, 3.2, { tone: "hi" }, { steps: 28, bevel: 0.4, cls: "par-gold-trim", extra: Dots([at([104, 0, 78.9])], { size: 0.55, tone: "hi" }) });

// ============================================================================
// STATUS DIAL TURRET (7 true positions, back-center x = -18, y = -38, z = 0..64)
// ============================================================================
const DIAL_X = -18;
const DIAL_Y = -38;
const DIAL_Z0 = 52;
const DIAL_H = 9;
const DIAL_TOP = DIAL_Z0 + DIAL_H;
const DIAL_R = 23;

box(
  "dial.pedestal",
  [DIAL_X - 16, DIAL_Y - 11, 0],
  [DIAL_X + 16, DIAL_Y + 10, 18],
  { tone: "lo" },
  {
    r: 2.2,
    steps: 4,
    bevel: 0.6,
    inner: Ln(k.sideSeam({ x: DIAL_X - 16, y: DIAL_Y - 11, w: 32, d: 21, r: 2.2 }, 9, P, 4), { tone: "faint" }),
    extra: Dots(
      [
        at([DIAL_X - 12, DIAL_Y - 7, 18]),
        at([DIAL_X + 12, DIAL_Y - 7, 18]),
        at([DIAL_X - 12, DIAL_Y + 6, 18]),
        at([DIAL_X + 12, DIAL_Y + 6, 18]),
      ],
      { size: 0.48 },
    ),
  },
);
cyl("dial.collar", DIAL_X, DIAL_Y, 6.8, 18, 4, { tone: "mid" }, { steps: 28, bevel: 0.4, cls: "par-gold-trim" });
cyl(
  "dial.column",
  DIAL_X,
  DIAL_Y,
  4.6,
  22,
  DIAL_Z0 - 22,
  { tone: "mid" },
  {
    steps: 28,
    inner: Ln(k.sideArc(DIAL_X, DIAL_Y, 4.6, 32, P, 20) + k.sideArc(DIAL_X, DIAL_Y, 4.6, 42, P, 20), { tone: "faint" }),
  },
);

// Status Dial Puck with 7 true index detents
{
  const minorTicks = k.radialTicks(DIAL_X, DIAL_Y, DIAL_R - 2.8, 28, 4, DIAL_TOP, [1.1, 2.0], P);
  const trueTicks = DIAL_POSITIONS.map((pos) => {
    const a = (pos.angleDeg * Math.PI) / 180;
    const rOut = DIAL_R - 2.0;
    const rIn = DIAL_R - 5.2;
    return k.lineOnTop(
      [DIAL_X + Math.sin(a) * rOut, DIAL_Y - Math.cos(a) * rOut],
      [DIAL_X + Math.sin(a) * rIn, DIAL_Y - Math.cos(a) * rIn],
      DIAL_TOP,
      P,
    );
  }).join("");
  const detentDots = DIAL_POSITIONS.map((pos) => {
    const a = (pos.angleDeg * Math.PI) / 180;
    const rDot = DIAL_R - 7.4;
    return at([DIAL_X + Math.sin(a) * rDot, DIAL_Y - Math.cos(a) * rDot, DIAL_TOP]);
  });

  cyl(
    "dial.case",
    DIAL_X,
    DIAL_Y,
    DIAL_R,
    DIAL_Z0,
    DIAL_H,
    { tone: "hi" },
    {
      steps: 64,
      bevel: 0.8,
      inner: Ln(k.sideArc(DIAL_X, DIAL_Y, DIAL_R, DIAL_TOP - 3.2, P, 40), { tone: "faint" }),
      extra:
        Ln(k.knurl(DIAL_X, DIAL_Y, DIAL_R, DIAL_TOP - 3.2, DIAL_TOP, 72, P, 0.3), { tone: "lo" }) +
        `<g class="par-gold-trim">${Ln(k.ring(DIAL_X, DIAL_Y, DIAL_R - 2.0, DIAL_TOP, P, 64), { tone: "mid" })}</g>` +
        Ln(minorTicks.minor, { tone: "faint" }) +
        Ln(trueTicks, { tone: "hi" }) +
        Dots(detentDots, { size: 0.58, tone: "hi" }) +
        Ln(k.ring(DIAL_X, DIAL_Y, 2.4, DIAL_TOP, P, 20), { tone: "mid" }),
    },
  );
}

// ============================================================================
// CABLE RUNS WITH CONNECTORS
// ============================================================================
box(
  "dial.junction",
  [-30, -28, 2],
  [-6, -24, 11],
  { tone: "mid" },
  {
    r: 0.8,
    steps: 2,
    extra: Dots(
      [-26, -21, -15, -10].map((jx) => at([jx, -24, 9.2])),
      { size: 0.45, tone: "hi" },
    ),
  },
);

cable(
  "cable.intake",
  [
    [-34, -38, 5],
    [-104, -38, 5],
    [-104, -16, 5],
  ],
  0.55,
  { tone: "mid", bend: 4, shells: [true, true] },
);

cable(
  "cable.stamper",
  [
    [-26, -24, 5.5],
    [-26, -15.5, 5.5],
    [-47, -15.5, 5.5],
  ],
  0.55,
  { tone: "mid", bend: 3.5, shells: [true, true] },
);

cable(
  "cable.approver",
  [
    [-2, -34, 5],
    [56, -34, 5],
    [56, -18, 5],
  ],
  0.55,
  { tone: "mid", bend: 4, shells: [true, true] },
);

cable(
  "cable.archive",
  [
    [-2, -42, 6],
    [104, -42, 6],
    [104, -22, 6],
  ],
  0.6,
  { tone: "mid", bend: 4.5, shells: [true, true], rings: { pitch: 2.2, twist: 0.7, cross: true, fade: [0.1, 0.55] } },
);

// ============================================================================
// REPORT TOKEN CARRIAGE (the ONE `lit` part that travels through the machine)
// ============================================================================
function buildTokenAtOrigin() {
  const plan = { x: -8.5, y: -5.2, w: 17, d: 10.4, r: 1.4 };
  const out = [];
  out.push(S(k.slabOf(plan, 0, 2.8, P, 4, 0.5), { tone: "hi", lit: true }));
  out.push(Ln(k.planOutline(k.insetPlan(plan, 1.5), 2.8, P, 3), { tone: "lo" }));
  out.push(
    Dots(
      [
        at([-6.8, -3.6, 2.8]),
        at([6.8, -3.6, 2.8]),
        at([-6.8, 3.6, 2.8]),
        at([6.8, 3.6, 2.8]),
      ],
      { size: 0.42, tone: "lo" },
    ),
  );
  out.push(
    `<g data-part="token-stamp" style="opacity:0">${k.faceTextSvg(
      k.topMatrix([0, 1.1], 2.82, P, "x"),
      "OFF-26",
      { size: 2.5, tone: "hi", anchor: "middle" },
    )}</g>`,
  );
  out.push(
    `<g data-part="token-blank">${Ln(k.lineOnTop([-4.5, 0], [4.5, 0], 2.82, P), { tone: "lo", free: true })}</g>`,
  );
  return out.join("");
}

function dialNeedleAt(angleRad) {
  const tail = 4.2;
  const tip = DIAL_R - 4.2;
  return k.lineOnTop(
    [DIAL_X - Math.sin(angleRad) * tail, DIAL_Y + Math.cos(angleRad) * tail],
    [DIAL_X + Math.sin(angleRad) * tip, DIAL_Y - Math.cos(angleRad) * tip],
    DIAL_TOP + 0.25,
    P,
  );
}

// Partition items into 3 true depth tiers for the live moving token:
// Tier 0 (bias -160): everything under or behind the main track (z <= 13.2 or y < -3.5)
// Tier 1 (bias    0): overhead bridges/heads, near-side station columns/decks, archive cabinet, and return chute beds & far curbs
// Tier 2 (bias +160): return chute near curbs & archive drawer front (in front of a token in the return chute)
const TIER0 = new Set([
  "rail.stanchion.-72",
  "rail.stanchion.24",
  "rail.far",
  "rail.near",
  "intake.plinth",
  "intake.bed",
  "intake.guide.far",
  "intake.guide.left",
  "intake.sensor",
  "stamper.base.far",
  "stamper.col.far",
  "stamper.anvil",
  "review.plinth",
  "review.bed",
  "review.deck.far",
  "review.post.base",
  "review.post",
  "review.gate.pivot",
  "review.gate.blade",
  "guard.foot.far",
  "guard.post.far",
  "approver.plinth",
  "approver.bed",
  "approver.deck.far",
  "approver.col.far",
  "dial.pedestal",
  "dial.collar",
  "dial.column",
  "dial.case",
  "dial.junction",
]);
const TIER2 = new Set([
  "chute.curb.near.0",
  "chute.curb.near.1",
  "chute.curb.near.2",
  "chute.curb.near.3",
  "chute.curb.near.4",
  "archive.drawer.box",
  "archive.drawer.front",
  "archive.drawer.frame",
  "archive.ctrl.navy",
]);

for (const item of R.items) {
  if (TIER0.has(item.name) || item.name.startsWith("cable.")) {
    item.key -= 160;
  } else if (TIER2.has(item.name)) {
    item.key += 160;
  }
}

// Settle painter's order across all recorded items
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);

// Find the exact boundary after Tier 0 (main track slot) and before Tier 2 (chute slot)
let trackSlotAfter = 0;
let chuteSlotAfter = 0;
R.items.forEach((item, idx) => {
  if (TIER0.has(item.name) || item.name.startsWith("cable.")) trackSlotAfter = Math.max(trackSlotAfter, idx);
  if (!TIER2.has(item.name)) chuteSlotAfter = Math.max(chuteSlotAfter, idx);
});

const initialPos = WORKFLOW_STEPS[0].tokenWaypoints[0];
const initialNeedleAngle = dialAngleRadForStatus("DRAFT");

const sortedSvg = R.items
  .map((item, idx) => {
    const clsAttr = item.cls ? `it ${item.cls}` : "it";
    const g = `<g class="${clsAttr}" data-name="${item.name}"${item.attrs ?? ""}>${item.svg}</g>`;
    let extra = "";
    if (idx === trackSlotAfter) {
      extra += `<g data-slot="track"><g data-part="token" transform="${k.translateAlong(P, initialPos)}">${buildTokenAtOrigin()}</g></g>`;
    }
    if (idx === chuteSlotAfter) {
      extra += `<g data-slot="chute"></g>`;
    }
    return g + extra;
  })
  .join("");

const dialNeedleSvg = `<path data-part="dial-needle" class="iso-line" data-tone="lit" data-free="both" d="${dialNeedleAt(initialNeedleAngle)}" style="stroke-width:1.25"/>`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A benchtop mail-room sorting machine for the OVPCASSS paperless Post-Activity Report workflow. From left to right along twin tick-ruled rails: an intake tray with a navy submit button, a tracking-number stamper that punches OFF-2026-0001 once onto the report token and latches out on resubmission, a reviewer's inspection desk with an optical lens and a front return chute that carries returned tokens backwards to the intake, a separation-of-duties guard bar, an approver's seal press, and a card-index drawer under a glass cylinder that stores approved reports as rings of light. Behind the track stands a 7-position status dial.",
  body: [...back, `<g class="par-machine">${sortedSvg}</g>`, dialNeedleSvg],
});

const CSS = `
/* Institutional OVPCASSS palette accents layered onto Anatomy tokens */
.iso {
  --par-navy-fill: #1f3363;
  --par-navy-top: #2c4785;
  --par-navy-edge: #93b4ff;
  --par-gold-fill: #5c4314;
  --par-gold-top: #7d5c1d;
  --par-gold-edge: #d3a44f;
  --par-maroon-fill: #3d1618;
  --par-maroon-top: #521d20;
  --par-maroon-edge: #c96565;
  --par-glass-fill: #192847;
  --par-glass-lit: #8abfff;
}
.iso[data-theme="light"] {
  --anatomy-page: #f5f4f1;
  --anatomy-card: #faf8f4;
  --anatomy-paper: #faf8f4;
  --anatomy-text: #5b6272;
  --anatomy-strong: #14203c;
  --anatomy-muted: #6e7687;
  --anatomy-lit: #0f1a33;
  --anatomy-lit-top: #ffffff;
  --anatomy-lit-shade: #e9edf6;
  --par-navy-fill: #1e2c52;
  --par-navy-top: #2c3f70;
  --par-navy-edge: #0f1a33;
  --par-gold-fill: #e8d5ab;
  --par-gold-top: #f6efdd;
  --par-gold-edge: #b8862b;
  --par-maroon-fill: #f0d2d2;
  --par-maroon-top: #fbeaea;
  --par-maroon-edge: #9e2a2a;
  --par-glass-fill: #e9edf6;
  --par-glass-lit: #1e2c52;
}

/* One filled navy control per station */
.par-navy-control > .iso-solid > .iso-top { fill: var(--par-navy-top); }
.par-navy-control > .iso-solid > .iso-shade { fill: var(--par-navy-fill); }
.par-navy-control > .iso-solid > .iso-edge { stroke: var(--par-navy-edge); stroke-width: 0.75px; }
.par-navy-control { cursor: pointer; }

/* Decorative gold accents (never a button) */
.par-gold-trim > .iso-solid > .iso-top { fill: var(--par-gold-top); }
.par-gold-trim > .iso-solid > .iso-shade { fill: var(--par-gold-fill); }
.par-gold-trim > .iso-solid > .iso-edge { stroke: var(--par-gold-edge); }
.par-gold-trim > .iso-line { stroke: var(--par-gold-edge); }

/* Maroon return chute ("sent back" in workflow contexts) */
.par-maroon-chute > .iso-solid > .iso-top { fill: var(--par-maroon-top); }
.par-maroon-chute > .iso-solid > .iso-shade { fill: var(--par-maroon-fill); }
.par-maroon-chute > .iso-solid > .iso-edge { stroke: var(--par-maroon-edge); }

/* Glass archive cylinder storing finished reports as light */
.par-glass-cylinder > .iso-solid > .iso-fill { fill: var(--par-glass-fill); fill-opacity: 0.42; }
.par-glass-cylinder > .iso-solid > .iso-shade { fill: var(--par-glass-fill); fill-opacity: 0.28; }
.par-glass-cylinder > .iso-solid > .iso-top { fill: var(--par-glass-fill); fill-opacity: 0.52; }
.par-light-disc {
  fill: var(--par-glass-lit);
  fill-opacity: var(--archive-glow, 0.16);
  stroke: var(--par-glass-lit);
  stroke-width: 0.65px;
  vector-effect: non-scaling-stroke;
  transition: fill-opacity 280ms var(--anatomy-ease);
}
.iso-stage[data-approved] .par-light-disc {
  fill-opacity: 0.58;
}

.par-stage {
  cursor: pointer;
  touch-action: pan-y;
}
.par-stage:focus { outline: none; }
.par-stage:focus-visible { outline: 1px solid var(--anatomy-muted); outline-offset: 6px; }
.par-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
`;

const LIVE = `
const P = ${JSON.stringify(P)};
const DIAL_X = ${DIAL_X}, DIAL_Y = ${DIAL_Y}, DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP};
const WORKFLOW_STEPS = ${JSON.stringify(WORKFLOW_STEPS)};
const DIAL_POSITIONS = ${JSON.stringify(DIAL_POSITIONS)};
const TRACKING_NUMBER = ${JSON.stringify(TRACKING_NUMBER)};

const stage = document.querySelector(".par-stage");
const svg = stage.querySelector("svg");
const tokenEl = svg.querySelector('[data-part="token"]');
const trackSlot = svg.querySelector('[data-slot="track"]');
const chuteSlot = svg.querySelector('[data-slot="chute"]');
const tokenStampEl = svg.querySelector('[data-part="token-stamp"]');
const tokenBlankEl = svg.querySelector('[data-part="token-blank"]');
const needleEl = svg.querySelector('[data-part="dial-needle"]');
const stampRamEls = [...svg.querySelectorAll('[data-move="stamp-ram"], [data-move="stamp-head"]')];
const stampLatchEl = svg.querySelector('[data-part="stamp-latch"]');
const reviewGateEl = svg.querySelector('[data-part="review-gate"]');
const sealRamEls = [...svg.querySelectorAll('[data-move="seal-ram"], [data-move="seal-die"], [data-move="seal-cap"]')];
const drawerEls = [...svg.querySelectorAll('[data-move="drawer"]')];
const readout = document.querySelector("[data-readout]");
const srStatus = document.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

function dialAngleRad(status) {
  const found = DIAL_POSITIONS.find((d) => d.status === status);
  return ((found ? found.angleDeg : -135) * Math.PI) / 180;
}

function needlePath(angleRad) {
  const tail = 4.2, tip = DIAL_R - 4.2;
  return lineOnTop(
    [DIAL_X - Math.sin(angleRad) * tail, DIAL_Y + Math.cos(angleRad) * tail],
    [DIAL_X + Math.sin(angleRad) * tip, DIAL_Y - Math.cos(angleRad) * tip],
    DIAL_TOP + 0.25,
    P
  );
}

function samplePath3D(waypoints, t) {
  if (waypoints.length === 1) return waypoints[0];
  const clamped = Math.max(0, Math.min(1, t));
  const segs = waypoints.length - 1;
  const scaled = clamped * segs;
  const idx = Math.min(segs - 1, Math.floor(scaled));
  const f = scaled - idx;
  const s = f * f * (3 - 2 * f);
  const a = waypoints[idx], b = waypoints[idx + 1];
  return [
    a[0] + (b[0] - a[0]) * s,
    a[1] + (b[1] - a[1]) * s,
    a[2] + (b[2] - a[2]) * s,
  ];
}

let stepIndex = 0;
let stepProgress = 1;
let needleSpring = { at: dialAngleRad(WORKFLOW_STEPS[0].status), rate: 0 };
let stampPulse = 0;
let sealStroke = 0;
let drawerSlide = 0;
let gateOpen = 0;
let frame = 0, last = 0, visible = false, touring = !still.matches, stepClock = 0, idleTimer = 0;

function setStep(nextIndex, userDriven = false) {
  stepIndex = (nextIndex + WORKFLOW_STEPS.length) % WORKFLOW_STEPS.length;
  stepProgress = still.matches ? 1 : 0;
  stepClock = 0;
  if (userDriven) {
    touring = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      touring = !still.matches;
      stepClock = 0;
      run();
    }, 4200);
  }
  const cur = WORKFLOW_STEPS[stepIndex];
  const numText = cur.stamped ? TRACKING_NUMBER : "unissued";
  const labelText = cur.status + " · " + numText;
  stage.setAttribute("aria-valuenow", String(stepIndex));
  stage.setAttribute("aria-valuetext", labelText + " — " + cur.actionLabel);
  if (srStatus) srStatus.textContent = labelText;
  run();
}

function draw() {
  const cur = WORKFLOW_STEPS[stepIndex];
  const pos = samplePath3D(cur.tokenWaypoints, stepProgress);
  const wantSlot = pos[1] > 14 ? chuteSlot : trackSlot;
  if (tokenEl.parentNode !== wantSlot) wantSlot.appendChild(tokenEl);
  tokenEl.setAttribute("transform", translateAlong(P, pos));

  const showStamp = cur.stamped && (stepIndex !== 1 || stepProgress > 0.48);
  tokenStampEl.style.opacity = showStamp ? "1" : "0";
  tokenBlankEl.style.opacity = showStamp ? "0" : "1";

  const ramDz = -9.0 * stampPulse;
  const ramTransform = translateAlong(P, [0, 0, ramDz]);
  for (const el of stampRamEls) el.setAttribute("transform", ramTransform);

  const lockedOut = cur.stamped && (stepIndex > 1 || (stepIndex === 1 && stepProgress > 0.65));
  stampLatchEl.setAttribute("transform", translateAlong(P, [lockedOut ? -2.0 : 0, 0, 0]));

  reviewGateEl.setAttribute("transform", translateAlong(P, [0, gateOpen * 3.6, 0]));

  const sealDz = -10.0 * sealStroke;
  const sealTransform = translateAlong(P, [0, 0, sealDz]);
  for (const el of sealRamEls) el.setAttribute("transform", sealTransform);

  const drawerDy = 6.0 * drawerSlide;
  const drawerTransform = translateAlong(P, [0, drawerDy, 0]);
  for (const el of drawerEls) el.setAttribute("transform", drawerTransform);

  if (cur.status === "APPROVED" && stepProgress > 0.6) {
    stage.setAttribute("data-approved", "");
    stage.style.setProperty("--archive-glow", "0.58");
  } else {
    stage.removeAttribute("data-approved");
    stage.style.setProperty("--archive-glow", "0.16");
  }

  needleEl.setAttribute("d", needlePath(needleSpring.at));

  const numText = showStamp ? TRACKING_NUMBER : "unissued";
  const text = cur.status + " · " + numText;
  if (readout.textContent !== text) readout.textContent = text;
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;

  if (touring && !calm) {
    stepClock += dt;
    if (stepClock >= 2.4) {
      stepIndex = (stepIndex + 1) % WORKFLOW_STEPS.length;
      stepProgress = 0;
      stepClock = 0;
    }
  }

  const cur = WORKFLOW_STEPS[stepIndex];
  if (calm) {
    stepProgress = 1;
  } else {
    stepProgress = Math.min(1, stepProgress + dt / 1.05);
  }

  const wantStamp = cur.stampEngagement && stepProgress > 0.28 && stepProgress < 0.65 ? Math.sin(((stepProgress - 0.28) / 0.37) * Math.PI) : 0;
  stampPulse = calm ? 0 : stampPulse + (wantStamp - stampPulse) * (1 - Math.exp(-dt / 0.05));

  const wantGate = cur.gateAngle;
  gateOpen = calm ? wantGate : gateOpen + (wantGate - gateOpen) * (1 - Math.exp(-dt / 0.12));

  const wantSeal = cur.sealPress && stepProgress > 0.15 && stepProgress < 0.65 ? 1 : 0;
  sealStroke = calm ? cur.sealPress : sealStroke + (wantSeal - sealStroke) * (1 - Math.exp(-dt / 0.09));

  const wantDrawer = cur.drawerOpen ? (stepProgress > 0.35 && stepProgress < 0.88 ? 1 : 0.35) : 0;
  drawerSlide = calm ? (cur.drawerOpen ? 0.4 : 0) : drawerSlide + (wantDrawer - drawerSlide) * (1 - Math.exp(-dt / 0.14));

  const targetAngle = dialAngleRad(cur.status);
  if (calm) {
    needleSpring.at = targetAngle;
    needleSpring.rate = 0;
  } else {
    const stiff = 360, drag = 28;
    for (let i = 0; i < 4; i++) {
      const h = dt / 4;
      needleSpring.rate += ((targetAngle - needleSpring.at) * stiff - needleSpring.rate * drag) * h;
      needleSpring.at += needleSpring.rate * h;
    }
    if (Math.abs(targetAngle - needleSpring.at) < 0.001 && Math.abs(needleSpring.rate) < 0.001) {
      needleSpring.at = targetAngle;
      needleSpring.rate = 0;
    }
  }

  draw();

  const settled =
    !touring &&
    stepProgress >= 1 &&
    Math.abs(targetAngle - needleSpring.at) < 1e-3 &&
    Math.abs(needleSpring.rate) < 1e-3 &&
    Math.abs(wantGate - gateOpen) < 1e-3 &&
    Math.abs(wantSeal - sealStroke) < 1e-3 &&
    Math.abs(wantDrawer - drawerSlide) < 1e-3;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}

const run = () => {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};

new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "120px 0px" }
).observe(stage);

stage.addEventListener("click", (event) => {
  const stationEl = event.target.closest("[data-station]");
  if (stationEl) {
    const st = stationEl.getAttribute("data-station");
    if (st === "submit") setStep(1, true);
    else if (st === "review") setStep(stepIndex === 1 ? 2 : 4, true);
    else if (st === "approve") setStep(stepIndex === 4 ? 5 : 8, true);
    else if (st === "archive") setStep(8, true);
    return;
  }
  setStep(stepIndex + 1, true);
});

stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === " " || event.key === "Enter") {
    event.preventDefault();
    setStep(stepIndex + 1, true);
  } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
    event.preventDefault();
    setStep(stepIndex - 1, true);
  } else if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    setStep(stepIndex >= 4 && stepIndex <= 7 ? 5 : 2, true);
  } else if (event.key === "Home") {
    event.preventDefault();
    setStep(0, true);
  } else if (event.key === "End") {
    event.preventDefault();
    setStep(WORKFLOW_STEPS.length - 1, true);
  }
});

draw();
`;

const body =
  `<style>${CSS}</style>` +
  k.plateHtml({
    fig: "Fig 1",
    title: "Post-Activity Report",
    hint: "Click stations or press ← → · R to return",
    readout: formatReadout("DRAFT", false),
    keys: [
      { mark: "lit", label: "Report token and 7-position status dial needle" },
      { mark: "raised", label: "Intake tray, OFF-2026-0001 stamper, reviewer desk, separator bar, approver seal press, and light-archive cylinder" },
      { mark: "edge", label: "Return chute feeding returned tokens backwards to the intake" },
    ],
    caption:
      "The OVPCASSS paperless Post-Activity Report sorting machine on a bench. A submitter drops a report token into the left intake tray; on first submission the stamper punches OFF-2026-0001 onto its plate and latches out so later resubmissions never alter the tracking number. At the reviewer's inspection desk or the approver's seal press, a returned token diverts onto the front return chute and glides backwards to the intake as the same report. A separation-of-duties guard bar keeps the submitter's hand clear of the approver's press, and approved tokens file through the card-index drawer into the glass archive cylinder as stored rings of light.",
    body: `<div class="iso-stage par-stage" tabindex="0" role="slider" aria-label="Post-Activity Report sorting machine: left and right arrows step through the 7 workflow statuses; R diverts the report down the return chute" aria-valuemin="0" aria-valuemax="${WORKFLOW_STEPS.length - 1}" aria-valuenow="0" aria-valuetext="DRAFT · unissued">${svg}<span class="par-sr" role="status" aria-live="polite" data-status></span></div>`,
  });

const outName = THEME === "light" ? "par-machine-light.html" : "par-machine.html";
const page = k.pageHtml({
  title: "Post-Activity Report",
  theme: THEME,
  body,
  script: kitScript() + LIVE,
  width: 680,
});
writeFileSync(join(HERE, outName), page);
console.log(
  "wrote",
  outName,
  `${(page.length / 1024).toFixed(0)} KB`,
  `${R.solids.length} solids`,
  `${R.items.length} items`,
  `${CABLES.length} cables`,
);

A.auditOrExit(R, P, {});
