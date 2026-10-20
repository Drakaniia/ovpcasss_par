/**
 * The figure, assembled in painter order: everything far and low first, the
 * travelling report next, then the rams and the press heads that stand in front
 * of it. The live loop only ever writes a transform on five groups.
 */
import { axisVector, screenRise, type Point2 } from './isometric';
import {
  binParts,
  beamParts,
  carrierParts,
  pressRigParts,
  railParts,
  sheetParts,
  tickerParts,
} from './par-line-frame';
import { BIN_FLOOR, P, PRESS_Y, RAM_STROKE, SHEET_TOP, STATION } from './par-line-layout';
import { leverParts, leverPivot, pressHead, pressRam } from './par-line-stations';

/** The review head's front face: the return lever is pinned to its corner. */
const REVIEW_FRONT = PRESS_Y - 14;

/** Parts that hang behind the moving report: the beam, the rail, the props. */
const back = [beamParts(), tickerParts(), binParts(), pressRigParts(), railParts()].join('');

/** Parts drawn in front of the report: the rams, then the heads they enter. */
const front = [
  `<g id="ram-registry">${pressRam('registry', STATION.registry)}</g>`,
  `<g id="ram-review">${pressRam('review', STATION.review)}</g>`,
  `<g id="ram-approve">${pressRam('approve', STATION.approve)}</g>`,
  pressHead('registry', STATION.registry),
  pressHead('review', STATION.review),
  pressHead('approve', STATION.approve),
  `<g id="lever">${leverParts(STATION.review, REVIEW_FRONT)}</g>`,
].join('');

export const ART_MARKUP = [
  `<g class="par-line-back">${back}</g>`,
  `<g id="carrier">${carrierParts()}</g>`,
  `<g id="sheet">${sheetParts()}</g>`,
  `<g class="par-line-front">${front}</g>`,
].join('');

/** Screen offset of one world unit along the rail. */
export const TRAVEL: Point2 = axisVector(P, [1, 0, 0]);

const HOME = STATION.registry;

export function carrierTransform(x: number) {
  return `translate(${(TRAVEL[0] * (x - HOME)).toFixed(2)} 0)`;
}

export function sheetTransform(x: number, fall: number) {
  const dx = TRAVEL[0] * (x - HOME);
  const dy = screenRise(SHEET_TOP - (BIN_FLOOR + 8.2), P) * fall;
  return `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`;
}

export function ramTransform(amount: number) {
  return `translate(0 ${screenRise(RAM_STROKE * amount, P).toFixed(2)})`;
}

export const LEVER_PIVOT: Point2 = leverPivot(STATION.review, REVIEW_FRONT);

export function leverTransform(amount: number) {
  const angle = (-30 * amount).toFixed(2);
  return `rotate(${angle} ${LEVER_PIVOT[0].toFixed(2)} ${LEVER_PIVOT[1].toFixed(2)})`;
}

export function punchTransform(amount: number) {
  return `translate(0 ${screenRise(2.6 * amount, P).toFixed(2)})`;
}

export function registerTransform(steps: number, cx: number, cy: number) {
  return `rotate(${(steps * 36).toFixed(1)} ${cx.toFixed(2)} ${cy.toFixed(2)})`;
}
