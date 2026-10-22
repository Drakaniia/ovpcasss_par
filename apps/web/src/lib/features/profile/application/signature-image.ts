import type { SignatureUploadInput } from '@par/shared';
import { SIGNATURE_IMAGE_TYPES, SIGNATURE_MAX_BYTES } from '@par/shared';

import {
  estimateBackground,
  inkBounds,
  isRemovableBackground,
  padBounds,
  removeBackground,
} from './signature-background';

/**
 * Signature image rules (UI spec §7.14, signature spec §4.5.1): PNG or JPEG,
 * under the server's limit, sent as a data URL because that is what both the
 * canvas and the file input produce. An uploaded photo is reduced to ink on
 * transparent paper here, in the browser, before the API ever sees it — so the
 * facsimile, the print dialog, and the acknowledgement all get transparency
 * from one place. Drawn signatures already are transparent and skip this.
 */
export const SIGNATURE_ACCEPT = SIGNATURE_IMAGE_TYPES.join(',');

export const SIGNATURE_LIMIT_LABEL = `${Math.round(SIGNATURE_MAX_BYTES / 1_000_000)} MB`;

/** Long edge of the processed image; crisp at the printed slot size. */
const MAX_EDGE = 1200;
/** One retry at a smaller size when the PNG exceeds the server limit. */
const RETRY_EDGE = 800;

export function isAllowedSignatureType(type: string): boolean {
  return (SIGNATURE_IMAGE_TYPES as readonly string[]).includes(type);
}

/** Decoded byte length of a base64 data URL; the padding is not payload. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

/** Whether the paper was removed; the card says which happened. */
export type SignatureBackground = 'removed' | 'kept';

export type SignatureReadResult =
  | {
      ok: true;
      image: SignatureUploadInput;
      background: SignatureBackground;
      /** The untouched upload, for the card's "Use original" action. */
      original: SignatureUploadInput;
    }
  | { ok: false; error: string };

type Drawable = ImageBitmap | HTMLImageElement;

const BLANK_ERROR = 'That image looks blank. Try another photo or draw the signature.';

export async function readSignatureFile(file: File): Promise<SignatureReadResult> {
  if (!isAllowedSignatureType(file.type)) {
    return { ok: false, error: 'Use a PNG or JPEG image.' };
  }

  if (file.size > SIGNATURE_MAX_BYTES) {
    return { ok: false, error: `Use an image under ${SIGNATURE_LIMIT_LABEL}.` };
  }

  let source: Drawable;
  try {
    source = await decode(file);
  } catch {
    return { ok: false, error: 'The file could not be read. Try again.' };
  }

  try {
    let result = await processImage(source, MAX_EDGE);
    if (result === 'blank') return { ok: false, error: BLANK_ERROR };

    if (dataUrlBytes(result.dataUrl) > SIGNATURE_MAX_BYTES) {
      result = await processImage(source, RETRY_EDGE);
      if (result === 'blank') return { ok: false, error: BLANK_ERROR };
    }

    if (dataUrlBytes(result.dataUrl) > SIGNATURE_MAX_BYTES) {
      return { ok: false, error: `Use an image under ${SIGNATURE_LIMIT_LABEL}.` };
    }

    const original = await readDataUrl(file);
    if (!original) return { ok: false, error: 'The file could not be read. Try again.' };

    return {
      ok: true,
      image: { image: result.dataUrl },
      background: result.background,
      original: { image: original },
    };
  } catch {
    return { ok: false, error: 'The image could not be processed. Try another file.' };
  } finally {
    if ('close' in source) source.close();
  }
}

/** Honours the photo's orientation, so a portrait scan is not printed sideways. */
async function decode(file: File): Promise<Drawable> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, { imageOrientation: 'from-image' });
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

type Processed = { dataUrl: string; background: SignatureBackground } | 'blank';

/**
 * Draw at most `maxEdge` on the long edge, then either keep the image as it is
 * (not ink on light paper) or clear the paper, trim the margins, and encode PNG.
 * JPEG is never produced: it has no alpha channel.
 */
async function processImage(source: Drawable, maxEdge: number): Promise<Processed> {
  const naturalWidth = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const naturalHeight = 'naturalHeight' in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, maxEdge / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('The canvas is unavailable');

  context.drawImage(source, 0, 0, width, height);

  const estimate = estimateBackground(
    context.getImageData(0, 0, width, height).data,
    width,
    height,
  );
  if (!isRemovableBackground(estimate)) {
    return { dataUrl: canvas.toDataURL('image/png'), background: 'kept' };
  }

  const image = context.getImageData(0, 0, width, height);
  removeBackground(image.data, estimate);
  context.putImageData(image, 0, 0);

  const ink = inkBounds(image.data, width, height);
  if (!ink) return 'blank';

  const crop = padBounds(ink, width, height);
  const output = document.createElement('canvas');
  output.width = crop.width;
  output.height = crop.height;

  const outputContext = output.getContext('2d');
  if (!outputContext) throw new Error('The canvas is unavailable');
  outputContext.drawImage(
    canvas,
    crop.left,
    crop.top,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  return { dataUrl: output.toDataURL('image/png'), background: 'removed' };
}

function readDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () =>
      resolve(typeof reader.result === 'string' && reader.result ? reader.result : null);
    reader.readAsDataURL(file);
  });
}
