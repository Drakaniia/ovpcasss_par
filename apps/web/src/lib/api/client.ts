import type {
  Account,
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
  EmailLogQuery,
  EmailLogResponse,
  EmailMessageResponse,
  EmailPreferencesInput,
  EmailPreferencesResponse,
  ForgotPasswordInput,
  InboxResponse,
  LoginInput,
  LocationQuery,
  LocationSuggestionsResponse,
  LoginResult,
  MonitoringExportRequest,
  MonitoringPreviewResponse,
  MyReceipt,
  NotificationListQuery,
  NotificationListResponse,
  NotificationReadAllResponse,
  NotificationReadResponse,
  Preferences,
  PreferencesPatch,
  PresignRequest,
  PresignResponse,
  ReferenceEntityKey,
  ReferenceInputMap,
  ReferenceItemMap,
  ReferenceListResponse,
  ReceiptSignatory,
  ReceiptSignatoryResponse,
  RegisterInput,
  ReportDecisionInput,
  ReportActivityInput,
  ReportUpdateInput,
  ReportDetail,
  ReportHead,
  ReportListQuery,
  ReportListResponse,
  ReportNarrativeInput,
  ReportPdfResponse,
  ReportReceipt,
  ReportSearchQuery,
  ReportSearchResponse,
  ReportSignatureInput,
  RepositoryQuery,
  RepositorySearchResponse,
  ResendVerificationInput,
  ResetPasswordInput,
  Role,
  SendWorkbookInput,
  SendWorkbookResponse,
  SignatureState,
  SignatureUploadInput,
  SignatureUrl,
  SubmitNarrativeResponse,
  UnreadNotificationCount,
  UpdateProfileInput,
  VerifyEmailInput,
} from '@par/shared';

import { apiDownload, apiFetch } from './http';

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
 * Single typed entry point to the API (spec §5). The office registers an
 * activity, the personnel in charge write the narrative, and one admin decision
 * ends it; every function here is one of those steps or a read around them.
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
   * The signed-in account's own notifications. Never carries a user id: the
   * server reads the recipient from the session.
   */
  notifications: {
    list: (query: NotificationListQuery) => {
      const search = queryString(query);
      return apiFetch<NotificationListResponse>(`/me/notifications${search ? `?${search}` : ''}`);
    },
    unreadCount: () => apiFetch<UnreadNotificationCount>('/me/notifications/unread-count'),
    markRead: (id: string) =>
      apiFetch<NotificationReadResponse>(`/me/notifications/${id}/read`, { method: 'POST' }),
    markAllRead: () =>
      apiFetch<NotificationReadAllResponse>('/me/notifications/read-all', { method: 'POST' }),
  },
  /**
   * The caller's own acknowledgment receipts (spec §10); the server reads the
   * recipient from the session, so there is no id in the path.
   */
  receipts: {
    mine: () => apiFetch<{ items: MyReceipt[] }>('/receipts'),
  },
  reports: {
    /** The register; every signed-in account reads the same list (§5). */
    list: (query: ReportListQuery) => {
      const search = queryString(query);
      return apiFetch<ReportListResponse>(`/reports${search ? `?${search}` : ''}`);
    },
    /** Palette documents: only rows the caller may open. */
    search: (query: ReportSearchQuery) => {
      const search = queryString(query);
      return apiFetch<ReportSearchResponse>(`/reports/search${search ? `?${search}` : ''}`);
    },
    get: (id: string) => apiFetch<ReportDetail>(`/reports/${id}`),
    /** Admin: mints the AR No. and mails every personnel in charge. */
    create: (input: ReportActivityInput, idempotencyKey?: string) =>
      apiFetch<ReportHead & { sentTo: number }>('/reports', {
        method: 'POST',
        headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : undefined,
        body: JSON.stringify(input),
      }),
    /**
     * Admin: activity fields and the PIC list, until approval. A correction
     * after submission carries a reason (spec §9.2).
     */
    update: (id: string, input: ReportUpdateInput, version?: number) =>
      apiFetch<ReportHead & { changedFields: string[] }>(`/reports/${id}`, {
        method: 'PATCH',
        headers: version === undefined ? undefined : { 'if-match': String(version) },
        body: JSON.stringify(input),
      }),
    /** Admin: a PENDING record only. The AR No. is never reused. */
    remove: (id: string) => apiFetch<void>(`/reports/${id}`, { method: 'DELETE' }),
    /**
     * Admin: the office's Date Completed on an approved record. `null` clears it,
     * and the monitoring sheet falls back to the approval date.
     */
    setCompletedDate: (id: string, completedOn: string | null, version?: number) =>
      apiFetch<ReportHead>(`/reports/${id}/completed-date`, {
        method: 'PATCH',
        headers: version === undefined ? undefined : { 'if-match': String(version) },
        body: JSON.stringify({ completedOn }),
      }),
    /** Admin: files an approved record away; idempotent (spec §7). */
    archive: (id: string) => apiFetch<ReportHead>(`/reports/${id}/archive`, { method: 'POST' }),
    unarchive: (id: string) => apiFetch<ReportHead>(`/reports/${id}/archive`, { method: 'DELETE' }),
    /** PIC: saves the narrative draft, allowed in PENDING and RETURNED. */
    saveNarrative: (id: string, input: ReportNarrativeInput) =>
      apiFetch<ReportHead>(`/reports/${id}/narrative`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    /** PIC: validates and submits, with an idempotency key (spec §7.2). */
    submit: (id: string, idempotencyKey: string) =>
      apiFetch<SubmitNarrativeResponse>(`/reports/${id}/submit`, {
        method: 'POST',
        headers: { 'idempotency-key': idempotencyKey },
      }),
    /** Admin: one decision on a submitted narrative. */
    decide: (id: string, input: ReportDecisionInput) =>
      apiFetch<ReportHead>(`/reports/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    /** Admin: re-sends the assignment mail to every PIC. */
    resendInvitation: (id: string) =>
      apiFetch<{ sentTo: number }>(`/reports/${id}/invitation`, { method: 'POST' }),
    /** Snapshots a signature onto the record (signature spec §4.4). */
    setSignature: (id: string, input: ReportSignatureInput) =>
      apiFetch<ReportDetail>(`/reports/${id}/signature`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    removeSignature: (id: string) =>
      apiFetch<ReportDetail>(`/reports/${id}/signature`, { method: 'DELETE' }),
    /** Server-rendered facsimile PDF; the server decides the watermark (§7.8). */
    pdf: (id: string) => apiFetch<ReportPdfResponse>(`/reports/${id}/pdf`),
    receipts: (id: string) => apiFetch<{ items: ReportReceipt[] }>(`/reports/${id}/receipts`),
    receiptFile: (id: string, receiptId: string) =>
      apiDownload(`/reports/${id}/receipts/${receiptId}/file`),
  },
  /**
   * Runtime dropdowns for the record form (spec §7.3). Any authenticated user
   * may read them; only admins write through `api.admin.referenceData`.
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
  /** Office-wide settings; only an administrator may write them (report 9). */
  settings: {
    receiptSignatory: () => apiFetch<ReceiptSignatoryResponse>('/settings/receipt-signatory'),
    saveReceiptSignatory: (input: ReceiptSignatory) =>
      apiFetch<ReceiptSignatoryResponse>('/settings/receipt-signatory', {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
  },
  /** Per-account UI state; the API is its only store (settings spec §7.14). */
  preferences: {
    get: () => apiFetch<{ preferences: Preferences }>('/me/preferences'),
    save: (patch: PreferencesPatch) =>
      apiFetch<{ preferences: Preferences }>('/me/preferences', {
        method: 'PUT',
        body: JSON.stringify(patch),
      }),
  },
  profile: {
    get: () => apiFetch<Account>('/me'),
    update: (input: UpdateProfileInput) =>
      apiFetch<Account>('/me', { method: 'PATCH', body: JSON.stringify(input) }),
    changePassword: (input: ChangePasswordInput) =>
      apiFetch<void>('/me/password', { method: 'POST', body: JSON.stringify(input) }),
    /** The signature the narrative editor reuses; never printed on the receipt. */
    saveSignature: (input: SignatureUploadInput) =>
      apiFetch<SignatureState>('/me/signature', { method: 'PUT', body: JSON.stringify(input) }),
    removeSignature: () => apiFetch<SignatureState>('/me/signature', { method: 'DELETE' }),
    signatureUrl: () => apiFetch<SignatureUrl>('/me/signature/url'),
    /** Category mutes (email spec §8); account mail is reported, not toggleable. */
    emailPreferences: {
      get: () => apiFetch<EmailPreferencesResponse>('/me/email-preferences'),
      update: (input: EmailPreferencesInput) =>
        apiFetch<EmailPreferencesResponse>('/me/email-preferences', {
          method: 'PATCH',
          body: JSON.stringify(input),
        }),
    },
  },
  /** Locations the office already used (bug phase 04 §3.1). */
  locations: {
    suggest: (query: LocationQuery) => {
      const search = queryString(query);
      return apiFetch<LocationSuggestionsResponse>(`/locations${search ? `?${search}` : ''}`);
    },
    /**
     * Address suggestions (bug phase 04 §3.2). The provider is reached by the
     * Worker, so no key or external host is ever exposed to the browser or the
     * desktop webview. Empty once the query is four characters.
     */
    addresses: (query: LocationQuery) => {
      const search = queryString(query);
      return apiFetch<LocationSuggestionsResponse>(
        `/locations/suggest${search ? `?${search}` : ''}`,
      );
    },
  },
  /** Repository search; the server scopes it to what the caller may open. */
  search: {
    repository: (query: RepositoryQuery) => {
      const search = queryString(query);
      return apiFetch<RepositorySearchResponse>(`/search${search ? `?${search}` : ''}`);
    },
  },
  admin: {
    users: {
      list: (query: AdminUserListQuery = {}) => {
        const search = queryString(query);
        return apiFetch<AdminUserListResponse>(`/users${search ? `?${search}` : ''}`);
      },
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
      deactivate: <E extends ReferenceEntityKey>(entity: E, id: string) =>
        apiFetch<ReferenceItemMap[E]>(`/ref/${entity}/${id}`, { method: 'DELETE' }),
      activate: <E extends ReferenceEntityKey>(entity: E, id: string) =>
        apiFetch<ReferenceItemMap[E]>(`/ref/${entity}/${id}/activate`, { method: 'POST' }),
    },
    emails: {
      list: (query: EmailLogQuery) => {
        const search = queryString(query);
        return apiFetch<EmailLogResponse>(`/emails${search ? `?${search}` : ''}`);
      },
      resend: (id: string) => apiFetch<{ id: string }>(`/emails/${id}/resend`, { method: 'POST' }),
      message: (id: string) => apiFetch<EmailMessageResponse>(`/emails/${id}/message`),
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
        includeArchived: String(query.includeArchived),
      });
      return apiFetch<MonitoringPreviewResponse>(`/exports/monitoring/preview?${params}`);
    },
    /** The filtered register table as an A4 landscape PDF (spec §11.1). */
    register: (query: ReportListQuery) => {
      const search = queryString(query);
      return apiDownload(`/exports/register${search ? `?${search}` : ''}`);
    },
    monitoring: (input: MonitoringExportRequest) =>
      apiDownload('/exports/monitoring', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
    template: () => apiDownload('/exports/monitoring/template'),
    /** Mails the same workbook the download writes (email spec §11). */
    send: (input: SendWorkbookInput) =>
      apiFetch<SendWorkbookResponse>('/exports/monitoring/send', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  },
};
