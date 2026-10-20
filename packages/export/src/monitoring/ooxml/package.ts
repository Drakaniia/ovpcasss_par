import type { ReportType } from '@par/shared';
import { strToU8, zipSync } from 'fflate';

import { BSU_SEAL_BASE64, OVPCASSS_LOGO_BASE64 } from './assets';
import { SHEET_LAYOUTS } from './sample/layouts';
import { FIXED_SHARED_STRINGS } from './sample/strings';
import { STYLE_SHEET_XML, THEME_XML } from './sample/styles';

/** A row cell: text, a number, a real date cell, or an intentionally blank cell. */
export type SheetCell = string | number | { date: string } | null;

export interface SheetSpec {
  type: ReportType;
  /** Merged title in A1:R1; may contain a line break. */
  title: string;
  rows: readonly (readonly SheetCell[])[];
}

const COLUMN_COUNT = 18;
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

/**
 * Body cell styles A..R, taken from the source workbook. OFF-CAMPUS carries the
 * office's own body row (centred number, dates as date cells, left-aligned
 * text); the educational-tour sheet has no body row to copy, so it uses the
 * same office formatting; IN-CAMPUS keeps its own centred variant.
 *
 * Column L is the one deliberate departure: the source leaves Date of the
 * Activity on General, which would show a raw serial, so it takes the workbook's
 * own date format (style 18), exactly as Date Completed already has.
 */
const BODY_STYLES = {
  OFF_CAMPUS: [25, 34, 24, 16, 16, 16, 16, 16, 16, 16, 14, 18, 16, 14, 14, 10, 14, 18],
  EDUCATIONAL_TOUR: [25, 34, 24, 16, 16, 16, 16, 16, 16, 16, 14, 18, 16, 14, 14, 10, 14, 18],
  IN_CAMPUS: [14, 18, 14, 14, 14, 14, 14, 14, 14, 14, 14, 18, 14, 14, 14, 14, 14, 18],
} as const satisfies Record<ReportType, readonly number[]>;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 || code === 9 || code === 10;
    })
    .join('');
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodeBase64(value: string): Uint8Array {
  const clean = value.replace(/=+$/, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let offset = 0;

  for (const char of clean) {
    const index = BASE64_ALPHABET.indexOf(char);
    if (index < 0) continue;
    buffer = ((buffer << 6) | index) & 0xff_ff_ff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[offset++] = (buffer >> bits) & 0xff;
    }
  }

  return bytes.subarray(0, offset);
}

/** Excel's 1900 date system, anchored at 1899-12-30. */
function excelSerial(isoDate: string): number {
  const [year = 1899, month = 12, day = 30] = isoDate.split('-').map(Number);
  const utc = Date.UTC(year, month - 1, day);
  return Math.round((utc - Date.UTC(1899, 11, 30)) / 86_400_000);
}

function columnLetter(index: number): string {
  let value = index + 1;
  let letters = '';

  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }

  return letters;
}

/**
 * Shared strings for one workbook. The first 100 entries are the source
 * workbook's own, so the title and header rows keep their original indices;
 * row values are appended after them.
 */
class SharedStrings {
  readonly items: string[] = [...FIXED_SHARED_STRINGS];
  readonly #index = new Map<string, number>(
    FIXED_SHARED_STRINGS.map((value, position) => [value, position]),
  );
  references = 0;

  /** Index of `value`, appending it when it is not in the table yet. */
  reference(value: string): number {
    let index = this.#index.get(value);
    if (index === undefined) {
      index = this.items.length;
      this.items.push(value);
      this.#index.set(value, index);
    }
    this.references += 1;
    return index;
  }

  xml(): string {
    const entries = this.items
      .map((value) => {
        const preserve = value.trim() !== value ? ' xml:space="preserve"' : '';
        return `<si><t${preserve}>${escapeXml(value)}</t></si>`;
      })
      .join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${this.references}" uniqueCount="${this.items.length}">${entries}</sst>`;
  }
}

function cellXml(ref: string, style: number, value: SheetCell, shared: SharedStrings): string {
  if (value === null || value === '') return `<c r="${ref}" s="${style}"/>`;

  if (typeof value === 'number') {
    return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  }

  if (typeof value === 'object') {
    return `<c r="${ref}" s="${style}"><v>${excelSerial(value.date)}</v></c>`;
  }

  return `<c r="${ref}" s="${style}" t="s"><v>${shared.reference(value)}</v></c>`;
}

/** `<row r="n" ...>` with the source's own row attributes. */
function rowOpen(attributes: string, rowNumber: number): string {
  return attributes.replace('<row', `<row r="${rowNumber}"`);
}

function bodyRowXml(
  type: ReportType,
  row: readonly SheetCell[],
  rowNumber: number,
  shared: SharedStrings,
): string {
  const layout = SHEET_LAYOUTS[type];
  const cells = Array.from({ length: COLUMN_COUNT }, (_, index) =>
    cellXml(
      `${columnLetter(index)}${rowNumber}`,
      BODY_STYLES[type][index] ?? 16,
      row[index] ?? null,
      shared,
    ),
  );

  return `${rowOpen(layout.blankRowAttrs, rowNumber)}${cells.join('')}</row>`;
}

/** A bordered but empty row, so the printed grid keeps the source's depth. */
function blankRowXml(type: ReportType, rowNumber: number): string {
  const layout = SHEET_LAYOUTS[type];
  const cells = Array.from(
    { length: COLUMN_COUNT },
    (_, index) => `<c r="${columnLetter(index)}${rowNumber}" s="${BODY_STYLES[type][index] ?? 16}"/>`,
  );

  return `${rowOpen(layout.blankRowAttrs, rowNumber)}${cells.join('')}</row>`;
}

/** Fills the signature text box's two row anchors in document order. */
function anchorDrawing(xml: string, firstRow: number, lastRow: number): string {
  let seen = 0;
  return xml.replaceAll('__ANCHOR__', () => String(seen++ === 0 ? firstRow : lastRow));
}

/** The source's own row depth, kept even when the export has fewer rows. */
function bodyRowCount(sheet: SheetSpec): number {
  return Math.max(sheet.rows.length, SHEET_LAYOUTS[sheet.type].blankRows.length);
}

function sheetXml(sheet: SheetSpec, shared: SharedStrings): string {
  const layout = SHEET_LAYOUTS[sheet.type];
  const bodyRows = bodyRowCount(sheet);
  const dataRows = sheet.rows.map((row, index) => bodyRowXml(sheet.type, row, index + 3, shared));
  const filler = sheet.rows.length === 0
    ? layout.blankRows
    : Array.from({ length: bodyRows - sheet.rows.length }, (_, index) =>
        blankRowXml(sheet.type, 3 + sheet.rows.length + index),
      );

  // The educational-tour sheet's band row is only kept when the sheet is empty.
  const merges = sheet.rows.length === 0 ? layout.merges : ['A1:R1'];
  const mergeXml = `<mergeCells count="${merges.length}">${merges
    .map((ref) => `<mergeCell ref="${ref}"/>`)
    .join('')}</mergeCells>`;

  const titleRow = layout.titleRow.replace('__TITLE__', String(shared.reference(sheet.title)));

  return `${layout.head.replace('__DIM__', `A1:R${2 + bodyRows}`)}${titleRow}${layout.headerRow}${[
    ...dataRows,
    ...filler,
  ].join('')}${layout.tail.replace('__MERGES__', mergeXml)}`;
}

function signatureDrawingXml(sheet: SheetSpec): string {
  const layout = SHEET_LAYOUTS[sheet.type];
  const gap = layout.sourceAnchor - 2 - layout.blankRows.length;
  const anchor = 2 + bodyRowCount(sheet) + gap;

  return anchorDrawing(
    layout.drawing,
    anchor,
    anchor + layout.sourceAnchorEnd - layout.sourceAnchor,
  );
}

function sheetRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL_NS}/drawing" Target="../drawings/drawing1.xml"/><Relationship Id="rId2" Type="${REL_NS}/vmlDrawing" Target="../drawings/vmlDrawing1.vml"/></Relationships>`;
}

function workbookXml(sheets: readonly SheetSpec[]): string {
  const entries = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXml(SHEET_LAYOUTS[sheet.type].name)}" sheetId="${
          index + 1
        }" r:id="rId${index + 1}"/>`,
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${REL_NS}"><fileVersion appName="xl" lastEdited="7" lowestEdited="7" rupBuild="24332"/><workbookPr defaultThemeVersion="166925"/><bookViews><workbookView/></bookViews><sheets>${entries}</sheets><calcPr calcId="191029"/></workbook>`;
}

function workbookRelsXml(sheets: readonly SheetSpec[]): string {
  const entries = sheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="${REL_NS}/worksheet" Target="worksheets/sheet${
          index + 1
        }.xml"/>`,
    )
    .join('');
  const theme = sheets.length + 1;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${entries}<Relationship Id="rId${theme}" Type="${REL_NS}/theme" Target="theme/theme1.xml"/><Relationship Id="rId${
    theme + 1
  }" Type="${REL_NS}/styles" Target="styles.xml"/><Relationship Id="rId${
    theme + 2
  }" Type="${REL_NS}/sharedStrings" Target="sharedStrings.xml"/></Relationships>`;
}

function rootRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${REL_NS}/extended-properties" Target="docProps/app.xml"/></Relationships>`;
}

function contentTypesXml(sheets: readonly SheetSpec[]): string {
  const overrides = sheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/drawings/drawing${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`,
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="png" ContentType="image/png"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>${overrides}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
}

function coreXml(createdAt: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>OVPCASSS Paperless PAR</dc:creator><cp:lastModifiedBy>OVPCASSS Paperless PAR</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:modified></cp:coreProperties>`;
}

function appXml(sheets: readonly SheetSpec[]): string {
  const names = sheets
    .map((sheet) => `<vt:lpstr>${escapeXml(SHEET_LAYOUTS[sheet.type].name)}</vt:lpstr>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Excel</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>${sheets.length}</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="${sheets.length}" baseType="lpstr">${names}</vt:vector></TitlesOfParts><Company></Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0300</AppVersion></Properties>`;
}

/**
 * Builds a complete `.xlsx` workbook whose sheets are the office's own: the
 * source styles, letterhead images and header/footer, signature block, column
 * widths, and print setup, with the rows filled in.
 */
export function buildXlsxPackage(
  sheets: readonly SheetSpec[],
  options: { createdAt?: string } = {},
): Uint8Array {
  if (sheets.length === 0) throw new Error('A workbook needs at least one sheet');

  const createdAt = options.createdAt ?? new Date().toISOString();
  const shared = new SharedStrings();
  const sheetParts = sheets.map((sheet) => sheetXml(sheet, shared));

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(contentTypesXml(sheets)),
    '_rels/.rels': strToU8(rootRelsXml()),
    'docProps/core.xml': strToU8(coreXml(createdAt)),
    'docProps/app.xml': strToU8(appXml(sheets)),
    'xl/workbook.xml': strToU8(workbookXml(sheets)),
    'xl/_rels/workbook.xml.rels': strToU8(workbookRelsXml(sheets)),
    'xl/styles.xml': strToU8(STYLE_SHEET_XML),
    'xl/theme/theme1.xml': strToU8(THEME_XML),
    'xl/sharedStrings.xml': strToU8(shared.xml()),
    'xl/media/image1.jpeg': decodeBase64(OVPCASSS_LOGO_BASE64),
    'xl/media/image2.png': decodeBase64(BSU_SEAL_BASE64),
  };

  sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(sheetParts[index]!);
    files[`xl/worksheets/_rels/sheet${index + 1}.xml.rels`] = strToU8(sheetRelsXml());
    files[`xl/drawings/drawing${index + 1}.xml`] = strToU8(signatureDrawingXml(sheet));
    files[`xl/drawings/vmlDrawing${index + 1}.vml`] = strToU8(SHEET_LAYOUTS[sheet.type].vml);
    files[`xl/drawings/_rels/vmlDrawing${index + 1}.vml.rels`] = strToU8(
      SHEET_LAYOUTS[sheet.type].vmlRels,
    );
  });

  return zipSync(files, { level: 6 });
}
