import { describe, expect, it } from 'vitest';

import { resolveReceiptSignatory } from './receipt-signatory';

describe('resolveReceiptSignatory', () => {
  it('prefers the stored setting', () => {
    expect(
      resolveReceiptSignatory(
        { name: 'DR. A. B. CRUZ', title: 'Director, OVPCASSS' },
        { name: 'DR. LINCOLN V. TAN', title: 'VPCASSS' },
      ),
    ).toEqual({ name: 'DR. A. B. CRUZ', title: 'Director, OVPCASSS' });
  });

  it('falls back to the Worker variable when nothing is stored', () => {
    expect(resolveReceiptSignatory(null, { name: 'DR. L. V. TAN', title: 'VPCASSS' })).toEqual({
      name: 'DR. L. V. TAN',
      title: 'VPCASSS',
    });
  });

  it('falls back to the office default when a stored row is corrupt', () => {
    expect(resolveReceiptSignatory({ name: '', title: 'VPCASSS' }, {})).toEqual({
      name: 'DR. LINCOLN V. TAN',
      title: 'VPCASSS',
    });
  });

  it('fills a missing half from the default', () => {
    expect(resolveReceiptSignatory(null, { title: 'Director' })).toEqual({
      name: 'DR. LINCOLN V. TAN',
      title: 'Director',
    });
  });
});
