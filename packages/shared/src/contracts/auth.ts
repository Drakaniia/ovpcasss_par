import { z } from 'zod';

import { ROLES, USER_STATUSES } from '../domain/enums';
import { isoDateTimeSchema } from './common';

/** Password policy (project spec §7.4); reset and change share it with register. */
export const PASSWORD_MIN_LENGTH = 12;

export const emailSchema = z.email('Enter a valid email address.').max(254);
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(128, 'Use 128 characters or fewer.');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(1, 'Enter your full name.').max(200),
  /**
   * Free-text campus/unit captured at registration in M1, before admin-managed
   * reference data exists (M2). The API resolves it to campus_id/unit_id when a
   * role is assigned.
   */
  campusUnit: z.string().trim().min(1).max(200).optional(),
  campusId: z.string().min(1).optional(),
  unitId: z.string().min(1).optional(),
  contactNumber: z.string().trim().max(40, 'Use 40 characters or fewer.').optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

/** Derived: the verify-email page needs a resend path (UI spec §7.2). */
export const resendVerificationSchema = z.object({ email: emailSchema });
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Derived: profile account edit (UI spec §7.14); email and role are immutable here. */
export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter your full name.').max(200),
  campusUnit: z.string().trim().max(200, 'Use 200 characters or fewer.').optional(),
  contactNumber: z.string().trim().max(40, 'Use 40 characters or fewer.').optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** Derived: registration hint needs the configured domains (UI spec §7.2). */
export const authConfigSchema = z.object({
  allowedEmailDomains: z.array(z.string().min(1)),
  /** True when the server has a Google OAuth client; the login button follows it. */
  googleEnabled: z.boolean(),
});
export type AuthConfig = z.infer<typeof authConfigSchema>;

export const roleSchema = z.enum(ROLES);
export type RoleInput = z.infer<typeof roleSchema>;

/** Approver signature (project spec §7.3 `PUT /me/signature`, UI spec §7.14). */
export const SIGNATURE_IMAGE_TYPES = ['image/png', 'image/jpeg'] as const;
export const SIGNATURE_MAX_BYTES = 2_000_000;

/** The image travels as a data URL: the canvas and the file input both produce one. */
export const signatureUploadSchema = z.object({
  image: z.string().min(1, 'Provide a signature image.'),
});
export type SignatureUploadInput = z.infer<typeof signatureUploadSchema>;

/** `hasSignature` is what the approval gate reads; the object key never leaves the API. */
export const signatureStateSchema = z.object({
  hasSignature: z.boolean(),
  updatedAt: isoDateTimeSchema.optional(),
});
export type SignatureState = z.infer<typeof signatureStateSchema>;

/** Short-lived signed URL for the preview on the profile card. */
export const signatureUrlSchema = z.object({
  url: z.string().min(1),
  expiresAt: isoDateTimeSchema.optional(),
});
export type SignatureUrl = z.infer<typeof signatureUrlSchema>;

export const accountSchema = z.object({
  id: z.string().min(1),
  email: emailSchema,
  fullName: z.string().min(1),
  role: roleSchema.nullable(),
  status: z.enum(USER_STATUSES),
  campusUnit: z.string().nullable().optional(),
  contactNumber: z.string().nullable().optional(),
  /** True once an approver's signature image is on file (approval gate, §7.10). */
  hasSignature: z.boolean().optional(),
  /** False while the account has no password of its own (Google sign-in only). */
  hasPassword: z.boolean().optional(),
  unreadNotifications: z.number().int().min(0).optional(),
});
export type Account = z.infer<typeof accountSchema>;

/**
 * `token` is present only for the desktop shell, which asks for it with the
 * `x-par-client: desktop` header and keeps it in the OS credential store.
 * The browser session stays an HttpOnly cookie, so a web response has no token.
 */
export const loginResultSchema = z.object({
  account: accountSchema,
  token: z.string().min(1).optional(),
});
export type LoginResult = z.infer<typeof loginResultSchema>;
