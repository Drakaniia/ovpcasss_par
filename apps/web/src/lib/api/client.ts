import type {
  Account,
  AdminUser,
  AdminUserListQuery,
  AdminUserListResponse,
  AuthConfig,
  ChangePasswordInput,
  ForgotPasswordInput,
  InboxResponse,
  LoginInput,
  LoginResult,
  MonitoringExportRequest,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  Role,
  UpdateProfileInput,
  VerifyEmailInput,
} from '@par/shared';

import { apiFetch } from './http';

/** Drops empty filters so the URL only carries what the admin chose. */
function queryString(query: AdminUserListQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') continue;
    params.set(key, String(value));
  }

  return params.toString();
}

/**
 * Single typed entry point to the API (spec §5). Extended per milestone.
 * Auth and profile shapes are the client half of the M1 contract; the Worker
 * implementations land with the identity milestone.
 */
export const api = {
  auth: {
    register: (input: RegisterInput) =>
      apiFetch<void>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),
    verifyEmail: (input: VerifyEmailInput) =>
      apiFetch<void>('/auth/verify-email', { method: 'POST', body: JSON.stringify(input) }),
    resendVerification: (input: ResendVerificationInput) =>
      apiFetch<void>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    login: (input: LoginInput) =>
      apiFetch<LoginResult>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
    logout: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
    forgotPassword: (input: ForgotPasswordInput) =>
      apiFetch<void>('/auth/forgot-password', { method: 'POST', body: JSON.stringify(input) }),
    resetPassword: (input: ResetPasswordInput) =>
      apiFetch<void>('/auth/reset-password', { method: 'POST', body: JSON.stringify(input) }),
    config: () => apiFetch<AuthConfig>('/auth/config'),
  },
  inbox: {
    get: () => apiFetch<InboxResponse>('/me/inbox'),
  },
  profile: {
    get: () => apiFetch<Account>('/me'),
    update: (input: UpdateProfileInput) =>
      apiFetch<Account>('/me', { method: 'PATCH', body: JSON.stringify(input) }),
    changePassword: (input: ChangePasswordInput) =>
      apiFetch<void>('/me/password', { method: 'POST', body: JSON.stringify(input) }),
  },
  admin: {
    users: {
      list: (query: AdminUserListQuery = {}) => {
        const search = queryString(query);
        return apiFetch<AdminUserListResponse>(`/users${search ? `?${search}` : ''}`);
      },
      /** Reads the server's current state when a concurrent change wins (§4). */
      get: (id: string) => apiFetch<AdminUser>(`/users/${id}`),
      assignRole: (id: string, role: Role) =>
        apiFetch<AdminUser>(`/users/${id}/role`, {
          method: 'PATCH',
          body: JSON.stringify({ role }),
        }),
      activate: (id: string) => apiFetch<AdminUser>(`/users/${id}/approve`, { method: 'POST' }),
      disable: (id: string) => apiFetch<AdminUser>(`/users/${id}/disable`, { method: 'POST' }),
    },
  },
  exports: {
    monitoring: (input: MonitoringExportRequest) =>
      apiFetch<ArrayBuffer>('/exports/monitoring', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  },
};
