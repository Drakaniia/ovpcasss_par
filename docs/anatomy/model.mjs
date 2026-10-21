// Pure domain model for the OVPCASSS Paperless Post-Activity Report (PAR) sorting machine.
// Every number, status, tracking rule, and motion pose in the figure comes from this model.

export const REPORT_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "RETURNED_BY_REVIEWER",
  "RESUBMITTED",
  "ENDORSED",
  "RETURNED_BY_APPROVER",
  "APPROVED",
];

// 7 true dial positions (angles in degrees, clockwise from top -y, spaced evenly across 270 deg)
export const DIAL_POSITIONS = [
  { status: "DRAFT", index: 0, angleDeg: -135, short: "DRF", station: "intake", x: -105, y: 0, z: 13.2, chute: false },
  { status: "SUBMITTED", index: 1, angleDeg: -90, short: "SUB", station: "review", x: -8, y: 0, z: 13.2, chute: false },
  { status: "RESUBMITTED", index: 2, angleDeg: -45, short: "RSB", station: "review", x: -8, y: 0, z: 13.2, chute: false },
  { status: "RETURNED_BY_REVIEWER", index: 3, angleDeg: 0, short: "RTR", station: "chute-rev", x: -52, y: 25.5, z: 12.2, chute: true },
  { status: "RETURNED_BY_APPROVER", index: 4, angleDeg: 45, short: "RTA", station: "chute-app", x: -16, y: 25.5, z: 12.2, chute: true },
  { status: "ENDORSED", index: 5, angleDeg: 90, short: "END", station: "approve", x: 56, y: 0, z: 13.2, chute: false },
  { status: "APPROVED", index: 6, angleDeg: 135, short: "APR", station: "archive", x: 96, y: 0, z: 13.2, chute: false },
];

export const ALLOWED_TRANSITIONS = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["RETURNED_BY_REVIEWER", "ENDORSED"],
  RETURNED_BY_REVIEWER: ["RESUBMITTED"],
  RESUBMITTED: ["RETURNED_BY_REVIEWER", "ENDORSED"],
  ENDORSED: ["APPROVED", "RETURNED_BY_APPROVER"],
  RETURNED_BY_APPROVER: ["RESUBMITTED"],
  APPROVED: [],
};

export const TRACKING_NUMBER = "OFF-2026-0001";

// Canonical walkthrough sequence that demonstrates every one of the 7 statuses and both return paths:
export const WORKFLOW_STEPS = [
  {
    step: 0,
    status: "DRAFT",
    stamped: false,
    stampEngagement: 0,
    gateAngle: 0,
    sealPress: 0,
    drawerOpen: 0,
    archiveLight: 0,
    tokenWaypoints: [[-105, 0, 13.2]],
    actionLabel: "Submitter places draft token in intake tray",
  },
  {
    step: 1,
    status: "SUBMITTED",
    stamped: true,
    stampEngagement: 1, // engages once on first submission!
    gateAngle: 0,
    sealPress: 0,
    drawerOpen: 0,
    archiveLight: 0,
    tokenWaypoints: [[-105, 0, 13.2], [-54, 0, 13.2], [-8, 0, 13.2]],
    actionLabel: "Stamper punches OFF-2026-0001 on first submission",
  },
  {
    step: 2,
    status: "RETURNED_BY_REVIEWER",
    stamped: true,
    stampEngagement: 0,
    gateAngle: 1,
    sealPress: 0,
    drawerOpen: 0,
    archiveLight: 0,
    tokenWaypoints: [[-8, 0, 13.2], [-8, 25.5, 12.2], [-52, 25.5, 12.2], [-94, 25.5, 12.2], [-105, 0, 13.2]],
    actionLabel: "Returned by reviewer via return chute to intake",
  },
  {
    step: 3,
    status: "RESUBMITTED",
    stamped: true,
    stampEngagement: 0, // stamper does NOT re-punch!
    gateAngle: 0,
    sealPress: 0,
    drawerOpen: 0,
    archiveLight: 0,
    tokenWaypoints: [[-105, 0, 13.2], [-54, 0, 13.2], [-8, 0, 13.2]],
    actionLabel: "Resubmitted; stamper locked out, OFF-2026-0001 preserved",
  },
  {
    step: 4,
    status: "ENDORSED",
    stamped: true,
    stampEngagement: 0,
    gateAngle: 0,
    sealPress: 0,
    drawerOpen: 0,
    archiveLight: 0,
    tokenWaypoints: [[-8, 0, 13.2], [24, 0, 13.2], [56, 0, 13.2]],
    actionLabel: "Endorsed by reviewer; passes under separator bar to approver",
  },
  {
    step: 5,
    status: "RETURNED_BY_APPROVER",
    stamped: true,
    stampEngagement: 0,
    gateAngle: 1,
    sealPress: 0,
    drawerOpen: 0,
    archiveLight: 0,
    tokenWaypoints: [[56, 0, 13.2], [62, 25.5, 12.2], [-16, 25.5, 12.2], [-94, 25.5, 12.2], [-105, 0, 13.2]],
    actionLabel: "Returned by approver via return chute to intake",
  },
  {
    step: 6,
    status: "RESUBMITTED",
    stamped: true,
    stampEngagement: 0,
    gateAngle: 0,
    sealPress: 0,
    drawerOpen: 0,
    archiveLight: 0,
    tokenWaypoints: [[-105, 0, 13.2], [-54, 0, 13.2], [-8, 0, 13.2]],
    actionLabel: "Resubmitted after approver return; OFF-2026-0001 preserved",
  },
  {
    step: 7,
    status: "ENDORSED",
    stamped: true,
    stampEngagement: 0,
    gateAngle: 0,
    sealPress: 0,
    drawerOpen: 0,
    archiveLight: 0,
    tokenWaypoints: [[-8, 0, 13.2], [24, 0, 13.2], [56, 0, 13.2]],
    actionLabel: "Re-endorsed to approver seal press",
  },
  {
    step: 8,
    status: "APPROVED",
    stamped: true,
    stampEngagement: 0,
    gateAngle: 0,
    sealPress: 1,
    drawerOpen: 1,
    archiveLight: 1,
    tokenWaypoints: [[56, 0, 13.2], [90, 0, 13.2]],
    actionLabel: "Approved and sealed; stored as light in archive cylinder",
  },
];

export function dialIndexForStatus(status) {
  const found = DIAL_POSITIONS.find((d) => d.status === status);
  return found ? found.index : 0;
}

export function dialAngleRadForStatus(status) {
  const found = DIAL_POSITIONS.find((d) => d.status === status);
  return ((found ? found.angleDeg : -135) * Math.PI) / 180;
}

export function formatReadout(status, stamped) {
  const num = stamped ? TRACKING_NUMBER : "unissued";
  return `${status} · ${num}`;
}
