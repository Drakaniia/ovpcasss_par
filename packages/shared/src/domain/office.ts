/**
 * The office's identity, taken verbatim from the sample `.eml` (email spec §4.2).
 * One source for every surface that prints it — the mail shell, the facsimile,
 * the acknowledgement, and the workbook letterhead — so the two institutional
 * names that used to coexist cannot drift again.
 */
export const UNIVERSITY_NAME = 'BUKIDNON STATE UNIVERSITY';

export const OFFICE_NAME =
  'Office of the Vice President for Culture, Arts, Sports and Student Services';

export const OFFICE_ADDRESS_LINES = [
  'Ground Floor Administration Building',
  'Fortich St., Malaybalay City, Bukidnon 8700',
] as const;

/** The short form used in a mail header band and nowhere else. */
export const OFFICE_SHORT_NAME = 'OVPCASSS';

/** The four-line block from the `.eml`, in order, with `----` above it. */
export const SIGNATURE_RULE = '----';
export const SIGNATURE_LINES = [UNIVERSITY_NAME, OFFICE_NAME, ...OFFICE_ADDRESS_LINES] as const;

/** The office mailbox: workbook default recipient and the failure-digest fallback. */
export const OFFICE_EMAIL_ADDRESS = 'ovpcasss@buksu.edu.ph';
