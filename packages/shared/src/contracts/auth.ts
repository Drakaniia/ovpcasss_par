import { z } from 'zod';

import { ROLES, USER_STATUSES } from '../domain/enums';

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
});
export type AuthConfig = z.infer<typeof authConfigSchema>;

export const roleSchema = z.enum(ROLES);
export type RoleInput = z.infer<typeof roleSchema>;

export const accountSchema = z.object({
  id: z.string().min(1),
  email: emailSchema,
  fullName: z.string().min(1),
  role: roleSchema.nullable(),
  status: z.enum(USER_STATUSES),
  campusUnit: z.string().nullable().optional(),
  contactNumber: z.string().nullable().optional(),
  unreadNotifications: z.number().int().min(0).optional(),
});
export type Account = z.infer<typeof accountSchema>;

export const loginResultSchema = z.object({ account: accountSchema });
export type LoginResult = z.infer<typeof loginResultSchema>;
