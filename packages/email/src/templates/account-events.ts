import type { EmailContent } from '../provider';

export interface AccountEventData {
  fullName: string;
  actionUrl: string;
}

export function verifyEmailTemplate(data: AccountEventData): EmailContent {
  return {
    subject: 'Verify your OVPCASSS PAR account',
    text: `Hello ${data.fullName}, verify your email address: ${data.actionUrl}`,
    html: `<p>Hello ${data.fullName},</p><p><a href="${data.actionUrl}">Verify your email address</a></p>`,
  };
}

export function resetPasswordTemplate(data: AccountEventData): EmailContent {
  return {
    subject: 'Reset your OVPCASSS PAR password',
    text: `Hello ${data.fullName}, reset your password: ${data.actionUrl}`,
    html: `<p>Hello ${data.fullName},</p><p><a href="${data.actionUrl}">Reset your password</a></p>`,
  };
}

export function roleApprovedTemplate(fullName: string): EmailContent {
  return {
    subject: 'Your OVPCASSS PAR account is active',
    text: `Hello ${fullName}, your role has been assigned and your account is active.`,
    html: `<p>Hello ${fullName},</p><p>Your role has been assigned and your account is active.</p>`,
  };
}
