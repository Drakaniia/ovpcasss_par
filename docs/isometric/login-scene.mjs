/**
 * Isometric scene for the auth screens: the sign-in page on a browser window,
 * with the security, identity and filing objects of the Paperless PAR around it.
 *
 * This file is the editable source. `node docs/isometric/build.mjs` renders it
 * with the /isometric skill's kit and writes apps/web/static/brand/login-scene.svg.
 *
 * World axes: x runs to the lower right, z to the lower left, y up. Parts touch
 * rather than intersect, so the painter's sort stays exact. Parts carry roles,
 * never colours; the build resolves roles from tokens.css. Decal coordinates are
 * in the face's own frame: x to the right and y down from its top-left corner.
 */
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** The skill folder. Set ISOMETRIC_SKILL when it is installed somewhere else. */
export const skillRoot =
  process.env.ISOMETRIC_SKILL ?? path.join(os.homedir(), '.agents', 'skills', 'isometric');
export const kit = await import(
  pathToFileURL(path.join(skillRoot, 'kit', 'dist', 'index.js')).href
);

const { defineDrawing, box, cbox, cyl, prism } = kit;

/** Points on a circular arc, in degrees. */
const arc = (cx, cy, r, from, to, steps) =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });

/** A flat [x1, y1, x2, y2, ...] list as points, so each decal stays on one line. */
const pairs = (flat) => flat.flatMap((v, i) => (i % 2 ? [] : [[v, flat[i + 1]]]));
const line = (flat, stroke = 'soft', more = {}) => ({
  t: 'line',
  pts: pairs(flat),
  stroke,
  ...more,
});
/** Separate strokes, four numbers each: x1, y1, x2, y2. */
const segs = (flat, stroke = 'soft') => ({
  t: 'segs',
  segs: flat.flatMap((v, i) => (i % 4 ? [] : [flat.slice(i, i + 4)])),
  stroke,
});

/* Browser window: the sign-in page, standing on two feet. */
const WIN = { x: -3.5, y: 0.18, z: -1.3, w: 7.0, h: 4.7, d: 0.3 };
const winFront = WIN.z + WIN.d;
const winTop = WIN.y + WIN.h;

const page = [
  // Title bar: back and forward, the address field with its padlock, window controls.
  { t: 'rect', x: 0.12, y: 0.12, w: WIN.w - 0.24, h: 0.5, r: 0.1, fill: 'body', stroke: 'soft' },
  line([0.44, 0.27, 0.34, 0.37, 0.44, 0.47]),
  line([0.6, 0.27, 0.7, 0.37, 0.6, 0.47]),
  { t: 'rect', x: 0.95, y: 0.22, w: 3.9, h: 0.3, r: 0.15, fill: 'face', stroke: 'soft' },
  { t: 'rect', x: 1.1, y: 0.34, w: 0.13, h: 0.1, r: 0.02, fill: 'ink' },
  line([1.125, 0.34, 1.125, 0.305, 1.165, 0.27, 1.205, 0.305, 1.205, 0.34], 'ink'),
  { t: 'bar', x: 1.34, y: 0.33, w: 1.9, h: 0.08 },
  segs([5.98, 0.37, 6.14, 0.37]),
  { t: 'rect', x: 6.26, y: 0.29, w: 0.16, h: 0.16, r: 0.02, stroke: 'soft' },
  segs([6.54, 0.29, 6.7, 0.45, 6.7, 0.29, 6.54, 0.45]),
  // The right half of the page: the blueprint drafting marks behind the form.
  { t: 'circle', cx: 5.45, cy: 2.5, r: 1.05, stroke: 'soft' },
  { t: 'circle', cx: 5.45, cy: 2.5, r: 0.55, stroke: 'soft' },
  segs([4.25, 2.5, 6.65, 2.5, 5.45, 1.3, 5.45, 3.7]),
  segs([4.25, 4.2, 6.65, 4.2, 4.25, 4.08, 4.25, 4.32, 6.65, 4.08, 6.65, 4.32]),
];

/* Sign-in card, standing proud of the page: seal, wordmark, email, password, link. */
const CARD = { x: WIN.x + 0.75, top: winTop - 0.95, w: 3.0, h: 3.45, d: 0.16 };
const cardFront = winFront + CARD.d;
const passwordDots = Array.from({ length: 7 }, (_, i) => ({
  t: 'circle',
  cx: 0.8 + i * 0.16,
  cy: 2.27,
  r: 0.04,
  fill: 'ink',
}));

const form = [
  { t: 'circle', cx: CARD.w / 2, cy: 0.42, r: 0.24, fill: 'face', stroke: true },
  { t: 'circle', cx: CARD.w / 2, cy: 0.42, r: 0.15, stroke: 'soft' },
  { t: 'bar', x: CARD.w / 2 - 0.65, y: 0.78, w: 1.3, h: 0.11 },
  { t: 'bar', x: CARD.w / 2 - 0.9, y: 0.98, w: 1.8, h: 0.07 },
  // University email.
  { t: 'bar', x: 0.3, y: 1.3, w: 0.8, h: 0.07 },
  { t: 'rect', x: 0.3, y: 1.42, w: 2.4, h: 0.38, r: 0.08, fill: 'face', stroke: true },
  { t: 'rect', x: 0.43, y: 1.54, w: 0.2, h: 0.14, r: 0.02, stroke: 'soft' },
  line([0.43, 1.55, 0.53, 1.62, 0.63, 1.55]),
  { t: 'bar', x: 0.76, y: 1.575, w: 1.15, h: 0.08 },
  // Password, with the Forgot? link above it.
  { t: 'bar', x: 0.3, y: 1.96, w: 0.6, h: 0.07 },
  { t: 'bar', x: 2.2, y: 1.96, w: 0.5, h: 0.07, fill: 'ink' },
  { t: 'rect', x: 0.3, y: 2.08, w: 2.4, h: 0.38, r: 0.08, fill: 'face', stroke: true },
  { t: 'rect', x: 0.45, y: 2.24, w: 0.16, h: 0.12, r: 0.02, stroke: 'soft' },
  line([0.48, 2.24, 0.48, 2.2, 0.53, 2.16, 0.58, 2.2, 0.58, 2.24]),
  ...passwordDots,
  // New here? Create an account.
  { t: 'bar', x: 0.72, y: 3.18, w: 0.72, h: 0.07 },
  { t: 'bar', x: 1.52, y: 3.18, w: 0.76, h: 0.07, fill: 'ink' },
];

/* The navy Sign in button, raised off the card, and the pointer about to press it. */
const BTN = { x: CARD.x + 0.3, y: CARD.top - 3.0, w: 2.4, h: 0.38, d: 0.1 };
const buttonLabel = [
  { t: 'bar', x: 0.82, y: 0.15, w: 0.55, h: 0.08, fill: 'face' },
  line([1.47, 0.19, 1.66, 0.19], 'face'),
  line([1.6, 0.13, 1.66, 0.19, 1.6, 0.25], 'face'),
];
const pointer = pairs([0, 0, 0, -1, 0.23, -0.78, 0.37, -1.1, 0.5, -1.04, 0.36, -0.73, 0.68, -0.73]);
const POINTER_SCALE = 0.55;

/* Padlock with its key in the keyhole: the one accent assembly. */
const LOCK = { x: 3.0, z: 0.55, w: 1.55, h: 1.3, d: 0.75 };
const lockFront = LOCK.z + LOCK.d;
const keyX = LOCK.x + LOCK.w / 2;
const keyY = LOCK.h - 0.7;
const SHACKLE = { w: 1.04, leg: 0.22, rise: 0.5, d: 0.24 };
const shackle = [
  [0, 0],
  ...arc(SHACKLE.w / 2, SHACKLE.rise, SHACKLE.w / 2, 180, 0, 18),
  [SHACKLE.w, 0],
  [SHACKLE.w - SHACKLE.leg, 0],
  ...arc(SHACKLE.w / 2, SHACKLE.rise, SHACKLE.w / 2 - SHACKLE.leg, 0, 180, 14),
  [SHACKLE.leg, 0],
];

/* Envelope (the verification mail) with the university ID card resting on it. */
const ENV = { x: -4.4, z: 0.55, w: 2.3, d: 1.5 };
const envelopeBack = [
  line([0.06, 0.06, ENV.w / 2, 0.82, ENV.w - 0.06, 0.06]),
  line([0.06, ENV.d - 0.06, 0.9, 0.76]),
  line([ENV.w - 0.06, ENV.d - 0.06, ENV.w - 0.9, 0.76]),
  { t: 'circle', cx: ENV.w / 2, cy: 0.82, r: 0.21, fill: 'ink' },
  line([ENV.w / 2 - 0.1, 0.83, ENV.w / 2 - 0.03, 0.9, ENV.w / 2 + 0.1, 0.75], 'face', {
    width: 1.6,
  }),
];

const ID = { x: -2.9, z: 1.55, w: 1.9, d: 1.25 };
const barcode = [];
for (let i = 0, x = 0.8; i < 15; i++) {
  barcode.push([x, 0.95, x, 1.1]);
  x += [0.05, 0.03, 0.07, 0.03, 0.05][i % 5] + (i % 3) * 0.01;
}
const idCard = [
  { t: 'rect', x: 0.07, y: 0.07, w: ID.w - 0.14, h: 0.28, r: 0.05, fill: 'ink' },
  { t: 'circle', cx: 0.25, cy: 0.21, r: 0.085, fill: 'face' },
  { t: 'bar', x: 0.42, y: 0.18, w: 0.9, h: 0.06, fill: 'face' },
  { t: 'rect', x: 0.14, y: 0.47, w: 0.5, h: 0.62, r: 0.05, fill: 'detail', stroke: 'soft' },
  { t: 'circle', cx: 0.39, cy: 0.68, r: 0.11, fill: 'face' },
  { t: 'line', pts: arc(0.39, 1.09, 0.19, 180, 360, 12), closed: true, fill: 'face' },
  { t: 'bar', x: 0.78, y: 0.52, w: 0.8, h: 0.08, fill: 'ink' },
  { t: 'bar', x: 0.78, y: 0.68, w: 0.95, h: 0.06 },
  { t: 'bar', x: 0.78, y: 0.8, w: 0.6, h: 0.06 },
  { t: 'segs', segs: barcode, stroke: true },
];

/* Desk file holder: three report folders standing in an open tray. */
const HOLD = { x: -7.3, z: -1.75, w: 1.9, d: 1.25, t: 0.08 };
const folderX = HOLD.x + HOLD.t + 0.04;
const folderW = HOLD.w - 2 * HOLD.t - 0.08;
const FOLDERS = [
  { id: 'folder-back', z: HOLD.z + 0.13, h: 1.55, role: 'detail', tab: 0.1 },
  { id: 'folder-middle', z: HOLD.z + 0.5, h: 1.4, role: 'ink', tab: 1.06 },
  { id: 'folder-front', z: HOLD.z + 0.87, h: 1.2, role: 'face', tab: 0.58 },
];
const FOLDER_D = 0.12;
const folderLabel = [
  { t: 'rect', x: 0.55, y: 0.22, w: 0.56, h: 0.22, r: 0.03, fill: 'body', stroke: 'soft' },
  { t: 'bar', x: 0.63, y: 0.3, w: 0.38, h: 0.06 },
];

const folderParts = FOLDERS.flatMap(({ id, z, h, role, tab }) => [
  box([folderX, HOLD.t, z], [folderW, h, FOLDER_D], {
    id,
    role,
    r: 0.04,
    axis: 'z',
    decals: id === 'folder-front' ? { front: folderLabel } : undefined,
  }),
  box([folderX + tab, HOLD.t + h, z], [0.5, 0.16, FOLDER_D], {
    id: `${id}-tab`,
    role,
    r: 0.04,
    axis: 'z',
  }),
]);

/* Snake plant, for scale: flat blades in their own depth slices, so none intersect. */
const POT = { x: 4.8, z: -2.0, h: 0.9, r: 0.72 };
const SOIL = POT.h + 0.1;
const BLADES = [
  { dx: -0.26, dz: -0.3, h: 2.0, w: 0.39, tilt: 12 },
  { dx: 0.18, dz: -0.15, h: 2.8, w: 0.46, tilt: -5 },
  { dx: -0.08, dz: 0, h: 2.4, w: 0.44, tilt: 6 },
  { dx: 0.31, dz: 0.15, h: 1.75, w: 0.39, tilt: -16 },
  { dx: -0.26, dz: 0.3, h: 1.45, w: 0.36, tilt: 20 },
];
const BLADE_D = 0.05;

/** Half-width of a blade at a fraction of its height: widest a third of the way up. */
function bladeHalf(w, f) {
  if (f <= 0.35) return w * (0.5 + (0.06 * f) / 0.35);
  if (f <= 0.75) return w * (0.56 - (0.2 * (f - 0.35)) / 0.4);
  return w * 0.36 * (1 - (f - 0.75) / 0.25);
}

const bladeParts = BLADES.map(({ dx, dz, h, w, tilt }, i) => {
  const at = [POT.x + dx, SOIL, POT.z + dz];
  const outline = [0, 0.35, 0.75, 1, 0.75, 0.35, 0].map((f, k) => [
    (k < 3 ? -1 : 1) * bladeHalf(w, f),
    f * h,
  ]);
  // The cross bands of a snake plant leaf, inside the outline.
  const bands = [0.2, 0.4, 0.58].map((f) => {
    const half = bladeHalf(w, f) * 0.55;
    const y = h * (1 - f);
    const cx = w * 0.56;
    return line([cx - half, y, cx, y - 0.05, cx + half, y]);
  });
  return prism(at, outline, BLADE_D, {
    id: `leaf-${i + 1}`,
    role: 'face',
    axis: 'z',
    rot: [{ axis: 'z', deg: tilt, pivot: at }],
    decals: { front: bands },
  });
});

export default defineDrawing({
  id: 'par-login-scene',
  name: 'Signing in to the OVPCASSS Paperless PAR',
  category: 'interface',
  kind: 'scene',
  tags: ['login', 'sign in', 'auth', 'browser', 'form', 'padlock', 'key', 'id card', 'reports'],
  prompt: '/isometric recreate a comprehensive isometric for the login page',
  description:
    'A browser window showing the sign-in page: a card with the university email and password ' +
    'fields and a navy Sign in button, with a pointer about to press it. Beside the window stand a ' +
    'brass padlock with its key in the lock, an envelope with a verified seal under a university ' +
    'ID card, a desk tray of report folders, and a potted plant.',
  createdAt: '2026-11-03',
  parts: [
    // Browser window and its feet.
    cbox(WIN.x + 1.3, 0, WIN.z + WIN.d / 2, [1.0, WIN.y, 1.5], {
      id: 'foot-left',
      r: 0.1,
      role: 'detail',
    }),
    cbox(WIN.x + WIN.w - 1.3, 0, WIN.z + WIN.d / 2, [1.0, WIN.y, 1.5], {
      id: 'foot-right',
      r: 0.1,
      role: 'detail',
    }),
    box([WIN.x, WIN.y, WIN.z], [WIN.w, WIN.h, WIN.d], {
      id: 'window',
      role: 'face',
      r: 0.16,
      axis: 'z',
      decals: { front: page },
    }),
    box([CARD.x, CARD.top - CARD.h, winFront], [CARD.w, CARD.h, CARD.d], {
      id: 'card',
      r: 0.12,
      axis: 'z',
      decals: { front: form },
    }),
    box([BTN.x, BTN.y, cardFront], [BTN.w, BTN.h, BTN.d], {
      id: 'sign-in-button',
      role: 'ink',
      r: 0.08,
      axis: 'z',
      decals: { front: buttonLabel },
    }),
    // Offsetting x, y and z equally keeps the tip over the same point of the button.
    prism(
      [BTN.x + 1.95, BTN.y + 0.39, cardFront + BTN.d + 0.2],
      pointer.map(([u, v]) => [u * POINTER_SCALE, v * POINTER_SCALE]),
      0.08,
      { id: 'pointer', axis: 'z' },
    ),

    // Padlock: brass body, steel shackle, the key standing out of the keyhole.
    box([LOCK.x, 0, LOCK.z], [LOCK.w, LOCK.h, LOCK.d], {
      id: 'padlock',
      role: 'accent',
      r: 0.22,
      axis: 'z',
      decals: {
        front: [
          segs([0.12, 0.24, LOCK.w - 0.12, 0.24]),
          { t: 'circle', cx: LOCK.w / 2, cy: LOCK.h - keyY, r: 0.17, stroke: true },
        ],
      },
    }),
    prism(
      [LOCK.x + (LOCK.w - SHACKLE.w) / 2, LOCK.h, LOCK.z + (LOCK.d - SHACKLE.d) / 2],
      shackle,
      SHACKLE.d,
      { id: 'shackle', role: 'detail', axis: 'z' },
    ),
    cyl([keyX, keyY, lockFront], 0.055, 0.3, { id: 'key-shank', role: 'accent', axis: 'z', n: 16 }),
    cyl([keyX - 0.05, keyY, lockFront + 0.6], 0.3, 0.1, {
      id: 'key-bow',
      role: 'accent',
      axis: 'x',
      n: 32,
      decals: { right: [{ t: 'circle', cx: 0.3, cy: 0.3, r: 0.1, fill: 'bg', stroke: true }] },
    }),

    // Envelope and ID card.
    box([ENV.x, 0, ENV.z], [ENV.w, 0.05, ENV.d], {
      id: 'envelope',
      r: 0.04,
      decals: { top: envelopeBack },
    }),
    box([ID.x, 0.05, ID.z], [ID.w, 0.05, ID.d], { id: 'id-card', r: 0.1, decals: { top: idCard } }),

    // File holder: base, back, sides and a low front lip, then the folders inside.
    box([HOLD.x, 0, HOLD.z], [HOLD.w, HOLD.t, HOLD.d], { id: 'tray-base', role: 'detail' }),
    box([HOLD.x, HOLD.t, HOLD.z], [HOLD.w, 1.05, HOLD.t], { id: 'tray-back' }),
    box([HOLD.x, HOLD.t, HOLD.z + HOLD.t], [HOLD.t, 0.8, HOLD.d - HOLD.t], { id: 'tray-left' }),
    box([HOLD.x + HOLD.w - HOLD.t, HOLD.t, HOLD.z + HOLD.t], [HOLD.t, 0.8, HOLD.d - HOLD.t], {
      id: 'tray-right',
    }),
    box([HOLD.x + HOLD.t, HOLD.t, HOLD.z + HOLD.d - HOLD.t], [HOLD.w - 2 * HOLD.t, 0.42, HOLD.t], {
      id: 'tray-front',
      decals: {
        front: [
          { t: 'rect', x: 0.6, y: 0.12, w: 0.54, h: 0.18, r: 0.03, fill: 'face', stroke: 'soft' },
        ],
      },
    }),
    ...folderParts,
    box([folderX + 0.14, HOLD.t + FOLDERS[1].h, FOLDERS[1].z + 0.035], [0.86, 0.2, 0.05], {
      id: 'report-sheet',
      decals: {
        front: [
          { t: 'bar', x: 0.1, y: 0.07, w: 0.5, h: 0.05 },
          { t: 'bar', x: 0.1, y: 0.15, w: 0.66, h: 0.04 },
        ],
      },
    }),

    // Plant: pot, rim with soil, blades.
    cyl([POT.x, 0, POT.z], 0.55, POT.h, { id: 'pot', r2: 0.65, role: 'detail', n: 40 }),
    cyl([POT.x, POT.h, POT.z], POT.r, SOIL - POT.h, {
      id: 'pot-rim',
      role: 'face',
      n: 40,
      decals: { top: [{ t: 'circle', cx: POT.r, cy: POT.r, r: 0.58, fill: 'ink' }] },
    }),
    ...bladeParts,
  ],
});
