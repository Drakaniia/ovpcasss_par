import { reportApprovalSignatureKey, reportSignatureKey } from '../../../lib/signature-image';

/** One stored signature image. */
export interface SignatureImage {
  bytes: Uint8Array;
  contentType: string;
}

/** The byte store the signatures live in; the port the routes write through. */
export interface SignatureStorage {
  read(key: string): Promise<SignatureImage | null>;
  write(key: string, image: SignatureImage): Promise<void>;
}

/** The columns a snapshotted signature writes (bug phase 05 §3.1). */
export interface NarrativeSignatureSnapshot {
  narrativeSignatureKey: string;
  narrativeSignedAt: string;
}

export interface ApprovalSignatureSnapshot {
  approvalSignatureKey: string;
  approvalSignedAt: string;
}

/** The bucket, behind the port the snapshots are written through. */
export function r2SignatureStorage(bucket: R2Bucket): SignatureStorage {
  return {
    async read(key: string): Promise<SignatureImage | null> {
      const object = await bucket.get(key);
      if (!object) return null;

      return {
        bytes: new Uint8Array(await object.arrayBuffer()),
        contentType: object.httpMetadata?.contentType ?? 'image/png',
      };
    },
    async write(key: string, image: SignatureImage): Promise<void> {
      await bucket.put(key, image.bytes, {
        httpMetadata: { contentType: image.contentType },
      });
    },
  };
}

/**
 * Copies the account's saved signature onto the record at the moment it is
 * submitted (bug phase 05 §3.1). A record that already carries its own image
 * keeps it, a deliberate removal survives the submit, and a missing object
 * leaves the record unsigned.
 */
export async function snapshotSubmittedSignature(input: {
  reportId: string;
  reportSignatureKey: string | null;
  signatureCleared: boolean;
  profileSignatureKey: string | null;
  signedAt: string;
  storage: SignatureStorage;
}): Promise<NarrativeSignatureSnapshot | null> {
  if (input.reportSignatureKey || input.signatureCleared || !input.profileSignatureKey) {
    return null;
  }

  const key = reportSignatureKey(input.reportId);
  if (!(await copySignature(input.storage, input.profileSignatureKey, key))) return null;

  return { narrativeSignatureKey: key, narrativeSignedAt: input.signedAt };
}

/**
 * The approving officer's own copy, taken at approval (bug phase 05 §4). The
 * record then prints the image it was approved with, whatever the profile
 * holds afterwards.
 */
export async function snapshotApprovalSignature(input: {
  reportId: string;
  profileSignatureKey: string | null;
  signedAt: string;
  storage: SignatureStorage;
}): Promise<ApprovalSignatureSnapshot | null> {
  if (!input.profileSignatureKey) return null;

  const key = reportApprovalSignatureKey(input.reportId);
  if (!(await copySignature(input.storage, input.profileSignatureKey, key))) return null;

  return { approvalSignatureKey: key, approvalSignedAt: input.signedAt };
}

/** A missing or unreadable object leaves the record unsigned; it never fails. */
async function copySignature(
  storage: SignatureStorage,
  fromKey: string,
  toKey: string,
): Promise<boolean> {
  try {
    const image = await storage.read(fromKey);
    if (!image) return false;

    await storage.write(toKey, image);
    return true;
  } catch {
    return false;
  }
}
