import { describe, expect, it } from 'vitest';

import { RecordFormState } from './record-state.svelte';

/**
 * The PIC total is read from the rows, not typed (step 3): adding a person in
 * charge increments it and removing one decrements it.
 */
describe('RecordFormState PIC count', () => {
  it('starts at the single row the form opens with', () => {
    expect(new RecordFormState({ mode: 'create' }).form.totalPic).toBe('1');
  });

  it('increments on add and decrements on remove', () => {
    const state = new RecordFormState({ mode: 'create' });

    state.addPic();
    state.addPic();
    expect(state.form.pics).toHaveLength(3);
    expect(state.form.totalPic).toBe('3');

    const first = state.form.pics[0];
    if (!first) throw new Error('the form opens with one row');
    state.removePic(first.id);

    expect(state.form.totalPic).toBe('2');
    expect(state.form.totalPic).toBe(String(state.form.pics.length));
  });
});
