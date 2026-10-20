import type { ProgramLevel, UnitKind } from '@par/shared';

/**
 * Pure source values for the reference-data seed, keyed by natural keys so the
 * seed stays idempotent regardless of generated ids. Sourced from
 * `docs/OVPCASSS-PAPERLESS_PROCESS_FOR_PAR.md`, normalized per spec §8.
 */

export type SeedCampus = { code: string; name: string; sortOrder: number };

export type SeedUnit = {
  code: string;
  name: string;
  kind: UnitKind;
  campusCode: string;
  sortOrder: number;
};

export type SeedProgram = {
  code: string;
  name: string;
  level: ProgramLevel;
  unitCode: string;
  sortOrder: number;
};

export type SeedSdg = { number: number; title: string };

export const SEED_CAMPUSES: SeedCampus[] = [
  { code: 'MAIN', name: 'MAIN', sortOrder: 1 },
  { code: 'SATELLITE', name: 'SATELLITE', sortOrder: 2 },
];

export const SEED_UNITS: SeedUnit[] = [
  { code: 'CPAG', name: 'COLLEGE OF PUBLIC ADMINISTRATION AND GOVERNANCE', kind: 'COLLEGE', campusCode: 'MAIN', sortOrder: 1 },
  { code: 'CAS', name: 'COLLEGE OF ARTS AND SCIENCES', kind: 'COLLEGE', campusCode: 'MAIN', sortOrder: 2 },
  { code: 'CB', name: 'COLLEGE OF BUSINESS', kind: 'COLLEGE', campusCode: 'MAIN', sortOrder: 3 },
  { code: 'CED', name: 'COLLEGE OF EDUCATION', kind: 'COLLEGE', campusCode: 'MAIN', sortOrder: 4 },
  { code: 'CT', name: 'COLLEGE OF TECHNOLOGIES', kind: 'COLLEGE', campusCode: 'MAIN', sortOrder: 5 },
  { code: 'CON', name: 'COLLEGE OF NURSING', kind: 'COLLEGE', campusCode: 'MAIN', sortOrder: 6 },
  { code: 'COL', name: 'COLLEGE OF LAW', kind: 'COLLEGE', campusCode: 'MAIN', sortOrder: 7 },
  { code: 'DOCTORATE', name: 'DOCTORATE', kind: 'GRADUATE_SCHOOL_GROUP', campusCode: 'MAIN', sortOrder: 1 },
  { code: 'MASTERS', name: 'MASTERS', kind: 'GRADUATE_SCHOOL_GROUP', campusCode: 'MAIN', sortOrder: 2 },
  { code: 'TALAKAG', name: 'TALAKAG SATELLITE CAMPUS', kind: 'SATELLITE_CAMPUS', campusCode: 'SATELLITE', sortOrder: 1 },
  { code: 'ALUBIJID', name: 'ALUBIJID SATELLITE CAMPUS', kind: 'SATELLITE_CAMPUS', campusCode: 'SATELLITE', sortOrder: 2 },
  { code: 'BAUNGON', name: 'BAUNGON SATELLITE CAMPUS', kind: 'SATELLITE_CAMPUS', campusCode: 'SATELLITE', sortOrder: 3 },
  { code: 'TALISAYAN', name: 'TALISAYAN SATELLITE CAMPUS', kind: 'SATELLITE_CAMPUS', campusCode: 'SATELLITE', sortOrder: 4 },
  { code: 'MEDINA', name: 'MEDINA SATELLITE CAMPUS', kind: 'SATELLITE_CAMPUS', campusCode: 'SATELLITE', sortOrder: 5 },
  { code: 'LIBONA', name: 'LIBONA SATELLITE CAMPUS', kind: 'SATELLITE_CAMPUS', campusCode: 'SATELLITE', sortOrder: 6 },
  { code: 'MALITBOG', name: 'MALITBOG SATELLITE CAMPUS', kind: 'SATELLITE_CAMPUS', campusCode: 'SATELLITE', sortOrder: 7 },
  { code: 'IMPASUG-ONG', name: 'IMPASUG-ONG SATELLITE CAMPUS', kind: 'SATELLITE_CAMPUS', campusCode: 'SATELLITE', sortOrder: 8 },
  { code: 'SAN-FERNANDO', name: 'SAN-FERNANDO SATELLITE CAMPUS', kind: 'SATELLITE_CAMPUS', campusCode: 'SATELLITE', sortOrder: 9 },
  { code: 'QUEZON', name: 'QUEZON SATELLITE CAMPUS', kind: 'SATELLITE_CAMPUS', campusCode: 'SATELLITE', sortOrder: 10 },
  { code: 'KITAOTAO', name: 'KITAOTAO SATELLITE CAMPUS', kind: 'SATELLITE_CAMPUS', campusCode: 'SATELLITE', sortOrder: 11 },
  { code: 'DAMULOG', name: 'DAMULOG SATELLITE CAMPUS', kind: 'SATELLITE_CAMPUS', campusCode: 'SATELLITE', sortOrder: 12 },
  { code: 'KADINGILAN', name: 'KADINGILAN SATELLITE CAMPUS', kind: 'SATELLITE_CAMPUS', campusCode: 'SATELLITE', sortOrder: 13 },
  { code: 'LANTAPAN', name: 'LANTAPAN SATELLITE CAMPUS', kind: 'SATELLITE_CAMPUS', campusCode: 'SATELLITE', sortOrder: 14 },
  { code: 'CABANGLASAN', name: 'CABANGLASAN SATELLITE CAMPUS', kind: 'SATELLITE_CAMPUS', campusCode: 'SATELLITE', sortOrder: 15 },
  { code: 'SLS', name: 'SECONDARY LABORATORY SCHOOL', kind: 'OTHER_UNIT', campusCode: 'MAIN', sortOrder: 1 },
  { code: 'ELS', name: 'ELEMENTARY LABORATORY SCHOOL', kind: 'OTHER_UNIT', campusCode: 'MAIN', sortOrder: 2 },
  { code: 'NSTP', name: 'NATIONAL SERVICE TRAINING PROGRAM', kind: 'OTHER_UNIT', campusCode: 'MAIN', sortOrder: 3 },
];

// The workbook has no program->college mapping (spec §14 Q4); the unitCode below
// is inferred from the degree prefix and is admin-editable after seeding.
export const SEED_PROGRAMS: SeedProgram[] = [
  { code: 'BPA', name: 'Bachelor of Public Administration', level: 'UNDERGRADUATE', unitCode: 'CPAG', sortOrder: 1 },
  { code: 'AB-ECON', name: 'Bachelor of Arts in Economics', level: 'UNDERGRADUATE', unitCode: 'CAS', sortOrder: 2 },
  { code: 'AB-ENG', name: 'Bachelor of Arts in English Language', level: 'UNDERGRADUATE', unitCode: 'CAS', sortOrder: 3 },
  { code: 'AB-PHILO', name: 'Bachelor of Arts in Philosophy', level: 'UNDERGRADUATE', unitCode: 'CAS', sortOrder: 4 },
  { code: 'AB-SOCIO', name: 'Bachelor of Arts in Sociology', level: 'UNDERGRADUATE', unitCode: 'CAS', sortOrder: 5 },
  { code: 'BSCD', name: 'Bachelor of Science in Community Development', level: 'UNDERGRADUATE', unitCode: 'CAS', sortOrder: 6 },
  { code: 'BSDC', name: 'Bachelor of Science in Development Communication', level: 'UNDERGRADUATE', unitCode: 'CAS', sortOrder: 7 },
  { code: 'BS-MATH', name: 'Bachelor of Science in Mathematics', level: 'UNDERGRADUATE', unitCode: 'CAS', sortOrder: 8 },
  { code: 'BS-BIO', name: 'Bachelor of Science in Biology major in Biotechnology', level: 'UNDERGRADUATE', unitCode: 'CAS', sortOrder: 9 },
  { code: 'BS-ES', name: 'Bachelor of Science in Environmental Science major in Environmental Heritage Studies', level: 'UNDERGRADUATE', unitCode: 'CAS', sortOrder: 10 },
  { code: 'BSA', name: 'Bachelor of Science in Accountancy', level: 'UNDERGRADUATE', unitCode: 'CB', sortOrder: 11 },
  { code: 'BSBA-FM', name: 'Bachelor of Science in Business Administration major in Financial Management', level: 'UNDERGRADUATE', unitCode: 'CB', sortOrder: 12 },
  { code: 'BS-HM', name: 'Bachelor of Science in Hospitality Management', level: 'UNDERGRADUATE', unitCode: 'CB', sortOrder: 13 },
  { code: 'BECED', name: 'Bachelor of Early Childhood Education', level: 'UNDERGRADUATE', unitCode: 'CED', sortOrder: 14 },
  { code: 'BEED', name: 'Bachelor of Elementary Education', level: 'UNDERGRADUATE', unitCode: 'CED', sortOrder: 15 },
  { code: 'BPED', name: 'Bachelor of Physical Education', level: 'UNDERGRADUATE', unitCode: 'CED', sortOrder: 16 },
  { code: 'BSED-ENG', name: 'Bachelor of Secondary Education Major in English', level: 'UNDERGRADUATE', unitCode: 'CED', sortOrder: 17 },
  { code: 'BSED-FIL', name: 'Bachelor of Secondary Education Major in Filipino', level: 'UNDERGRADUATE', unitCode: 'CED', sortOrder: 18 },
  { code: 'BSED-MATH', name: 'Bachelor of Secondary Education Major in Mathematics', level: 'UNDERGRADUATE', unitCode: 'CED', sortOrder: 19 },
  { code: 'BSED-SOCSTUD', name: 'Bachelor of Secondary Education Major in Social Studies', level: 'UNDERGRADUATE', unitCode: 'CED', sortOrder: 20 },
  { code: 'BSED-SCI', name: 'Bachelor of Secondary Education Major in Science', level: 'UNDERGRADUATE', unitCode: 'CED', sortOrder: 21 },
  { code: 'BSAT', name: 'Bachelor of Science in Automotive Technology', level: 'UNDERGRADUATE', unitCode: 'CT', sortOrder: 22 },
  { code: 'BSET', name: 'Bachelor of Science in Electronics Technology', level: 'UNDERGRADUATE', unitCode: 'CT', sortOrder: 23 },
  { code: 'BSEMC-DAT', name: 'Bachelor of Science in Entertainment and Multimedia Computing', level: 'UNDERGRADUATE', unitCode: 'CT', sortOrder: 24 },
  { code: 'BSFT', name: 'Bachelor of Science in Food Technology', level: 'UNDERGRADUATE', unitCode: 'CT', sortOrder: 25 },
  { code: 'BSIT', name: 'Bachelor of Science in Information Technology', level: 'UNDERGRADUATE', unitCode: 'CT', sortOrder: 26 },
  { code: 'BSN', name: 'Bachelor of Science in Nursing', level: 'UNDERGRADUATE', unitCode: 'CON', sortOrder: 27 },
  { code: 'PHD-ISD', name: 'Doctor of Philosophy in Education Major in Instructional Systems Design', level: 'DOCTORATE', unitCode: 'DOCTORATE', sortOrder: 28 },
  { code: 'PHD-EL', name: 'Doctor of Philosophy in English Language', level: 'DOCTORATE', unitCode: 'DOCTORATE', sortOrder: 29 },
  { code: 'PHD-EA', name: 'Doctor of Philosophy in Educational Administration', level: 'DOCTORATE', unitCode: 'DOCTORATE', sortOrder: 30 },
  { code: 'PHDSE-MATH', name: 'Doctor of Philosophy in Science Education Major in Mathematics', level: 'DOCTORATE', unitCode: 'DOCTORATE', sortOrder: 31 },
  { code: 'PHDSE-BIO', name: 'Doctor of Philosophy in Science Education Major in Biology', level: 'DOCTORATE', unitCode: 'DOCTORATE', sortOrder: 32 },
  { code: 'DPA', name: 'Doctor of Public Administration', level: 'DOCTORATE', unitCode: 'DOCTORATE', sortOrder: 33 },
  { code: 'MAED-EA', name: 'Master of Arts in Education Major in Educational Administration', level: 'GRADUATE', unitCode: 'MASTERS', sortOrder: 34 },
  { code: 'MAED-ELT', name: 'Master of Arts in Education Major in English Language Teaching', level: 'GRADUATE', unitCode: 'MASTERS', sortOrder: 35 },
  { code: 'MAED-GS', name: 'Master of Arts in Education Major in General Science', level: 'GRADUATE', unitCode: 'MASTERS', sortOrder: 36 },
  { code: 'MAGC', name: 'Master of Arts in Guidance and Counseling', level: 'GRADUATE', unitCode: 'MASTERS', sortOrder: 37 },
  { code: 'MAED-ME', name: 'Master of Arts in Education Major in Mathematics Education', level: 'GRADUATE', unitCode: 'MASTERS', sortOrder: 38 },
  { code: 'MAEL', name: 'Master of Arts in English Language', level: 'GRADUATE', unitCode: 'MASTERS', sortOrder: 39 },
  { code: 'MAS', name: 'Master of Arts in Sociology', level: 'GRADUATE', unitCode: 'MASTERS', sortOrder: 40 },
  { code: 'MBA', name: 'Master of Business Administration', level: 'GRADUATE', unitCode: 'MASTERS', sortOrder: 41 },
  { code: 'MPA', name: 'Master of Public Administration', level: 'GRADUATE', unitCode: 'MASTERS', sortOrder: 42 },
  { code: 'JD', name: 'Juris Doctor (Non-Thesis)', level: 'LAW', unitCode: 'COL', sortOrder: 43 },
  { code: 'AB-SOCSCI', name: 'Bachelor of Arts in Social Science', level: 'UNDERGRADUATE', unitCode: 'CAS', sortOrder: 44 },
];

export const SEED_SDGS: SeedSdg[] = [
  { number: 1, title: 'No Poverty' },
  { number: 2, title: 'Zero Hunger' },
  { number: 3, title: 'Good Health and Well-being' },
  { number: 4, title: 'Quality Education' },
  { number: 5, title: 'Gender Equality' },
  { number: 6, title: 'Clean Water and Sanitation' },
  { number: 7, title: 'Affordable and Clean Energy' },
  { number: 8, title: 'Decent Work and Economic Growth' },
  { number: 9, title: 'Industry, Innovation and Infrastructure' },
  { number: 10, title: 'Reduced Inequalities' },
  { number: 11, title: 'Sustainable Cities and Communities' },
  { number: 12, title: 'Responsible Consumption and Production' },
  { number: 13, title: 'Climate Action' },
  { number: 14, title: 'Life Below Water' },
  { number: 15, title: 'Life on Land' },
  { number: 16, title: 'Peace, Justice and Strong Institutions' },
  { number: 17, title: 'Partnerships for the Goals' },
];
