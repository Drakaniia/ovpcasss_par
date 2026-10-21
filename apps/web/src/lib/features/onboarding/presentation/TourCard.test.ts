import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import type { ResolvedStep } from '../application/tour-steps';
import TourCard from './TourCard.svelte';

function step(overrides: Partial<ResolvedStep> = {}): ResolvedStep {
  return {
    id: 'primary-nav',
    anchor: 'primary-nav',
    placement: 'bottom',
    title: 'Primary navigation',
    description: 'Home shows the work that needs your attention.',
    position: 3,
    total: 7,
    final: false,
    ...overrides,
  };
}

function renderCard(overrides: Partial<ResolvedStep> = {}) {
  return render(TourCard, {
    props: { step: step(overrides), onback: () => {}, onnext: () => {}, onskip: () => {} },
  }).body;
}

describe('TourCard', () => {
  it('shows the step title, copy, counter and a decorative progress bar', () => {
    const html = renderCard();

    expect(html).toContain('Primary navigation');
    expect(html).toContain('Home shows the work that needs your attention.');
    expect(html).toContain('Step 3 of 7');
    expect(html).toContain('tour-title');
    expect(html).toContain('tour-description');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toMatch(/width:\s*42\.8571/);
  });

  it('opens with Get started and Skip tour, and no Back', () => {
    const html = renderCard({ id: 'welcome', anchor: null, position: 1, total: 8, final: false });

    expect(html).toContain('Get started');
    expect(html).toContain('Skip tour');
    expect(html).not.toContain('>Back<');
  });

  it('offers Back, Next and Skip tour in the middle', () => {
    const html = renderCard();

    expect(html).toContain('>Back<');
    expect(html).toContain('>Next<');
    expect(html).toContain('Skip tour');
  });

  it('ends with Start exploring and no Skip tour or Next', () => {
    const html = renderCard({ id: 'finish', anchor: null, position: 7, total: 7, final: true });

    expect(html).toContain('Start exploring');
    expect(html).toContain('>Back<');
    expect(html).not.toContain('Skip tour');
    expect(html).not.toContain('>Next<');
  });

  it('carries exactly one filled primary action per step', () => {
    for (const html of [
      renderCard({ id: 'welcome', anchor: null, position: 1, total: 8 }),
      renderCard(),
      renderCard({ id: 'finish', anchor: null, position: 7, total: 7, final: true }),
    ]) {
      expect((html.match(/btn-primary/g) ?? []).length).toBe(1);
    }
  });
});
