import { DEFAULT_OFFICE_EMAIL } from '../identity';
import { renderShell, type ShellAction } from '../shell';
import type { EmailContent } from '../provider';

/**
 * Account and security mail (email spec §5.2). These kinds have no mute switch:
 * a person cannot opt out of being told their password was reset or that their
 * account was disabled. `ROLE_ASSIGNED` takes effect immediately: no activation
 * step follows a role change.
 */
export interface AccountEventData {
  fullName: string;
  /** Absolute link, built by the API from the request origin. */
  actionUrl?: string;
  roleLabel?: string;
  roleDescription?: string;
  officeEmail?: string;
}

function action(data: AccountEventData, label: string): ShellAction | undefined {
  return data.actionUrl ? { label, url: data.actionUrl } : undefined;
}

export function verifyEmailTemplate(data: AccountEventData): EmailContent {
  const primary = action(data, 'Verify your email address');

  return renderShell({
    subject: 'Verify your email address',
    heading: 'Confirm your email address',
    intro: [
      `Hello ${data.fullName}. An account was registered for this address with the OVPCASSS Paperless PAR system.`,
      'Confirm the address to continue. If you did not register, you can ignore this message and the account will not be activated.',
    ],
    ...(primary ? { action: primary } : {}),
    note: 'The link expires. Request a new message from the sign-in page if it no longer works.',
  });
}

export function resetPasswordTemplate(data: AccountEventData): EmailContent {
  const primary = action(data, 'Reset your password');

  return renderShell({
    subject: 'Reset your password',
    heading: 'Reset your password',
    intro: [
      `Hello ${data.fullName}. A password reset was requested for your account.`,
      'If you requested it, use the link below. If not, no action is required and your password stays as it is.',
    ],
    ...(primary ? { action: primary } : {}),
    note: 'The link can be used once and expires. Contact the office if you did not request a reset.',
  });
}

export function roleAssignedTemplate(data: AccountEventData): EmailContent {
  const primary = action(data, 'Sign in');

  return renderShell({
    subject: `Your role has been assigned: ${data.roleLabel ?? 'assigned role'}`,
    heading: 'Your role has been assigned',
    intro: [
      `Hello ${data.fullName}. The OVPCASSS administrator assigned you the role of ${data.roleLabel ?? 'a role'}.`,
      data.roleDescription ??
        'The role decides which reports and queues your account can reach.',
      'Sign in to continue with the work available to that role.',
    ],
    ...(primary ? { action: primary } : {}),
  });
}

export function accountActivatedTemplate(data: AccountEventData): EmailContent {
  const primary = action(data, 'Sign in');

  return renderShell({
    subject: 'Your account is active',
    heading: 'Your account is active',
    intro: [
      `Hello ${data.fullName}. Your OVPCASSS Paperless PAR account is now active.`,
      'Sign in with your university email address and the password you set at registration.',
    ],
    ...(primary ? { action: primary } : {}),
  });
}

export function accountDisabledTemplate(data: AccountEventData): EmailContent {
  const office = data.officeEmail ?? DEFAULT_OFFICE_EMAIL;

  return renderShell({
    subject: 'Your account has been disabled',
    heading: 'Your account has been disabled',
    intro: [
      `Hello ${data.fullName}. An administrator disabled your OVPCASSS Paperless PAR account.`,
      `You can no longer sign in. Contact the office at ${office} if you believe this is a mistake.`,
    ],
    facts: [{ label: 'Office', value: office }],
  });
}
