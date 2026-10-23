import { describe, expect, it, vi } from 'vitest';

import {
  snapshotApprovalSignature,
  snapshotSubmittedSignature,
  type SignatureImage,
  type SignatureStorage,
} from './signature-snapshot';

const AT = '2026-10-22T08:00:00.000Z';
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function storage(images: Record<string, SignatureImage> = {}) {
  const read = vi.fn(async (key: string) => images[key] ?? null);
  const write = vi.fn(async (key: string, image: SignatureImage) => {
    images[key] = image;
  });

  return { storage: { read, write } satisfies SignatureStorage, read, write, images };
}

function submit(
  store: ReturnType<typeof storage>,
  overrides: Partial<Parameters<typeof snapshotSubmittedSignature>[0]> = {},
) {
  return snapshotSubmittedSignature({
    reportId: 'rep_1',
    reportSignatureKey: null,
    signatureCleared: false,
    profileSignatureKey: 'signatures/u1/sig',
    signedAt: AT,
    storage: store.storage,
    ...overrides,
  });
}

describe('the signature snapshot taken at submit', () => {
  it('copies the account image onto the record and names the columns', async () => {
    const store = storage({ 'signatures/u1/sig': { bytes: PNG, contentType: 'image/png' } });

    const snapshot = await submit(store);

    expect(snapshot?.narrativeSignatureKey).toMatch(/^reports\/rep_1\/signature-/);
    expect(snapshot?.narrativeSignedAt).toBe(AT);
    expect(store.write).toHaveBeenCalledTimes(1);
    expect(store.write.mock.calls[0]?.[1].bytes).toEqual(PNG);
  });

  it('keeps the image the record already carries', async () => {
    const store = storage({ 'signatures/u1/sig': { bytes: PNG, contentType: 'image/png' } });

    const snapshot = await submit(store, { reportSignatureKey: 'reports/rep_1/signature-old' });

    expect(snapshot).toBeNull();
    expect(store.write).not.toHaveBeenCalled();
  });

  it('leaves the record unsigned after the signer removed the image', async () => {
    const store = storage({ 'signatures/u1/sig': { bytes: PNG, contentType: 'image/png' } });

    const snapshot = await submit(store, { signatureCleared: true });

    expect(snapshot).toBeNull();
    expect(store.write).not.toHaveBeenCalled();
  });

  it('leaves the record unsigned when the account has no signature on file', async () => {
    const store = storage();

    const snapshot = await submit(store, { profileSignatureKey: null });

    expect(snapshot).toBeNull();
    expect(store.write).not.toHaveBeenCalled();
  });

  it('leaves the record unsigned when the stored object is gone', async () => {
    const store = storage();

    const snapshot = await submit(store);

    expect(snapshot).toBeNull();
    expect(store.write).not.toHaveBeenCalled();
  });
});

describe('the signature snapshot taken at approval', () => {
  it('copies the approving officer image onto the record', async () => {
    const store = storage({ 'signatures/u2/sig': { bytes: PNG, contentType: 'image/png' } });

    const snapshot = await snapshotApprovalSignature({
      reportId: 'rep_1',
      profileSignatureKey: 'signatures/u2/sig',
      signedAt: AT,
      storage: store.storage,
    });

    expect(snapshot?.approvalSignatureKey).toMatch(/^reports\/rep_1\/approval-signature-/);
    expect(snapshot?.approvalSignedAt).toBe(AT);
    expect(store.write).toHaveBeenCalledTimes(1);
  });

  it('leaves the record unsigned when the officer has no signature on file', async () => {
    const store = storage();

    const snapshot = await snapshotApprovalSignature({
      reportId: 'rep_1',
      profileSignatureKey: null,
      signedAt: AT,
      storage: store.storage,
    });

    expect(snapshot).toBeNull();
    expect(store.write).not.toHaveBeenCalled();
  });
});
