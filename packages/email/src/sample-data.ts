import type {
  AccountEventData,
  FailureDigestData,
  NarrativeEventData,
  WorkbookMailData,
} from './data';

/**
 * One sample dataset per mail family, shared by the dev preview, the admin
 * preview, the token examples, and the snapshot tests — so copy is reviewed
 * against the same data it ships with (email spec §6.1).
 */
export const SAMPLE_ORIGIN = 'https://par.buksu.edu.ph';

export function sampleNarrative(origin: string = SAMPLE_ORIGIN): NarrativeEventData {
  return {
    referenceNo: 'AR No. 0001',
    title: 'Coastal cleanup and mangrove planting',
    activityDate: '2026-10-21',
    location: 'Brgy. Poblacion, Malaybalay City',
    picName: 'M. Santos',
    submitterName: 'M. Santos',
    approvedAt: '2026-10-22T06:05:00.000Z',
    waitingDays: 7,
    origin,
    hasAttachment: true,
  };
}

/** Each account kind links where its own action goes, so examples read right. */
export function sampleAccount(
  actionUrl: string,
  origin: string = SAMPLE_ORIGIN,
): AccountEventData {
  return {
    fullName: 'M. Santos',
    actionUrl,
    roleLabel: 'Personnel',
    roleDescription:
      'Personnel in charge write and submit the narrative report for each activity assigned to them.',
    origin,
  };
}

export function sampleWorkbook(origin: string = SAMPLE_ORIGIN): WorkbookMailData {
  return {
    type: 'OFF_CAMPUS',
    schoolYear: '2026-2027',
    semester: 1,
    term: '1st Semester',
    reportCount: 12,
    generatedAt: '2026-10-21T01:30:00.000Z',
    generatedBy: 'A. Reyes',
    note: 'For the first semester filing.',
    hasAttachment: true,
    origin,
  };
}

export function sampleDigest(origin: string = SAMPLE_ORIGIN): FailureDigestData {
  return {
    count: 2,
    failures: [
      {
        kind: 'RETURNED',
        to: 'm.santos@student.buksu.edu.ph',
        error: 'The domain is not verified',
      },
    ],
    origin,
  };
}

/** The sample comment a returned narrative carries. */
export const SAMPLE_COMMENTS = 'Add the attendance sheet and correct the participant count.';
