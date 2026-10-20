/**
 * The tour the figure plays: one Post-Activity Report from draft to approval,
 * including the return that sends it back to its submitter. Every beat names
 * the API status it shows, so the readout can never invent a state.
 */
import type { ReportStatus } from '@par/shared';

import { STATION, type StationId } from './par-line-layout';

export type Pose = {
  /** Where the trolley is along the rail. */
  x: number;
  /** Where the report itself is — it stops following the trolley once filed. */
  sheetX: number;
  /** Registry, review and approval ram extension, 0 to 1. */
  rams: [number, number, number];
  /** How far the report has fallen into the filing bin. */
  fall: number;
  /** Report opacity, so a finished report can be replaced by a fresh draft. */
  ink: number;
  /** Impression opacity: tracking number, endorsement, approval seal. */
  marks: [number, number, number];
  /** Return lever, 0 resting to 1 thrown. */
  lever: number;
  /** Audit punch head. */
  punch: number;
  /** Register drum steps taken while this sheet was issued. */
  unit: number;
};

export type Ease = 'hold' | 'travel' | 'press' | 'drop';

export type Beat = {
  id: string;
  station: StationId | null;
  status: ReportStatus;
  caption: string;
  showsNumber: boolean;
  dur: number;
  ease: Ease;
  pose: Pose;
};

const START: Pose = {
  x: STATION.registry,
  sheetX: STATION.registry,
  rams: [0, 0, 0],
  fall: 0,
  ink: 1,
  marks: [0, 0, 0],
  lever: 0,
  punch: 0,
  unit: 0,
};

const beats: Beat[] = [];
let pose: Pose = { ...START };

function beat(
  meta: { id: string; station: StationId | null; status: ReportStatus; caption: string; showsNumber: boolean },
  patch: Partial<Pose>,
  dur: number,
  ease: Ease,
) {
  pose = { ...pose, ...patch };
  beats.push({ ...meta, dur, ease, pose });
}

const at = (x: number) => ({ x, sheetX: x });

beat(
  {
    id: 'draft',
    station: 'registry',
    status: 'DRAFT',
    caption: 'A draft exists only on the submitter’s device until it is submitted.',
    showsNumber: false,
  },
  {},
  2.2,
  'hold',
);

beat(
  {
    id: 'stamp',
    station: 'registry',
    status: 'DRAFT',
    caption: 'Submission validates the report and issues its tracking number.',
    showsNumber: false,
  },
  { rams: [1, 0, 0] },
  0.3,
  'press',
);

beat(
  {
    id: 'issued',
    station: 'registry',
    status: 'SUBMITTED',
    caption: 'The number is issued once, at first submission, and never changes.',
    showsNumber: true,
  },
  { rams: [0, 0, 0], marks: [1, 0, 0], unit: 1, punch: 1 },
  0.36,
  'press',
);

beat(
  {
    id: 'queue',
    station: 'registry',
    status: 'SUBMITTED',
    caption: 'The report enters the reviewer’s queue with its attachments.',
    showsNumber: true,
  },
  { punch: 0 },
  0.34,
  'travel',
);

beat(
  { id: 'to-review', station: 'review', status: 'SUBMITTED', caption: 'The reviewer reads the report.', showsNumber: true },
  at(STATION.review),
  1.3,
  'travel',
);

beat(
  {
    id: 'review',
    station: 'review',
    status: 'SUBMITTED',
    caption: 'Review checks the activity, its attachments and its figures.',
    showsNumber: true,
  },
  { rams: [0, 1, 0] },
  0.55,
  'press',
);

beat(
  {
    id: 'returned',
    station: 'review',
    status: 'RETURNED_BY_REVIEWER',
    caption: 'A return sends the report back to its submitter, with the reason recorded.',
    showsNumber: true,
  },
  { rams: [0, 0, 0], lever: 1 },
  0.5,
  'press',
);

beat(
  {
    id: 'back',
    station: 'registry',
    status: 'RETURNED_BY_REVIEWER',
    caption: 'It travels back to the submitter. The tracking number is unchanged.',
    showsNumber: true,
  },
  { ...at(STATION.registry), lever: 0, punch: 1 },
  1.6,
  'travel',
);

beat(
  {
    id: 'resubmitted',
    station: 'registry',
    status: 'RESUBMITTED',
    caption: 'Revised and resubmitted, the report returns to the review queue.',
    showsNumber: true,
  },
  { punch: 0 },
  1.5,
  'hold',
);

beat(
  { id: 'to-review-2', station: 'review', status: 'RESUBMITTED', caption: 'It is reviewed again.', showsNumber: true },
  at(STATION.review),
  1.3,
  'travel',
);

beat(
  {
    id: 'review-2',
    station: 'review',
    status: 'RESUBMITTED',
    caption: 'This time the reviewer endorses it to the approving officer.',
    showsNumber: true,
  },
  { rams: [0, 1, 0] },
  0.55,
  'press',
);

beat(
  {
    id: 'endorsed',
    station: 'review',
    status: 'ENDORSED',
    caption: 'Endorsement adds the reviewer’s mark and passes the report on.',
    showsNumber: true,
  },
  { rams: [0, 0, 0], marks: [1, 1, 0], punch: 1 },
  0.45,
  'press',
);

beat(
  {
    id: 'to-approve',
    station: 'approve',
    status: 'ENDORSED',
    caption: 'The approving officer receives the endorsed report.',
    showsNumber: true,
  },
  { ...at(STATION.approve), punch: 0 },
  1.3,
  'travel',
);

beat(
  {
    id: 'seal',
    station: 'approve',
    status: 'ENDORSED',
    caption: 'Approval records the date and the approving officer.',
    showsNumber: true,
  },
  { rams: [0, 0, 1] },
  0.45,
  'press',
);

beat(
  {
    id: 'approved',
    station: 'approve',
    status: 'APPROVED',
    caption: 'The approval seal is applied. No one approves a report they submitted.',
    showsNumber: true,
  },
  { rams: [0, 0, 0], marks: [1, 1, 1], punch: 1 },
  0.5,
  'press',
);

beat(
  {
    id: 'to-archive',
    station: 'archive',
    status: 'APPROVED',
    caption: 'The approval date and officer are recorded, and the acknowledgement is rendered.',
    showsNumber: true,
  },
  { ...at(STATION.archive), punch: 0 },
  1.25,
  'travel',
);

beat(
  {
    id: 'file',
    station: 'archive',
    status: 'APPROVED',
    caption: 'The report and its acknowledgement are archived; the entry is appended to the audit log.',
    showsNumber: true,
  },
  { fall: 1, punch: 1 },
  1.1,
  'drop',
);

beat(
  {
    id: 'empty',
    station: 'archive',
    status: 'APPROVED',
    caption: 'The tray returns empty for the next report.',
    showsNumber: true,
  },
  { ...at(STATION.registry), punch: 0 },
  1.7,
  'travel',
);

beat(
  {
    id: 'clear',
    station: 'registry',
    status: 'APPROVED',
    caption: 'The register takes the next number in the series.',
    showsNumber: true,
  },
  { ink: 0, unit: 0 },
  0.55,
  'hold',
);

beat(
  {
    id: 'next',
    station: 'registry',
    status: 'DRAFT',
    caption: 'A fresh Post-Activity Report begins as a draft.',
    showsNumber: false,
  },
  { ...START, marks: [0, 0, 0] },
  0.7,
  'hold',
);

export const BEATS: Beat[] = beats;

/** Duration of one full tour, in seconds. */
export const TOUR_SECONDS = BEATS.reduce((total, entry) => total + entry.dur, 0);

export function ease(value: number, kind: Ease): number {
  const k = Math.min(1, Math.max(0, value));
  if (kind === 'hold') return 1;
  if (kind === 'press') return k * k * (3 - 2 * k);
  if (kind === 'drop') return k * k;
  return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
}

export function lerpPose(from: Pose, to: Pose, k: number): Pose {
  const mix = (a: number, b: number) => a + (b - a) * k;
  return {
    x: mix(from.x, to.x),
    sheetX: mix(from.sheetX, to.sheetX),
    rams: [mix(from.rams[0], to.rams[0]), mix(from.rams[1], to.rams[1]), mix(from.rams[2], to.rams[2])],
    fall: mix(from.fall, to.fall),
    ink: mix(from.ink, to.ink),
    marks: [mix(from.marks[0], to.marks[0]), mix(from.marks[1], to.marks[1]), mix(from.marks[2], to.marks[2])],
    lever: mix(from.lever, to.lever),
    punch: mix(from.punch, to.punch),
    unit: mix(from.unit, to.unit),
  };
}

/** The first beat that works at a station, for the station buttons. */
export function beatForStation(station: StationId): number {
  const index = BEATS.findIndex(
    (entry) => entry.station === station && entry.pose.rams.some((ram) => ram > 0),
  );
  if (index >= 0) return index;
  const fallback = BEATS.findIndex((entry) => entry.station === station);
  return fallback < 0 ? 0 : fallback;
}
