import {
  accountActivatedTemplate,
  accountDisabledTemplate,
  resetPasswordTemplate,
  roleAssignedTemplate,
  verifyEmailTemplate,
} from '@par/email';

import type { Env } from '../env';
import { enqueueEmail } from './outbox';

export interface AccountMail {
  to: string;
  fullName: string;
  token: string;
  /** The API and the web build share an origin, so the link is built from the request. */
  origin: string;
}

export interface AccountNotice {
  to: string;
  fullName: string;
  origin?: string;
  roleLabel?: string;
  roleDescription?: string;
}

/**
 * Account and security mail (spec §7.9, email spec §5.2). Sends go through the
 * outbox and the Queue, so an email outage never fails the request that
 * triggered it. None of these kinds can be muted by the recipient.
 */
export async function sendVerificationEmail(env: Env, mail: AccountMail): Promise<void> {
  await enqueueEmail(env, {
    kind: 'VERIFY',
    to: mail.to,
    content: verifyEmailTemplate({
      fullName: mail.fullName,
      actionUrl: link(mail, '/verify-email', { email: mail.to }),
    }),
  });
}

export async function sendPasswordResetEmail(env: Env, mail: AccountMail): Promise<void> {
  await enqueueEmail(env, {
    kind: 'RESET',
    to: mail.to,
    content: resetPasswordTemplate({
      fullName: mail.fullName,
      actionUrl: link(mail, '/reset-password'),
    }),
  });
}

/** Assigned, not activated: the message says the account still waits for activation. */
export async function sendRoleAssignedEmail(env: Env, notice: AccountNotice): Promise<void> {
  await enqueueEmail(env, {
    kind: 'ROLE_ASSIGNED',
    to: notice.to,
    content: roleAssignedTemplate({
      fullName: notice.fullName,
      ...(notice.roleLabel === undefined ? {} : { roleLabel: notice.roleLabel }),
      ...(notice.roleDescription === undefined ? {} : { roleDescription: notice.roleDescription }),
      ...(notice.origin === undefined ? {} : { actionUrl: `${notice.origin}/login` }),
    }),
  });
}

export async function sendAccountActivatedEmail(env: Env, notice: AccountNotice): Promise<void> {
  await enqueueEmail(env, {
    kind: 'ACCOUNT_ACTIVATED',
    to: notice.to,
    content: accountActivatedTemplate({
      fullName: notice.fullName,
      ...(notice.origin === undefined ? {} : { actionUrl: `${notice.origin}/login` }),
    }),
  });
}

export async function sendAccountDisabledEmail(env: Env, notice: AccountNotice): Promise<void> {
  await enqueueEmail(env, {
    kind: 'ACCOUNT_DISABLED',
    to: notice.to,
    content: accountDisabledTemplate({
      fullName: notice.fullName,
      ...(env.OFFICE_EMAIL ? { officeEmail: env.OFFICE_EMAIL } : {}),
    }),
  });
}

function link(mail: AccountMail, path: string, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({ token: mail.token, ...extra });
  return `${mail.origin}${path}?${params.toString()}`;
}
