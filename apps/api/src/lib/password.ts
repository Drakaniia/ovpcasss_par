import { encodeUtf8, fromBase64, toBase64 } from './encoding';

/**
 * Password hashing for the Worker (spec §7.4). Workers cap WebCrypto PBKDF2 at
 * 100,000 iterations, so that is the platform maximum used here. The algorithm
 * and work factor travel with each hash in `hash_params`, so the policy can be
 * raised on a future sign-in without locking anyone out: verification reads the
 * parameters stored on the row, not the constants below.
 */
const ALGORITHM = 'PBKDF2-SHA256';
const ITERATIONS = 100_000;
const KEY_BITS = 256;
const SALT_BYTES = 16;

export interface PasswordHash {
  hash: string;
  params: string;
}

interface HashParams {
  algorithm: string;
  iterations: number;
  salt: string;
  keyBits: number;
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number,
  keyBits: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encodeUtf8(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    keyBits,
  );

  return new Uint8Array(bits);
}

/** Constant-time comparison so a near-miss hash cannot be timed. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a[index]! ^ b[index]!;
  return diff === 0;
}

export async function hashPassword(password: string): Promise<PasswordHash> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await derive(password, salt, ITERATIONS, KEY_BITS);
  const params: HashParams = {
    algorithm: ALGORITHM,
    iterations: ITERATIONS,
    salt: toBase64(salt),
    keyBits: KEY_BITS,
  };

  return { hash: toBase64(derived), params: JSON.stringify(params) };
}

export async function verifyPassword(
  password: string,
  hash: string,
  params: string,
): Promise<boolean> {
  let parsed: HashParams;
  try {
    parsed = JSON.parse(params) as HashParams;
  } catch {
    return false;
  }

  if (parsed.algorithm !== ALGORITHM) return false;

  const derived = await derive(
    password,
    fromBase64(parsed.salt),
    parsed.iterations,
    parsed.keyBits,
  );
  return timingSafeEqual(derived, fromBase64(hash));
}
