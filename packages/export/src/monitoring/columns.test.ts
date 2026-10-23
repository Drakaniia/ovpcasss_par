import { REPORT_TYPES } from '@par/shared';
import { describe, expect, it } from 'vitest';

import { MONITORING_COLUMNS, MONITORING_SHEET_TITLES } from './columns';

/**
 * The workbook is built from these declarations, so a duplicate key would
 * silently drop a column and a missing sheet would drop a whole report type.
 */
describe('monitoring workbook shape', () => {
  it('gives every column a unique key', () => {
    const keys = MONITORING_COLUMNS.map((column) => column.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('starts with the sheet number column', () => {
    expect(MONITORING_COLUMNS[0]).toEqual({ key: 'index', label: 'No.' });
  });

  it('heads the receipt number and appends Date Requested last', () => {
    expect(MONITORING_COLUMNS).toHaveLength(19);
    expect(MONITORING_COLUMNS[2]).toEqual({ key: 'referenceNo', label: 'Receipt No. / AR No.' });
    expect(MONITORING_COLUMNS[18]).toEqual({ key: 'dateRequested', label: 'Date Requested' });
  });

  it('has a sheet title for every report type', () => {
    expect(Object.keys(MONITORING_SHEET_TITLES).sort()).toEqual([...REPORT_TYPES].sort());
  });
});
