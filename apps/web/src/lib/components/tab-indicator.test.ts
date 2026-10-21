import { describe, expect, it } from 'vitest';

import { indicatorBox } from './TabIndicator.svelte';

describe('indicatorBox', () => {
  it('sits the underline on the bottom border of the active tab', () => {
    expect(
      indicatorBox({ offsetLeft: 24, offsetTop: 8, offsetWidth: 60, offsetHeight: 32 }, 2),
    ).toEqual({ x: 24, y: 38, width: 60 });
  });
});
