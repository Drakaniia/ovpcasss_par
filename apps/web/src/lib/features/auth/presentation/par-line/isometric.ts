/**
 * A compact isometric drawing kit: camera, four-tone extrusions and the path
 * helpers the PAR routing-line figure is drawn with.
 *
 * Adapted from the Anatomy isometric kit (MIT). Every part is a filled solid
 * painted back to front, so the figure reads as a real machine rather than a
 * wireframe diagram; tone comes from which way each face points.
 */

const RADIANS = Math.PI / 180;
const UNIT = Math.sqrt(1.6);
const SHADES = 4;

/**
 * The camera looks from +x, and +y runs away from the reader. Every model below
 * puts the face the reader needs to see (the press fronts, the tray) at negative
 * y, so the projection mirrors y once here instead of in every part.
 */
const AWAY = -1;

export type Projection = {
  origin: [number, number];
  scale: number;
  azimuth: number;
  elevation: number;
};

export type Point2 = [number, number];
export type Point3 = [number, number, number];
export type Plan = { x: number; y: number; w: number; d: number; r: number };

export type Solid = {
  fill: string;
  outline: string;
  crease: string;
  top: string;
  shades: string[];
  bevel?: string;
};

type Camera = { sinA: number; cosA: number; sinE: number; cosE: number; k: number };

function cameraOf({ scale, azimuth, elevation }: Projection): Camera {
  const a = azimuth * RADIANS;
  const e = elevation * RADIANS;
  return {
    sinA: Math.sin(a),
    cosA: Math.cos(a),
    sinE: Math.sin(e),
    cosE: Math.cos(e),
    k: scale * UNIT,
  };
}

export function iso([x, y, z]: Point3, projection: Projection): Point2 {
  const { origin } = projection;
  const { sinA, cosA, sinE, cosE, k } = cameraOf(projection);
  return [
    origin[0] + (x * sinA - y * AWAY * cosA) * k,
    origin[1] + ((x * cosA + y * AWAY * sinA) * sinE - z * cosE) * k,
  ];
}

export function towardViewer(projection: Projection): Point2 {
  const { sinA, cosA } = cameraOf(projection);
  return [cosA, sinA * AWAY];
}

export function depthOf([x, y, z]: Point3, projection: Projection): number {
  const { sinA, cosA, sinE, cosE } = cameraOf(projection);
  return (x * cosA + y * AWAY * sinA) * cosE + z * sinE;
}

const tenth = (value: number) => {
  const text = (Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, '');
  return text === '-0' ? '0' : text;
};

export function pathOf(points: Point2[], closed = false): string {
  if (!points.length) return '';
  return (
    points.map(([x, y], at) => `${at ? 'L' : 'M'}${tenth(x)} ${tenth(y)}`).join('') +
    (closed ? 'Z' : '')
  );
}

export function roundedPlan({ x, y, w, d, r }: Plan, steps = 8): Point2[] {
  const radius = Math.max(0, Math.min(r, w / 2, d / 2));
  const corners: [number, number, number][] = [
    [x + w - radius, y + radius, -90],
    [x + w - radius, y + d - radius, 0],
    [x + radius, y + d - radius, 90],
    [x + radius, y + radius, 180],
  ];
  const out: Point2[] = [];
  for (const [cx, cy, start] of corners) {
    const count = radius > 0 ? steps : 0;
    for (let step = 0; step <= count; step++) {
      const angle = (start + (count ? (90 * step) / count : 45)) * RADIANS;
      out.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }
  }
  return out;
}

function signedArea(points: Point2[]) {
  let area = 0;
  for (let index = 0; index < points.length; index++) {
    const [ax, ay] = points[index];
    const [bx, by] = points[(index + 1) % points.length];
    area += ax * by - bx * ay;
  }
  return area / 2;
}

const oriented = (points: Point2[]) => (signedArea(points) < 0 ? [...points].reverse() : points);

function convexHull(points: Point2[]): Point2[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const cross = (o: Point2, a: Point2, b: Point2) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Point2[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0)
      lower.pop();
    lower.push(point);
  }
  const upper: Point2[] = [];
  for (let index = sorted.length - 1; index >= 0; index--) {
    const point = sorted[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0)
      upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function runsOf(flags: boolean[], want: boolean): number[][] {
  const count = flags.length;
  const runs: number[][] = [];
  const start = flags.findIndex((flag, index) => flag !== flags[(index + count - 1) % count]);
  if (start < 0)
    return flags[0] === want
      ? [Array.from({ length: count + 1 }, (_, index) => index % count)]
      : [];
  let run: number[] | null = null;
  for (let step = 0; step < count; step++) {
    const index = (start + step) % count;
    if (flags[index] === want) {
      if (!run) run = [index];
      run.push((index + 1) % count);
    } else if (run) {
      runs.push(run);
      run = null;
    }
  }
  if (run) runs.push(run);
  return runs;
}

export function extrude(
  ring: Point2[],
  z: number,
  height: number,
  projection: Projection,
  bevel = 0,
): Solid {
  const count = ring.length;
  const counter = signedArea(ring) > 0;
  const [vx, vy] = towardViewer(projection);
  const { sinA, cosA } = cameraOf(projection);
  const normals = ring.map(([ax, ay], index) => {
    const [bx, by] = ring[(index + 1) % count];
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy) || 1;
    return (counter ? [dy / length, -dx / length] : [-dy / length, dx / length]) as Point2;
  });
  const facing = normals.map(([nx, ny]) => nx * vx + ny * vy > 1e-9);
  const top = ring.map(([x, y]) => iso([x, y, z + height], projection));
  const bottom = ring.map(([x, y]) => iso([x, y, z], projection));
  const outline: string[] = [];
  const crease: string[] = [];
  for (const run of runsOf(facing, false)) outline.push(pathOf(run.map((index) => top[index])));
  for (const run of runsOf(facing, true)) {
    crease.push(pathOf(run.map((index) => top[index])));
    if (height > 0) outline.push(pathOf(run.map((index) => bottom[index])));
  }
  if (height > 0) {
    for (let index = 0; index < count; index++) {
      if (facing[(index + count - 1) % count] !== facing[index])
        outline.push(pathOf([top[index], bottom[index]]));
    }
  }
  const fill = pathOf(convexHull([...top, ...bottom]), true);
  const buckets: string[][] = Array.from({ length: SHADES }, () => []);
  if (height > 0) {
    const [lx, ly] = [-sinA, cosA * AWAY];
    for (let index = 0; index < count; index++) {
      if (!facing[index]) continue;
      const [nx, ny] = normals[index];
      const lit = (nx * lx + ny * ly + 1) / 2;
      const shade = Math.min(SHADES - 1, Math.max(0, Math.floor(lit * SHADES)));
      const next = (index + 1) % count;
      buckets[shade].push(
        pathOf(oriented([top[index], top[next], bottom[next], bottom[index]]), true),
      );
    }
  }
  let bevelPath: string | undefined;
  if (bevel > 0) {
    const inset = ring.map(([x, y], index) => {
      const [ax, ay] = normals[(index + count - 1) % count];
      const [bx, by] = normals[index];
      const mx = ax + bx;
      const my = ay + by;
      const length = Math.hypot(mx, my) || 1;
      return [x - (mx / length) * bevel, y - (my / length) * bevel] as Point2;
    });
    const insetTop = inset.map(([x, y]) => iso([x, y, z + height], projection));
    bevelPath = runsOf(facing, true)
      .map((run) =>
        pathOf([
          top[run[0]],
          ...run.slice(1, -1).map((index) => insetTop[index]),
          top[run[run.length - 1]],
        ]),
      )
      .join('');
  }
  return {
    fill,
    outline: outline.join(''),
    crease: crease.join(''),
    top: pathOf(oriented(top), true),
    shades: buckets.map((paths) => paths.join('')),
    bevel: bevelPath,
  };
}

export const ringOf = (plan: Plan, steps = 8) => roundedPlan(plan, steps);

export const slabOf = (
  plan: Plan,
  z: number,
  height: number,
  projection: Projection,
  steps = 8,
  bevel = 0,
) => extrude(ringOf(plan, steps), z, height, projection, bevel);

export function circleRing(cx: number, cy: number, radius: number, steps = 40): Point2[] {
  return Array.from({ length: steps }, (_, step) => {
    const angle = (step / steps) * Math.PI * 2;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)] as Point2;
  });
}

export const cylinder = (
  cx: number,
  cy: number,
  radius: number,
  z: number,
  height: number,
  projection: Projection,
  steps = 32,
  bevel = 0,
) => extrude(circleRing(cx, cy, radius, steps), z, height, projection, bevel);

export const insetPlan = ({ x, y, w, d, r }: Plan, by: number): Plan => ({
  x: x + by,
  y: y + by,
  w: w - by * 2,
  d: d - by * 2,
  r: Math.max(0, r - by),
});

export function onTop(points: Point2[], z: number, projection: Projection, closed = false) {
  return pathOf(
    points.map(([x, y]) => iso([x, y, z], projection)),
    closed,
  );
}

export const planOutline = (plan: Plan, z: number, projection: Projection, steps = 8) =>
  onTop(ringOf(plan, steps), z, projection, true);

export const lineOnTop = (from: Point2, to: Point2, z: number, projection: Projection) =>
  onTop([from, to], z, projection);

export const segment = (from: Point3, to: Point3, projection: Projection) =>
  pathOf([iso(from, projection), iso(to, projection)]);

export const ring = (
  cx: number,
  cy: number,
  radius: number,
  z: number,
  projection: Projection,
  steps = 40,
) => onTop(circleRing(cx, cy, radius, steps), z, projection, true);

export function corners({ x, y, w, d }: Plan, inset = 0): Point2[] {
  return [
    [x + inset, y + inset],
    [x + w - inset, y + inset],
    [x + inset, y + d - inset],
    [x + w - inset, y + d - inset],
  ];
}

export function boxCorners({ x, y, w, d }: Plan, z0: number, z1: number): Point3[] {
  const out: Point3[] = [];
  for (const px of [x, x + w])
    for (const py of [y, y + d]) for (const z of [z0, z1]) out.push([px, py, z]);
  return out;
}

export function knurl(
  cx: number,
  cy: number,
  radius: number,
  z0: number,
  z1: number,
  count: number,
  projection: Projection,
  inset = 0.4,
) {
  const [vx, vy] = towardViewer(projection);
  const lines: string[] = [];
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2;
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    if (nx * vx + ny * vy < 0.15) continue;
    lines.push(
      segment(
        [cx + radius * nx, cy + radius * ny, z0 + inset],
        [cx + radius * nx, cy + radius * ny, z1 - inset],
        projection,
      ),
    );
  }
  return lines.join('');
}

export function sideArc(
  cx: number,
  cy: number,
  radius: number,
  z: number,
  projection: Projection,
  steps = 24,
) {
  const [vx, vy] = towardViewer(projection);
  const facing = Math.atan2(vy, vx);
  const points: Point2[] = [];
  for (let step = 0; step <= steps; step++) {
    const angle = facing - Math.PI / 2 + (step / steps) * Math.PI;
    points.push(iso([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle), z], projection));
  }
  return pathOf(points);
}

function ringSeam(ringPoints: Point2[], z: number, projection: Projection) {
  const count = ringPoints.length;
  const counter = signedArea(ringPoints) > 0;
  const [vx, vy] = towardViewer(projection);
  const facing = ringPoints.map(([ax, ay], index) => {
    const [bx, by] = ringPoints[(index + 1) % count];
    const dx = bx - ax;
    const dy = by - ay;
    const [nx, ny] = counter ? [dy, -dx] : [-dy, dx];
    return nx * vx + ny * vy > 1e-9;
  });
  return runsOf(facing, true)
    .map((run) =>
      pathOf(run.map((index) => iso([ringPoints[index][0], ringPoints[index][1], z], projection))),
    )
    .join('');
}

export const sideSeam = (plan: Plan, z: number, projection: Projection, steps = 8) =>
  ringSeam(ringOf(plan, steps), z, projection);

/** A vertical helix, for the springs around each press ram. */
export function coilZ(
  cx: number,
  cy: number,
  z0: number,
  z1: number,
  radius: number,
  turns: number,
  projection: Projection,
  perTurn = 18,
) {
  const count = Math.max(1, Math.round(turns * perTurn));
  const back: string[] = [];
  const front: string[] = [];
  let run: Point2[] = [];
  let near: boolean | null = null;
  for (let index = 0; index <= count; index++) {
    const share = index / count;
    const angle = share * turns * Math.PI * 2;
    const point: Point3 = [
      cx + radius * Math.cos(angle),
      cy + radius * Math.sin(angle),
      z0 + (z1 - z0) * share,
    ];
    const facing = depthOf([Math.cos(angle), Math.sin(angle), 0], projection) > 0;
    const flat = iso(point, projection);
    if (near === null) near = facing;
    if (facing !== near) {
      run.push(flat);
      (near ? front : back).push(pathOf(run));
      run = [flat];
      near = facing;
      continue;
    }
    run.push(flat);
  }
  if (run.length > 1) (near ? front : back).push(pathOf(run));
  return { back: back.join(''), front: front.join('') };
}

export function topTicks(
  from: number,
  to: number,
  step: number,
  every: number,
  edge: number,
  z: number,
  lengths: [number, number],
  projection: Projection,
  axis: 'x' | 'y' = 'x',
) {
  const minor: string[] = [];
  const major: string[] = [];
  const first = Math.ceil(from / step) * step;
  for (let at = first, index = Math.round(first / step); at <= to + 1e-9; at += step, index++) {
    const big = index % every === 0;
    const length = big ? lengths[1] : lengths[0];
    const a: Point2 = axis === 'x' ? [at, edge] : [edge, at];
    const b: Point2 = axis === 'x' ? [at, edge + length] : [edge + length, at];
    (big ? major : minor).push(lineOnTop(a, b, z, projection));
  }
  return { minor: minor.join(''), major: major.join('') };
}

export function sideTicks(
  from: number,
  to: number,
  step: number,
  every: number,
  face: number,
  top: number,
  lengths: [number, number],
  projection: Projection,
  axis: 'x' | 'y' = 'x',
) {
  const minor: string[] = [];
  const major: string[] = [];
  const first = Math.ceil(from / step) * step;
  for (let at = first, index = Math.round(first / step); at <= to + 1e-9; at += step, index++) {
    const big = index % every === 0;
    const length = big ? lengths[1] : lengths[0];
    const a: Point3 = axis === 'x' ? [at, face, top] : [face, at, top];
    const b: Point3 = axis === 'x' ? [at, face, top - length] : [face, at, top - length];
    (big ? major : minor).push(segment(a, b, projection));
  }
  return { minor: minor.join(''), major: major.join('') };
}

export function radialTicks(
  cx: number,
  cy: number,
  radius: number,
  count: number,
  every: number,
  z: number,
  lengths: [number, number],
  projection: Projection,
) {
  const minor: string[] = [];
  const major: string[] = [];
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2;
    const big = index % every === 0;
    const inner = radius - (big ? lengths[1] : lengths[0]);
    const sx = Math.sin(angle);
    const sy = -Math.cos(angle);
    (big ? major : minor).push(
      lineOnTop(
        [cx + sx * inner, cy + sy * inner],
        [cx + sx * radius, cy + sy * radius],
        z,
        projection,
      ),
    );
  }
  return { minor: minor.join(''), major: major.join('') };
}

export function axisVector(projection: Projection, [dx, dy, dz]: Point3): Point2 {
  const origin = iso([0, 0, 0], projection);
  const moved = iso([dx, dy, dz], projection);
  return [moved[0] - origin[0], moved[1] - origin[1]];
}

export const screenRise = (height: number, projection: Projection) =>
  height * cameraOf(projection).cosE * cameraOf(projection).k;

const thousandth = (value: number) => Math.round(value * 1000) / 1000;

function axesAt(at: Point2, z: number, projection: Projection) {
  const origin = iso([at[0], at[1], z], projection);
  const along = (point: Point3) => {
    const [px, py] = iso(point, projection);
    return [px - origin[0], py - origin[1]] as Point2;
  };
  return {
    origin,
    x: along([at[0] + 1, at[1], z]),
    y: along([at[0], at[1] + 1, z]),
    z: along([at[0], at[1], z + 1]),
  };
}

const matrixOf = (u: Point2, v: Point2, origin: Point2) =>
  `matrix(${thousandth(u[0])} ${thousandth(u[1])} ${thousandth(v[0])} ${thousandth(v[1])} ${thousandth(origin[0])} ${thousandth(origin[1])})`;

export function topMatrix(at: Point2, z: number, projection: Projection, along: 'x' | 'y' = 'x') {
  const { origin, x, y } = axesAt(at, z, projection);
  return along === 'x' ? matrixOf(x, y, origin) : matrixOf([-y[0], -y[1]], x, origin);
}

export function fitProjection(
  points: Point3[],
  width: number,
  height: number,
  { pad = 24, headroom = 0, azimuth = 45, elevation = 30 } = {},
): Projection {
  const unit: Projection = { origin: [0, 0], scale: 1, azimuth, elevation };
  const flat = points.map((point) => iso(point, unit));
  const xs = flat.map(([x]) => x);
  const ys = flat.map(([, y]) => y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const up = Math.min(...ys);
  const down = Math.max(...ys);
  const scale = Math.min(
    (width - pad * 2) / (right - left),
    (height - pad * 2 - headroom) / (down - up),
  );
  return {
    origin: [
      width / 2 - ((left + right) / 2) * scale,
      headroom + (height - headroom) / 2 - ((up + down) / 2) * scale,
    ],
    scale,
    azimuth,
    elevation,
  };
}

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const attrs = (pairs: Record<string, string | undefined>) =>
  Object.entries(pairs)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ` ${key}="${escape(String(value))}"`)
    .join('');

export function solidSvg(
  paths: Solid,
  {
    tone = 'hi',
    crease = 'faint',
    lit = false,
    inner = '',
  }: {
    tone?: string;
    crease?: string;
    lit?: boolean;
    inner?: string;
  } = {},
) {
  const parts: string[] = [`<path class="iso-fill" d="${paths.fill}"/>`];
  paths.shades.forEach((d, shade) => {
    if (d) parts.push(`<path class="iso-shade" data-shade="${shade}" d="${d}"/>`);
  });
  parts.push(`<path class="iso-top" d="${paths.top}"/>`);
  if (crease !== 'none' && paths.crease)
    parts.push(`<path class="iso-line iso-crease" data-tone="${crease}" d="${paths.crease}"/>`);
  if (crease !== 'none' && paths.bevel)
    parts.push(`<path class="iso-line iso-bevel" data-tone="${crease}" d="${paths.bevel}"/>`);
  if (inner) parts.push(inner);
  parts.push(`<path class="iso-line iso-edge" data-tone="${tone}" d="${paths.outline}"/>`);
  return `<g class="iso-solid"${lit ? ' data-lit=""' : ''}>${parts.join('')}</g>`;
}

export function lineSvg(
  d: string,
  { tone = 'lo', free, dashed }: { tone?: string; free?: boolean; dashed?: boolean } = {},
) {
  if (!d) return '';
  return `<path${attrs({
    class: 'iso-line',
    'data-tone': tone,
    'data-free': free ? '' : undefined,
    'data-dashed': dashed ? '' : undefined,
    d,
  })}/>`;
}

export function dotsSvg(
  points: Point2[],
  { size = 0.5, tone = 'mid' }: { size?: number; tone?: string } = {},
) {
  const dots = points
    .map(([x, y]) => `<circle cx="${tenth(x)}" cy="${tenth(y)}" r="${size}"/>`)
    .join('');
  return `<g class="iso-dots" data-tone="${tone}">${dots}</g>`;
}
