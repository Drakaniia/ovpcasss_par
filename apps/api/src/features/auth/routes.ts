import { Hono, type Context } from 'hono';
import type { ZodError } from 'zod';

import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@par/shared';

import type { AppEnv } from '../../env';
import { requireSession } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rate-limit';
import { authConfig } from './application/config';
import { completeGoogleSignIn, startGoogleSignIn } from './application/google';
import { login } from './application/login';
import { logout } from './application/logout';
import { requestPasswordReset, resetPassword } from './application/password-reset';
import { register } from './application/register';
import { resendVerification } from './application/resend-verification';
import { verifyEmail } from './application/verify-email';

/**
 * Public auth endpoints (spec §7.3, §7.4): register, verify, sign in/out, and
 * password reset. Validated at the edge; the application layer owns the work.
 */
export const authRoutes = new Hono<AppEnv>();

authRoutes.use('*', requireSession);

async function readJson(c: Context<AppEnv>): Promise<unknown> {
  return c.req.json().catch(() => null);
}

function invalid(c: Context<AppEnv>, message: string, error: ZodError) {
  return c.json({ error: { code: 'VALIDATION_ERROR', message, details: error.issues } }, 400);
}

function reject(c: Context<AppEnv>, code: string, message: string, status: 400 | 401 | 403) {
  return c.json({ error: { code, message } }, status);
}

function rateLimited(c: Context<AppEnv>, retryAfterSeconds: number) {
  c.header('retry-after', String(retryAfterSeconds));
  return c.json(
    { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again shortly.' } },
    429,
  );
}

authRoutes.get('/config', (c) => c.json(authConfig(c.env)));

/** Google sign-in is a browser navigation, so failures return to the login page. */
authRoutes.get('/google', (c) => startGoogleSignIn(c));

authRoutes.get('/google/callback', async (c) => {
  try {
    const outcome = await completeGoogleSignIn(c);
    return c.redirect(outcome.path);
  } catch {
    return c.redirect('/login?error=google_failed');
  }
});

authRoutes.post('/register', rateLimit({ limit: 10, windowSeconds: 900 }), async (c) => {
  const parsed = registerSchema.safeParse(await readJson(c));
  if (!parsed.success) return invalid(c, 'Check your details and try again.', parsed.error);

  const outcome = await register(c, parsed.data);
  if (!outcome.ok) {
    return reject(c, 'VALIDATION_ERROR', 'Register with a university email address.', 400);
  }

  return c.body(null, 204);
});

authRoutes.post('/verify-email', async (c) => {
  const parsed = verifyEmailSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return invalid(c, 'This verification link is invalid or has expired.', parsed.error);
  }

  const outcome = await verifyEmail(c, parsed.data.token);
  if (!outcome.ok) {
    return reject(c, 'VALIDATION_ERROR', 'This verification link is invalid or has expired.', 400);
  }

  return c.body(null, 204);
});

authRoutes.post('/resend-verification', rateLimit({ limit: 5, windowSeconds: 900 }), async (c) => {
  const parsed = resendVerificationSchema.safeParse(await readJson(c));
  if (!parsed.success) return invalid(c, 'Enter a valid email address.', parsed.error);

  const outcome = await resendVerification(c, parsed.data.email);
  if (!outcome.ok) return rateLimited(c, outcome.retryAfterSeconds);

  return c.body(null, 204);
});

authRoutes.post('/login', rateLimit({ limit: 20, windowSeconds: 900 }), async (c) => {
  const parsed = loginSchema.safeParse(await readJson(c));
  if (!parsed.success) return invalid(c, 'Enter your email and password.', parsed.error);

  /** Only the desktop shell asks for the token; the browser keeps the cookie. */
  const desktop = c.req.header('x-par-client')?.toLowerCase() === 'desktop';
  const outcome = await login(c, parsed.data, { cookie: !desktop });
  if (outcome.ok) {
    return c.json(
      desktop ? { account: outcome.account, token: outcome.token } : { account: outcome.account },
    );
  }

  switch (outcome.code) {
    case 'RATE_LIMITED':
      return rateLimited(c, outcome.retryAfterSeconds);
    case 'ACCOUNT_DISABLED':
      return reject(
        c,
        'ACCOUNT_DISABLED',
        'This account is disabled. Contact the OVPCASSS administrator.',
        403,
      );
    case 'EMAIL_NOT_VERIFIED':
      return reject(c, 'EMAIL_NOT_VERIFIED', 'Verify your email address before signing in.', 403);
    case 'INVALID_CREDENTIALS':
      return reject(c, 'INVALID_CREDENTIALS', 'Email or password is incorrect.', 401);
  }
});

authRoutes.post('/logout', async (c) => {
  await logout(c);
  return c.body(null, 204);
});

authRoutes.post('/forgot-password', rateLimit({ limit: 5, windowSeconds: 900 }), async (c) => {
  const parsed = forgotPasswordSchema.safeParse(await readJson(c));
  if (!parsed.success) return invalid(c, 'Enter a valid email address.', parsed.error);

  const outcome = await requestPasswordReset(c, parsed.data.email);
  if (!outcome.ok) return rateLimited(c, outcome.retryAfterSeconds);

  return c.body(null, 204);
});

authRoutes.post('/reset-password', rateLimit({ limit: 10, windowSeconds: 900 }), async (c) => {
  const parsed = resetPasswordSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return invalid(c, 'Choose a password with at least 12 characters.', parsed.error);
  }

  const outcome = await resetPassword(c, parsed.data.token, parsed.data.password);
  if (!outcome.ok) {
    return reject(c, 'TOKEN_INVALID', 'This reset link is invalid or has expired.', 400);
  }

  return c.body(null, 204);
});
