import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ApiError } from '$lib/api/http';

import { RecordFormState } from './record-state.svelte';

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));

vi.mock('$lib/api/client', () => ({
  api: { reports: { create: mocks.create, update: mocks.update } },
}));

/**
 * The PIC list (step 3): the total is read from the rows, adding a second
 * person works, and a refused save lands on the row that was refused.
 */
function readyState(): RecordFormState {
  const state = new RecordFormState({ mode: 'create' });

  state.patchForm({
    type: 'OFF_CAMPUS',
    classification: 'CURRICULAR',
    campusId: 'c1',
    level: 'UNDERGRADUATE',
  });
  // A campus change drops the unit, so the college is chosen after the campus.
  state.patchForm({
    unitId: 'u1',
    title: 'Coastal cleanup',
    startDate: '2026-03-12',
    startText: '12 Mar 2026',
    endDate: '2026-03-13',
    endText: '13 Mar 2026',
    locations: ['Brgy. Poblacion'],
    activityCount: '2',
    totalStudents: '42',
    sdgIds: ['s1'],
  });
  state.addPic();

  const [first, second] = state.form.pics;
  if (!first || !second) throw new Error('the form opens with one row and adds a second');

  state.patchPic(first.id, { name: 'A. Cruz', email: 'a@univ.edu' });
  state.patchPic(second.id, { name: 'B. Reyes', email: 'b@univ.edu' });

  return state;
}

beforeEach(() => {
  mocks.create.mockReset();
  mocks.update.mockReset();
  // The wizard focuses the first offending control; there is no DOM here.
  vi.stubGlobal('document', { getElementById: () => null });
});

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

describe('RecordFormState with more than one person in charge', () => {
  it('sends every filled row', async () => {
    mocks.create.mockResolvedValue({
      id: 'r1',
      version: 0,
      status: 'PENDING',
      referenceNo: 'AR No. 0001',
      sentTo: 2,
    });

    const state = readyState();
    expect(await state.save()).toBe(true);

    expect(mocks.create).toHaveBeenCalledTimes(1);
    const [input] = mocks.create.mock.calls[0] ?? [];
    expect(input.pics).toEqual([
      { name: 'A. Cruz', email: 'a@univ.edu' },
      { name: 'B. Reyes', email: 'b@univ.edu' },
    ]);
    expect(input.totalPic).toBe(2);
  });

  it('refuses a repeated address before the request and names both rows', async () => {
    const state = readyState();
    const second = state.form.pics[1];
    if (!second) throw new Error('two rows exist');

    state.patchPic(second.id, { email: 'A@univ.edu' });

    expect(await state.save()).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(state.step).toBe(3);
    expect(state.errors[`pic.${second.id}.email`]).toBe(
      'This email is already used by another person in charge.',
    );
  });

  it('clears the other row once the addresses differ again', async () => {
    const state = readyState();
    const [first, second] = state.form.pics;
    if (!first || !second) throw new Error('two rows exist');

    state.patchPic(second.id, { email: 'a@univ.edu' });
    await state.save();
    expect(state.errors[`pic.${second.id}.email`]).toBeTruthy();

    state.patchPic(first.id, { email: 'c@univ.edu' });

    expect(state.errors[`pic.${second.id}.email`]).toBeUndefined();
    expect(state.errors[`pic.${first.id}.email`]).toBeUndefined();
  });

  it('shows the field the API refused instead of a banner', async () => {
    mocks.create.mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Check the highlighted fields', 'req-1', [
        { field: 'activityStartDate', message: 'Enter a valid start date.', step: 2 },
      ]),
    );

    const state = readyState();
    expect(await state.save()).toBe(false);

    expect(state.step).toBe(2);
    expect(state.errors.startDate).toBe('Enter a valid start date.');
    expect(state.saveError).toBeNull();
  });

  it('keeps the banner when the API sends no field to point at', async () => {
    mocks.create.mockRejectedValue(
      new ApiError(409, 'REPORT_CHANGED', 'This record changed on the server. Reload it.'),
    );

    const state = readyState();
    expect(await state.save()).toBe(false);

    expect(state.saveError?.message).toBe('This record changed on the server. Reload it.');
  });
});
