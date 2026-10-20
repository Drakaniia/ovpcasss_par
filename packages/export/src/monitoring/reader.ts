import type { ReportType } from '@par/shared';
import { strFromU8, unzipSync } from 'fflate';

import { MONITORING_SHEET_NAMES } from './columns';

/**
 * One row read from an uploaded workbook. Values are already normalized:
 * dates are `YYYY-MM-DD` (or blank), counts are numbers, and header columns are
 * matched by their text so a reordered sheet still imports correctly.
 */
export interface ImportedMonitoringRow {
  type: ReportType;
  sheetName: string;
  rowNumber: number;
  dateReceived: string;
  trackingNumber: string;
  classification: string;
  campus: string;
  college: string;
  department: string;
  office: string;
  level: string;
  title: string;
  sdg: string;
  activityDate: string;
  location: string;
  totalStudents: number;
  totalPic: number;
  picName: string;
  picContact: string;
  dateCompleted: string;
}

export interface ParsedMonitoringSheet {
  type: ReportType;
  sheetName: string;
  rows: ImportedMonitoringRow[];
  /** Reserved template lines that carried no activity. */
  blankRows: number;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function decodeXml(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function attr(tag: string, name: string): string {
  const match = new RegExp(`${name}\\s*=\\s*"([^"]*)"`).exec(tag);
  return match ? decodeXml(match[1] ?? '') : '';
}

/** All `<t>` runs inside a string item, in document order. */
function textNodes(xml: string): string {
  return [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
    .map((match) => decodeXml(match[1] ?? ''))
    .join('');
}

function childText(xml: string, tag: string): string {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(xml);
  return match ? decodeXml(match[1] ?? '') : '';
}

function normalizePath(base: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1);

  const parts = `${base}/${target}`.split('/');
  const stack: string[] = [];

  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }

  return stack.join('/');
}

function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref.toUpperCase())?.[0] ?? 'A';
  let value = 0;

  for (const letter of letters) {
    value = value * 26 + letter.charCodeAt(0) - 64;
  }

  return value - 1;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function isoDate(year: number, month: number, day: number): string | null {
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;

  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Excel's 1900 date system, anchored at 1899-12-30. */
function serialToDate(serial: number): string {
  const value = Math.round(serial);
  const date = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
  return isoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()) ?? '';
}

/** M/D/Y is assumed, matching the office's sheets (spec §14 Q7). */
export function parseDateText(input: string): string {
  const text = input.trim().replace(/\s+/g, ' ');
  if (!text) return '';

  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text);
  if (match) return isoDate(Number(match[1]!), Number(match[2]!), Number(match[3]!)) ?? '';

  match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(text);
  if (match) {
    const year = Number(match[3]!) < 100 ? 2000 + Number(match[3]!) : Number(match[3]!);
    return isoDate(year, Number(match[1]!), Number(match[2]!)) ?? '';
  }

  match = /^(\d{1,2})[- ]([A-Za-z]{3,})[- ](\d{2,4})$/.exec(text);
  if (match) {
    const month = MONTHS[match[2]!.slice(0, 3).toLowerCase()];
    const year = Number(match[3]!) < 100 ? 2000 + Number(match[3]!) : Number(match[3]!);
    if (month) return isoDate(year, month, Number(match[1]!)) ?? '';
  }

  match = /^([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})$/.exec(text);
  if (match) {
    const month = MONTHS[match[1]!.slice(0, 3).toLowerCase()];
    if (month) return isoDate(Number(match[3]!), month, Number(match[2]!)) ?? '';
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return '';
  return isoDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate()) ?? '';
}

type HeaderKey =
  | 'index'
  | 'dateReceived'
  | 'trackingNumber'
  | 'classification'
  | 'campus'
  | 'college'
  | 'department'
  | 'office'
  | 'level'
  | 'title'
  | 'sdg'
  | 'activityDate'
  | 'location'
  | 'totalStudents'
  | 'totalPic'
  | 'picName'
  | 'picContact'
  | 'dateCompleted';

function headerKey(label: string): HeaderKey | null {
  const text = label
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .trim()
    .toLowerCase();

  if (text === 'no.' || text === 'no') return 'index';
  if (text === 'date received') return 'dateReceived';
  if (text === 'tracking number') return 'trackingNumber';
  if (text.startsWith('classification of')) return 'classification';
  if (text === 'campus') return 'campus';
  if (text === 'college') return 'college';
  if (text === 'department') return 'department';
  if (text === 'office') return 'office';
  if (text.startsWith('graduate')) return 'level';
  if (text === 'title of the activity') return 'title';
  if (text === 'sdg') return 'sdg';
  if (text === 'date of the activity') return 'activityDate';
  if (text === 'location') return 'location';
  if (text.startsWith('total number of students')) return 'totalStudents';
  if (text.startsWith('total number of pic')) return 'totalPic';
  if (text.startsWith('name of personnel')) return 'picName';
  if (text.startsWith('pic email') || text.startsWith('pic contact')) return 'picContact';
  if (text === 'date completed') return 'dateCompleted';

  return null;
}

type CellValue = string | number;

interface RawRow {
  rowNumber: number;
  cells: Map<number, CellValue>;
}

function parseRows(sheetXml: string, shared: readonly string[]): RawRow[] {
  const rows: RawRow[] = [];

  for (const rowMatch of sheetXml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const rowNumber = Number(attr(rowMatch[1] ?? '', 'r')) || rows.length + 1;
    const cells = new Map<number, CellValue>();

    for (const cellMatch of rowMatch[2]?.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g) ?? []) {
      const attributes = cellMatch[1] ?? '';
      const body = cellMatch[2] ?? '';
      const ref = attr(attributes, 'r');
      const type = attr(attributes, 't');

      if (!ref) continue;

      if (type === 'inlineStr') {
        cells.set(columnIndex(ref), textNodes(body).trim());
        continue;
      }

      const raw = childText(body, 'v');

      if (type === 's') {
        cells.set(columnIndex(ref), shared[Number(raw)] ?? '');
      } else if (type === 'str') {
        cells.set(columnIndex(ref), raw.trim());
      } else if (type === 'b') {
        cells.set(columnIndex(ref), raw === '1' ? 'TRUE' : 'FALSE');
      } else if (raw !== '') {
        const numeric = Number(raw);
        cells.set(columnIndex(ref), Number.isFinite(numeric) ? numeric : raw.trim());
      }
    }

    rows.push({ rowNumber, cells });
  }

  return rows;
}

function text(value: CellValue | undefined): string {
  return value === undefined ? '' : String(value).trim();
}

function number(value: CellValue | undefined): number {
  if (typeof value === 'number') return Math.round(value);
  const parsed = Number(text(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function dateValue(value: CellValue | undefined): string {
  if (value === undefined || value === '') return '';
  if (typeof value === 'number') return serialToDate(value);
  return parseDateText(value);
}

/** Maps the header row to column indices; tolerates reordered and extra columns. */
function headerMap(cells: Map<number, CellValue>): Map<HeaderKey, number> | null {
  const map = new Map<HeaderKey, number>();

  for (const [column, value] of cells) {
    const key = headerKey(text(value));
    if (key && !map.has(key)) map.set(key, column);
  }

  return map.has('trackingNumber') && map.has('title') ? map : null;
}

function readRow(
  type: ReportType,
  sheetName: string,
  row: RawRow,
  header: Map<HeaderKey, number>,
): ImportedMonitoringRow | null {
  const value = (key: HeaderKey): CellValue | undefined =>
    header.has(key) ? row.cells.get(header.get(key)!) : undefined;

  const trackingNumber = text(value('trackingNumber'));
  const title = text(value('title'));
  if (!trackingNumber && !title) return null;

  return {
    type,
    sheetName,
    rowNumber: row.rowNumber,
    dateReceived: dateValue(value('dateReceived')),
    trackingNumber,
    classification: text(value('classification')),
    campus: text(value('campus')),
    college: text(value('college')),
    department: text(value('department')),
    office: text(value('office')),
    level: text(value('level')),
    title,
    sdg: text(value('sdg')),
    activityDate: dateValue(value('activityDate')),
    location: text(value('location')),
    totalStudents: number(value('totalStudents')),
    totalPic: number(value('totalPic')),
    picName: text(value('picName')),
    picContact: text(value('picContact')),
    dateCompleted: dateValue(value('dateCompleted')),
  };
}

/**
 * Reads a filled monitoring workbook. Only the three monitoring sheets are
 * imported; the process and dropdown sheets are ignored.
 *
 * Throws a message suitable for the admin screen when the file is not an
 * `.xlsx`, has no monitoring sheet, or has no recognizable header row.
 */
export function parseMonitoringWorkbook(bytes: Uint8Array): ParsedMonitoringSheet[] {
  let files: Record<string, Uint8Array>;

  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error('This file is not an .xlsx workbook.');
  }

  const workbook = files['xl/workbook.xml'];
  if (!workbook) throw new Error('This file is not an .xlsx workbook.');

  const sharedXml = files['xl/sharedStrings.xml'];
  const shared = sharedXml
    ? [...strFromU8(sharedXml).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>|<si\s*\/>/g)].map((match) =>
        textNodes(match[1] ?? ''),
      )
    : [];

  const rels = new Map<string, string>();
  const relsXml = files['xl/_rels/workbook.xml.rels'];

  if (relsXml) {
    for (const match of strFromU8(relsXml).matchAll(/<Relationship\b([^>]*?)\/?>/g)) {
      rels.set(attr(match[1] ?? '', 'Id'), attr(match[1] ?? '', 'Target'));
    }
  }

  const sheetsByType = new Map<ReportType, ParsedMonitoringSheet>();

  for (const match of strFromU8(workbook).matchAll(/<sheet\b([^>]*?)\/?>/g)) {
    const name = attr(match[1] ?? '', 'name');
    const type = (Object.keys(MONITORING_SHEET_NAMES) as ReportType[]).find(
      (candidate) => MONITORING_SHEET_NAMES[candidate].toLowerCase() === name.trim().toLowerCase(),
    );
    if (!type) continue;

    const target = rels.get(attr(match[1] ?? '', 'r:id'));
    const path = target
      ? normalizePath('xl', target)
      : `xl/worksheets/sheet${sheetsByType.size + 1}.xml`;
    const sheetFile = files[path];
    if (!sheetFile) continue;

    const rows = parseRows(strFromU8(sheetFile), shared);
    const headerIndex = rows.findIndex((row) => headerMap(row.cells) !== null);

    if (headerIndex === -1) {
      throw new Error(`The ${name} sheet has no header row with Tracking Number.`);
    }

    const header = headerMap(rows[headerIndex]!.cells)!;
    let blankRows = 0;
    const imported = rows
      .slice(headerIndex + 1)
      .map((row) => readRow(type, name, row, header))
      .filter((row): row is ImportedMonitoringRow => {
        if (row === null) blankRows += 1;
        return row !== null;
      });

    sheetsByType.set(type, { type, sheetName: name, rows: imported, blankRows });
  }

  if (sheetsByType.size === 0) {
    throw new Error(
      'This workbook does not contain an OFF-CAMPUS, EDUCATIONAL TOUR, or IN-CAMPUS sheet.',
    );
  }

  return [...sheetsByType.values()];
}
