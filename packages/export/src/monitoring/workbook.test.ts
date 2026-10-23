import { readFileSync } from 'node:fs';

import type { MonitoringSheetRow, ReportType } from '@par/shared';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { MONITORING_COLUMNS, MONITORING_SHEET_NAMES } from './columns';
import { SHEET_GEOMETRY } from './ooxml/sample/geometry';
import { SHEET_LAYOUTS } from './ooxml/sample/layouts';
import { buildMonitoringTemplate, buildMonitoringWorkbook } from './workbook';

const SAMPLE: MonitoringSheetRow = {
  index: 1,
  dateReceived: '2026-03-14',
  referenceNo: 'AR No. 0042',
  classification: 'Curricular',
  campus: 'MAIN',
  college: 'COLLEGE OF EDUCATION',
  department: 'Elementary Education',
  office: 'OVPCASSS',
  level: 'Undergraduate',
  title: 'Community Literacy Outreach',
  sdg: '4, 10',
  activityDate: '2026-03-12',
  location: 'Barangay Poblacion',
  totalStudents: 120,
  totalPic: 4,
  picName: 'Maria Santos',
  picContact: 'maria.santos@example.edu',
  dateCompleted: '2026-03-20',
  dateRequested: '2026-03-10',
};

/**
 * The office's own file, the reference every export is measured against. The
 * test scripts run with the package as their working directory.
 */
const SOURCE = '../../docs/OVPCASSS-PAPERLESS PROCESS FOR PAR.xlsx';

function sameBytes(left: Uint8Array | undefined, right: Uint8Array | undefined): boolean {
  if (!left || !right || left.length !== right.length) return false;
  return left.every((byte, index) => byte === right[index]);
}

function sampleWorkbook(type: ReportType = 'OFF_CAMPUS', rows: MonitoringSheetRow[] = [SAMPLE]) {
  return buildMonitoringWorkbook({
    type,
    schoolYear: '2025-2026',
    semester: 2,
    createdAt: '2026-03-21T00:00:00.000Z',
    rows,
  });
}

function text(files: Record<string, Uint8Array>, path: string): string {
  return strFromU8(files[path]!);
}

/** Relationship ids are ours to number; everything else must be identical. */
function normalize(xml: string): string {
  return xml.replace(/\r\n/g, '\n').replace(/ r:id="rId\d+"/g, '');
}

/** Our deliberate nineteenth column, removed so the source A..R can be compared. */
function withoutRequestedColumn(xml: string): string {
  return xml
    .replace(/<col min="19" max="19"[^>]*\/>/, '')
    .replaceAll('min="20"', 'min="19"')
    .replaceAll('spans="1:19"', 'spans="1:18"')
    .replace(/A1:S(\d+)/g, 'A1:R$1')
    .replace('A3:S3', 'A3:R3')
    .replace(/<c r="S2"[^>]*><v>100<\/v><\/c>/g, '')
    .replace(/<c r="S\d+"[^>]*\/>/g, '');
}

describe('monitoring workbook', () => {
  it('writes the office three sheets in source order, only the selected one filled', () => {
    const files = unzipSync(sampleWorkbook());
    const workbook = text(files, 'xl/workbook.xml');

    for (const name of Object.values(MONITORING_SHEET_NAMES)) {
      expect(workbook).toContain(`name="${name}"`);
    }
    expect(text(files, 'xl/sharedStrings.xml')).toContain(
      'LOCAL OFF-CAMPUS  ACTIVITIES MONITORING\n2nd SEMESTER, SY 2025-2026',
    );
    expect(text(files, 'xl/worksheets/sheet1.xml')).toContain(
      '<c r="A2" s="1" t="s"><v>17</v></c>',
    );
  });

  it('leaves the two unselected sheets exactly as the office ships them', () => {
    const files = unzipSync(sampleWorkbook());

    // Blank and bordered: the source's own reserved depth, not an empty grid.
    expect(text(files, 'xl/worksheets/sheet2.xml')).toContain('<dimension ref="A1:S5"/>');
    expect(text(files, 'xl/worksheets/sheet2.xml')).toContain('<mergeCell ref="A3:S3"/>');
    expect(text(files, 'xl/worksheets/sheet3.xml')).toContain('<dimension ref="A1:S5"/>');
  });

  it('writes every value into the workbook strings', () => {
    const strings = text(unzipSync(sampleWorkbook()), 'xl/sharedStrings.xml');

    for (const value of [
      'AR No. 0042',
      'Curricular',
      'MAIN',
      'COLLEGE OF EDUCATION',
      'Elementary Education',
      'OVPCASSS',
      'Undergraduate',
      'Community Literacy Outreach',
      '4, 10',
      'Barangay Poblacion',
      'Maria Santos',
      'maria.santos@example.edu',
    ]) {
      expect(strings).toContain(value);
    }
  });

  it('writes the nineteen headings and nineteen body cells', () => {
    const files = unzipSync(sampleWorkbook());
    const strings = text(files, 'xl/sharedStrings.xml');
    const sheet = text(files, 'xl/worksheets/sheet1.xml');
    const header = /<row r="2"[\s\S]*?<\/row>/.exec(sheet)?.[0] ?? '';
    const body = /<row r="3"[\s\S]*?<\/row>/.exec(sheet)?.[0] ?? '';

    expect(MONITORING_COLUMNS).toHaveLength(19);
    expect(strings).toContain('Receipt No. / AR No.');
    expect(strings).toContain('Date Requested');
    expect(header).toContain('spans="1:19"');
    expect(header).toContain('<c r="S2" s="2" t="s"><v>100</v></c>');
    expect(header.match(/<c r="[A-S]2"/g)).toHaveLength(19);
    expect(body.match(/<c r="[A-S]3"/g)).toHaveLength(19);
    expect(sheet).toContain('<mergeCell ref="A1:S1"/>');
    expect(sheet).toContain('<dimension ref="A1:S22"/>');
  });

  it('references only shared strings that the workbook declares', () => {
    const files = unzipSync(sampleWorkbook());
    const strings = text(files, 'xl/sharedStrings.xml');
    const count = Number(/uniqueCount="(\d+)"/.exec(strings)?.[1]);

    for (const path of [
      'xl/worksheets/sheet1.xml',
      'xl/worksheets/sheet2.xml',
      'xl/worksheets/sheet3.xml',
    ]) {
      const sheet = text(files, path);
      for (const match of sheet.matchAll(/t="s"[^>]*><v>(\d+)<\/v>/g)) {
        expect(Number(match[1])).toBeLessThan(count);
      }
    }
  });

  it('writes dates as date cells, in the workbook date format', () => {
    const files = unzipSync(sampleWorkbook());
    const sheet = text(files, 'xl/worksheets/sheet1.xml');

    // 14 Mar 2026, 12 Mar 2026, and 20 Mar 2026 as Excel serials.
    expect(sheet).toContain('<c r="B3" s="34"><v>46095</v></c>');
    expect(sheet).toContain('<c r="L3" s="18"><v>46093</v></c>');
    expect(sheet).toContain('<c r="R3" s="18"><v>46101</v></c>');
    expect(sheet).toContain('<c r="S3" s="34"><v>46091</v></c>');
  });

  it('blanks Date Completed for an in-progress report instead of writing text', () => {
    const files = unzipSync(
      sampleWorkbook('OFF_CAMPUS', [{ ...SAMPLE, dateCompleted: '', sdg: '' }]),
    );
    const sheet = text(files, 'xl/worksheets/sheet1.xml');

    expect(sheet).not.toContain('46101');
  });

  it('keeps the source sheet depth below the data', () => {
    const offCampus = text(unzipSync(sampleWorkbook()), 'xl/worksheets/sheet1.xml');
    const inCampus = text(unzipSync(sampleWorkbook('IN_CAMPUS')), 'xl/worksheets/sheet3.xml');

    expect(offCampus).toContain('<dimension ref="A1:S22"/>');
    expect(offCampus).toContain('<row r="22"');
    expect(inCampus).toContain('<dimension ref="A1:S5"/>');
  });

  it('moves the signature block below the last data row', () => {
    const files = unzipSync(
      sampleWorkbook(
        'OFF_CAMPUS',
        Array.from({ length: 26 }, (_, index) => ({ ...SAMPLE, index: index + 1 })),
      ),
    );
    const drawing = text(files, 'xl/drawings/drawing1.xml');
    const anchors = [...drawing.matchAll(/<xdr:row>(\d+)<\/xdr:row>/g)].map((match) =>
      Number(match[1]),
    );

    // 26 data rows end on row 28; the source leaves two blank rows, then A4:S29.
    expect(anchors).toEqual([30, 35]);
    expect(text(files, 'xl/worksheets/sheet1.xml')).toContain('<dimension ref="A1:S28"/>');
  });

  it('embeds the source letterhead images, header text, and signature drawing', () => {
    const files = unzipSync(sampleWorkbook());
    const sheet = text(files, 'xl/worksheets/sheet1.xml');
    const sheetRels = text(files, 'xl/worksheets/_rels/sheet1.xml.rels');
    const vml = text(files, 'xl/drawings/vmlDrawing1.vml');
    const logo = files['xl/media/image1.jpeg']!;
    const seal = files['xl/media/image2.png']!;
    expect(files['xl/media/ovpcass-logo.jpeg']).toBeUndefined();

    expect(sheet).toContain('&amp;L&amp;G');
    expect(sheet).toContain('&amp;R&amp;G');
    expect(sheet).toContain('legacyDrawingHF r:id="rId2"');
    expect(sheetRels).toContain('vmlDrawing1.vml');
    expect(sheetRels).toContain('drawing1.xml');
    expect(vml).toContain('OVPCASSS LOGO');
    expect(vml).toContain('426557996_357309900457894_2898498537349085756_n-removebg-preview');
    // The source's own artwork: the wordmark and the seal, unmodified.
    expect(logo.length).toBe(130_477);
    expect(seal.length).toBe(253_298);
  });

  it('builds a blank template with all three sheets and underscore titles', () => {
    const template = buildMonitoringTemplate();
    const files = unzipSync(template);

    for (const name of Object.values(MONITORING_SHEET_NAMES)) {
      expect(text(files, 'xl/workbook.xml')).toContain(`name="${name}"`);
    }
    expect(text(files, 'xl/sharedStrings.xml')).toContain('______ SEMESTER, SY ________');
  });

  it('names its sheets exactly as the source workbook does', () => {
    for (const type of Object.keys(SHEET_LAYOUTS) as ReportType[]) {
      expect(SHEET_LAYOUTS[type].name).toBe(MONITORING_SHEET_NAMES[type]);
    }
  });
});

/**
 * The preview facsimile draws with these numbers, so they have to be read from
 * the source worksheet rather than eyeballed: a wrong width or height shows up
 * as a grid that does not line up with the file the office prints.
 */
describe('preview geometry is the source grid', () => {
  const source = unzipSync(readFileSync(SOURCE));
  const sheets: [ReportType, string][] = [
    ['OFF_CAMPUS', 'xl/worksheets/sheet2.xml'],
    ['EDUCATIONAL_TOUR', 'xl/worksheets/sheet3.xml'],
    ['IN_CAMPUS', 'xl/worksheets/sheet4.xml'],
  ];

  function widths(xml: string): number[] {
    const result = Array.from({ length: 18 }, () => 0);

    for (const match of xml.matchAll(/<col min="(\d+)" max="(\d+)" width="([\d.]+)"/g)) {
      const [, low, high, width] = match;
      for (let column = Number(low); column <= Math.min(Number(high), 18); column += 1) {
        result[column - 1] = Number(width);
      }
    }

    return result;
  }

  function rowHeight(xml: string, row: number): number | undefined {
    const height = new RegExp(`<row r="${row}"[^>]*? ht="([\\d.]+)"`).exec(xml)?.[1];
    return height === undefined ? undefined : Number(height);
  }

  it.each(sheets)('matches %s widths, heights, and reserved rows', (type, sourcePath) => {
    const xml = strFromU8(source[sourcePath]!);
    const defaultHeight = Number(/defaultRowHeight="([\d.]+)"/.exec(xml)![1]);

    expect(SHEET_GEOMETRY[type].columnWidths).toEqual([...widths(xml), 14]);
    expect(SHEET_GEOMETRY[type].rowHeights).toEqual({
      title: rowHeight(xml, 1),
      header: rowHeight(xml, 2),
      body: rowHeight(xml, 3) ?? defaultHeight,
    });
    expect(SHEET_GEOMETRY[type].reservedRows).toBe([...xml.matchAll(/<row r="\d+"/g)].length - 2);
  });
});

/**
 * Byte-level parity with the office's file: the template is the same workbook
 * the office hands out, so every cell, column width, print setting, letterhead
 * drawing, and signature block has to match. Only relationship ids differ.
 */
describe('monitoring template matches the office workbook', () => {
  const source = unzipSync(readFileSync(SOURCE));
  const template = unzipSync(buildMonitoringTemplate({ createdAt: '2026-03-21T00:00:00.000Z' }));

  const sheets: [ReportType, string][] = [
    ['OFF_CAMPUS', 'xl/worksheets/sheet2.xml'],
    ['EDUCATIONAL_TOUR', 'xl/worksheets/sheet3.xml'],
    ['IN_CAMPUS', 'xl/worksheets/sheet4.xml'],
  ];

  it.each(sheets)('matches the %s worksheet', (type, sourcePath) => {
    const index = Object.keys(SHEET_LAYOUTS).indexOf(type);

    expect(normalize(withoutRequestedColumn(text(template, `xl/worksheets/sheet${index + 1}.xml`)))).toBe(
      normalize(text(source, sourcePath)),
    );
  });

  it.each(sheets)('matches the %s signature drawing', (type) => {
    const index = Object.keys(SHEET_LAYOUTS).indexOf(type) + 1;

    expect(normalize(text(template, `xl/drawings/drawing${index}.xml`))).toBe(
      normalize(text(source, `xl/drawings/drawing${index}.xml`)),
    );
  });

  it('matches the letterhead drawings and the source media', () => {
    const media = [
      ['xl/drawings/vmlDrawing1.vml', 'xl/drawings/vmlDrawing1.vml'],
      ['xl/drawings/vmlDrawing2.vml', 'xl/drawings/vmlDrawing2.vml'],
      ['xl/drawings/vmlDrawing3.vml', 'xl/drawings/vmlDrawing3.vml'],
    ] as const;

    for (const [ours, theirs] of media) {
      expect(normalize(text(template, ours))).toBe(normalize(text(source, theirs)));
    }

    for (const path of ['xl/media/image1.jpeg', 'xl/media/image2.png']) {
      expect(sameBytes(template[path], source[path])).toBe(true);
    }
  });

  it('matches the source style sheet and theme', () => {
    expect(normalize(text(template, 'xl/styles.xml'))).toBe(
      normalize(text(source, 'xl/styles.xml')),
    );
    expect(normalize(text(template, 'xl/theme/theme1.xml'))).toBe(
      normalize(text(source, 'xl/theme/theme1.xml')),
    );
  });
});
