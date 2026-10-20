import type {
  Account,
  AcknowledgementResponse,
  AdminAuditListQuery,
  AdminAuditListResponse,
  AdminUser,
  AdminUserListQuery,
  AdminUserListResponse,
  AttachmentUrlResponse,
  AuditEventDetail,
  AuthConfig,
  ChangePasswordInput,
  ConfirmAttachmentInput,
  ConfirmAttachmentResponse,
  DecisionNoteInput,
  ForgotPasswordInput,
  InboxResponse,
  LoginInput,
  LoginResult,
  MonitoringExportRequest,
  MonitoringImportResponse,
  MonitoringPreviewResponse,
  NotificationListQuery,
  NotificationListResponse,
  NotificationReadAllResponse,
  NotificationReadResponse,
  PresignRequest,
  PresignResponse,
  ReferenceEntityKey,
  ReportDetail,
  ReportDraftForm,
  ReportHead,
  ReportListQuery,
  ReportListResponse,
  ReportPdfResponse,
  ReportValidationResponse,
  RepositoryQuery,
  RepositorySearchResponse,
  QueueListQuery,
  QueueListResponse,
  ReferenceInputMap,
  ReferenceItemMap,
  ReferenceListResponse,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  ReturnReportInput,
  Role,
  SignatureState,
  SignatureUploadInput,
  SignatureUrl,
  SubmitReportResponse,
  UnreadNotificationCount,
  UpdateProfileInput,
  VerifyEmailInput,
} from '@par/shared';

import { apiDownload, apiFetch, apiUpload } from './http';

/** Drops empty filters so the URL only carries what the user chose. */
function queryString<T extends object>(query: T): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      params.set(key, value.join(','));
      continue;
    }
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
  /**
   * The signed-in account's own inbox (UI spec §7.13). Never carries a user id:
   * the server reads the recipient from the session.
   */
  notifications: {
    list: (query: NotificationListQuery) => {
      const search = queryString(query);
      return apiFetch<NotificationListResponse>(`/me/notifications${search ? `?${search}` : ''}`);
    },
    unreadCount: () => apiFetch<UnreadNotificationCount>('/me/notifications/unread-count'),
    /** Marks one row read; the response carries the fresh count for the bell. */
    markRead: (id: string) =>
      apiFetch<NotificationReadResponse>(`/me/notifications/${id}/read`, { method: 'POST' }),
    markAllRead: () =>
      apiFetch<NotificationReadAllResponse>('/me/notifications/read-all', { method: 'POST' }),
  },
  reports: {
    /** My reports, already scoped by the server to what the caller may see (§7.4). */
    list: (query: ReportListQuery) => {
      const search = queryString(query);
      return apiFetch<ReportListResponse>(`/reports${search ? `?${search}` : ''}`);
    },
    /** Drafts only; the server removes the draft and its stored copy. */
    deleteDraft: (id: string) => apiFetch<void>(`/reports/${id}`, { method: 'DELETE' }),
    /** Creates the server draft from a partial form on the first upload (spec §7.5). */
    create: (input: ReportDraftForm) =>
      apiFetch<ReportHead>('/reports', { method: 'POST', body: JSON.stringify(input) }),
    /**
     * Persists edits before validate/submit. `version` is sent as `if-match`, so
     * a stale local copy is rejected with 409 instead of overwriting the report.
     */
    update: (id: string, input: ReportDraftForm, version?: number) =>
      apiFetch<ReportHead>(`/reports/${id}`, {
        method: 'PATCH',
        headers: version === undefined ? undefined : { 'if-match': String(version) },
        body: JSON.stringify(input),
      }),
    /** Full report; used by the facsimile and the edit page. */
    get: (id: string) => apiFetch<ReportDetail>(`/reports/${id}`),
    /** Server-rendered facsimile PDF; the server decides the watermark (§7.8). */
    pdf: (id: string) => apiFetch<ReportPdfResponse>(`/reports/${id}/pdf`),
    /** Server-generated acknowledgement for an approved report (phase 08 §6). */
    acknowledgement: (id: string) =>
      apiFetch<AcknowledgementResponse>(`/reports/${id}/acknowledgement`),
    /** Server-owned field list rendered as the linked error summary on step 4. */
    validate: (id: string) =>
      apiFetch<ReportValidationResponse>(`/reports/${id}/validate`, { method: 'POST' }),
    /** Idempotency key makes an outbox retry safe (spec §7.2). */
    submit: (id: string, idempotencyKey: string) =>
      apiFetch<SubmitReportResponse>(`/reports/${id}/submit`, {
        method: 'POST',
        headers: { 'idempotency-key': idempotencyKey },
      }),
    /** `RETURNED_BY_*` → `RESUBMITTED`; the tracking number never changes. */
    resubmit: (id: string, idempotencyKey: string, version?: number) =>
      apiFetch<SubmitReportResponse>(`/reports/${id}/resubmit`, {
        method: 'POST',
        headers: {
          'idempotency-key': idempotencyKey,
          ...(version === undefined ? {} : { 'if-match': String(version) }),
        },
      }),
  },
  /**
   * Runtime dropdowns for the PAR form (spec §7.3). Any authenticated user may
   * read them; only admins write through `api.admin.referenceData`.
   */
  reference: {
    list: <E extends ReferenceEntityKey>(entity: E) =>
      apiFetch<ReferenceListResponse<ReferenceItemMap[E]>>(`/ref/${entity}`),
  },
  attachments: {
    /** Presigned direct-to-R2 upload; the file itself never passes through the API. */
    presign: (reportId: string, input: PresignRequest) =>
      apiFetch<PresignResponse>(`/reports/${reportId}/attachments/presign`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    confirm: (reportId: string, attachmentId: string, input: ConfirmAttachmentInput = {}) =>
      apiFetch<ConfirmAttachmentResponse>(
        `/reports/${reportId}/attachments/${attachmentId}/confirm`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    /** Short-lived signed URL; the raw object key is never exposed. */
    url: (reportId: string, attachmentId: string) =>
      apiFetch<AttachmentUrlResponse>(`/reports/${reportId}/attachments/${attachmentId}/url`),
    remove: (reportId: string, attachmentId: string) =>
      apiFetch<void>(`/reports/${reportId}/attachments/${attachmentId}`, { method: 'DELETE' }),
  },
  profile: {
    get: () => apiFetch<Account>('/me'),
    update: (input: UpdateProfileInput) =>
      apiFetch<Account>('/me', { method: 'PATCH', body: JSON.stringify(input) }),
    changePassword: (input: ChangePasswordInput) =>
      apiFetch<void>('/me/password', { method: 'POST', body: JSON.stringify(input) }),
    /** Approver signature image; the returned state is what the approval gate reads. */
    saveSignature: (input: SignatureUploadInput) =>
      apiFetch<SignatureState>('/me/signature', { method: 'PUT', body: JSON.stringify(input) }),
    removeSignature: () => apiFetch<SignatureState>('/me/signature', { method: 'DELETE' }),
    /** Short-lived preview URL; the stored object key never reaches the page. */
    signatureUrl: () => apiFetch<SignatureUrl>('/me/signature/url'),
  },
  /**
   * Repository search (UI spec §7.11). Role-gated server-side to Reviewer,
   * Approver, and Admin, and scoped to reports the caller may see.
   */
  search: {
    repository: (query: RepositoryQuery) => {
      const search = queryString(query);
      return apiFetch<RepositorySearchResponse>(`/search${search ? `?${search}` : ''}`);
    },
  },
  /** The two decision queues (UI spec §7.9). Role-gated server-side. */
  queues: {
    review: (query: QueueListQuery) => {
      const search = queryString(query);
      return apiFetch<QueueListResponse>(`/review/queue${search ? `?${search}` : ''}`);
    },
    approval: (query: QueueListQuery) => {
      const search = queryString(query);
      return apiFetch<QueueListResponse>(`/approval/queue${search ? `?${search}` : ''}`);
    },
  },
  /**
   * Decisions (project spec §7.3). Each returns the report as it now stands, so
   * the UI updates the badge, the stepper, and the history from the response
   * instead of assuming the transition.
   */
  decisions: {
    endorse: (id: string, input: DecisionNoteInput) =>
      apiFetch<ReportDetail>(`/reports/${id}/endorse`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    approve: (id: string, input: DecisionNoteInput) =>
      apiFetch<ReportDetail>(`/reports/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    return: (id: string, input: ReturnReportInput) =>
      apiFetch<ReportDetail>(`/reports/${id}/return`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    returnForRevision: (id: string, input: ReturnReportInput) =>
      apiFetch<ReportDetail>(`/reports/${id}/return-for-revision`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
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
    referenceData: {
      list: <E extends ReferenceEntityKey>(entity: E) =>
        apiFetch<ReferenceListResponse<ReferenceItemMap[E]>>(`/ref/${entity}`),
      get: <E extends ReferenceEntityKey>(entity: E, id: string) =>
        apiFetch<ReferenceItemMap[E]>(`/ref/${entity}/${id}`),
      create: <E extends ReferenceEntityKey>(entity: E, input: ReferenceInputMap[E]) =>
        apiFetch<ReferenceItemMap[E]>(`/ref/${entity}`, {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      update: <E extends ReferenceEntityKey>(entity: E, id: string, input: ReferenceInputMap[E]) =>
        apiFetch<ReferenceItemMap[E]>(`/ref/${entity}/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        }),
      /** Soft delete: the entry stays resolvable in existing reports. */
      deactivate: <E extends ReferenceEntityKey>(entity: E, id: string) =>
        apiFetch<ReferenceItemMap[E]>(`/ref/${entity}/${id}`, { method: 'DELETE' }),
      activate: <E extends ReferenceEntityKey>(entity: E, id: string) =>
        apiFetch<ReferenceItemMap[E]>(`/ref/${entity}/${id}/activate`, { method: 'POST' }),
    },
    audit: {
      list: (query: AdminAuditListQuery = { page: 1, limit: 50 }) => {
        const search = queryString(query);
        return apiFetch<AdminAuditListResponse>(`/audit${search ? `?${search}` : ''}`);
      },
      get: (id: string) => apiFetch<AuditEventDetail>(`/audit/${id}`),
    },
  },
  exports: {
    preview: (query: MonitoringExportRequest) => {
      const params = new URLSearchParams({
        type: query.type,
        schoolYear: query.schoolYear,
        semester: String(query.semester),
        includeInProgress: String(query.includeInProgress),
      });
      return apiFetch<MonitoringPreviewResponse>(`/exports/monitoring/preview?${params}`);
    },
    monitoring: (input: MonitoringExportRequest) =>
      apiDownload('/exports/monitoring', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
    template: () => apiDownload('/exports/monitoring/template'),
  },
  /** Admin-only migration path for an existing monitoring workbook. */
  imports: {
    monitoring: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return apiUpload<MonitoringImportResponse>('/imports/monitoring', form);
    },
  },
};
