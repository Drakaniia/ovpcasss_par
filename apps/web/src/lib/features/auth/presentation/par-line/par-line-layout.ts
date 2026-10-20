/**
 * World layout for the PAR routing line: one hanging gantry beam, a shuttle
 * rail carrying a fork tray, and the stations the tray passes. Heights are in
 * world units with z up. Nothing stands on a floor — the whole line hangs from
 * its beam, the way a real overhead conveyor does.
 */
import { boxCorners, fitProjection, type Plan } from './isometric';

export const VIEW_W = 600;
export const VIEW_H = 530;

/** The beam every station and the rail hang from. */
export const BEAM: Plan = { x: -180, y: -14, w: 360, d: 28, r: 3 };
export const BEAM_Z = 246;
export const BEAM_H = 14;
export const BEAM_TOP = BEAM_Z + BEAM_H;

/** The I-beam rail the trolley rides. */
export const RAIL_FROM = -152;
export const RAIL_TO = 152;
export const RAIL_TOP = 206;
export const RAIL_WEB = 197;
export const RAIL_BOTTOM = 193;
export const RAIL_W = 12;

/** Where each station works, and where the tray stops. */
export const STATION = { registry: -108, review: -36, approve: 36, archive: 104 } as const;
export type StationId = keyof typeof STATION;

export const PRESS_Y = -28;
export const HEAD_Z = 213;
export const HEAD_H = 13;
export const HEAD_TOP = HEAD_Z + HEAD_H;
/** Die face at rest, and the stroke that brings it onto the sheet. */
export const RAM_REST = 200.5;
export const RAM_STROKE = 9.8;

/** Fork tray and the report it carries. */
export const TRAY_TOP = 190;
export const TRAY_Y = -28;
export const TRAY_W = 56;
export const TRAY_D = 38;
export const SHEET_TOP = TRAY_TOP + 0.7;
export const SHEET_W = 46;
export const SHEET_D = 32;

/** The suspended filing bin under the archive stop. */
export const BIN: Plan = { x: 71, y: -46, w: 66, d: 38, r: 3 };
export const BIN_FLOOR = 142;
export const BIN_RIM = 154;
export const BIN_CENTRE = STATION.archive;

/** The audit ticker behind the rail, hung on a rear bracket. */
export const TICKER: Plan = { x: -136, y: 6, w: 62, d: 34, r: 4 };

export const P = fitProjection(
  [
    ...boxCorners(BEAM, BEAM_Z - 2, BEAM_TOP + 5),
    ...boxCorners(BIN, BIN_FLOOR - 1, BIN_RIM + 1),
    ...boxCorners(TICKER, 194, 232),
    [RAIL_FROM - 6, 0, RAIL_BOTTOM - 4],
    [RAIL_TO + 6, 0, RAIL_TOP],
    [STATION.review, PRESS_Y - 26, HEAD_TOP + 3],
    [STATION.review + 22, PRESS_Y - 24, 254],
    [STATION.approve, PRESS_Y - 20, HEAD_TOP + 12],
    [BIN.x + BIN.w, BIN.y, BIN_RIM],
  ],
  VIEW_W,
  VIEW_H,
  { pad: 20, azimuth: 32, elevation: 22 },
);
