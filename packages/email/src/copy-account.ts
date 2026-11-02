import type { EmailTemplateCopy } from '@par/shared';

const paragraph = (text: string) => ({ text, when: null });

/**
 * Account and security mail (email spec §5.2). No mute switch covers these, so
 * the office can edit the words but the kind always sends: a person cannot opt
 * out of being told their password was reset.
 */
export const ACCOUNT_COPY: Record<
  'VERIFY' | 'RESET' | 'ROLE_ASSIGNED' | 'ACCOUNT_ACTIVATED' | 'ACCOUNT_DISABLED',
  EmailTemplateCopy
> = {
  VERIFY: {
    subject: 'Verify your email address',
    heading: 'Confirm your email address',
    greeting: 'Good day.',
    intro: [
      paragraph(
        'Hello {{fullName}}. An account was registered for this address with the OVPCASSS Paperless PAR system.',
      ),
      paragraph(
        'Confirm the address to continue. If you did not register, you can ignore this message and the account will not be activated.',
      ),
    ],
    facts: null,
    quote: null,
    action: {
      enabled: true,
      variants: [{ when: null, label: 'Verify your email address', urlToken: '{{verifyUrl}}' }],
    },
    footer: {
      enabled: true,
      reference: '',
      note: 'The link expires. Request a new message from the sign-in page if it no longer works.',
      replyNotice: true,
    },
  },

  RESET: {
    subject: 'Reset your password',
    heading: 'Reset your password',
    greeting: 'Good day.',
    intro: [
      paragraph('Hello {{fullName}}. A password reset was requested for your account.'),
      paragraph(
        'If you requested it, use the link below. If not, no action is required and your password stays as it is.',
      ),
    ],
    facts: null,
    quote: null,
    action: {
      enabled: true,
      variants: [{ when: null, label: 'Reset your password', urlToken: '{{resetUrl}}' }],
    },
    footer: {
      enabled: true,
      reference: '',
      note: 'The link can be used once and expires. Contact the office if you did not request a reset.',
      replyNotice: true,
    },
  },

  ROLE_ASSIGNED: {
    subject: 'Your role has been assigned: {{roleLabel}}',
    heading: 'Your role has been assigned',
    greeting: 'Good day.',
    intro: [
      paragraph(
        'Hello {{fullName}}. The OVPCASSS administrator assigned you the role of {{roleLabel}}.',
      ),
      paragraph('{{roleDescription}}'),
      paragraph('Sign in to continue with the work available to that role.'),
    ],
    facts: null,
    quote: null,
    action: {
      enabled: true,
      variants: [{ when: null, label: 'Sign in', urlToken: '{{loginUrl}}' }],
    },
    footer: { enabled: true, reference: '', note: '', replyNotice: true },
  },

  ACCOUNT_ACTIVATED: {
    subject: 'Your account is active',
    heading: 'Your account is active',
    greeting: 'Good day.',
    intro: [
      paragraph('Hello {{fullName}}. Your OVPCASSS Paperless PAR account is now active.'),
      paragraph(
        'Sign in with your university email address and the password you set at registration.',
      ),
    ],
    facts: null,
    quote: null,
    action: {
      enabled: true,
      variants: [{ when: null, label: 'Sign in', urlToken: '{{loginUrl}}' }],
    },
    footer: { enabled: true, reference: '', note: '', replyNotice: true },
  },

  ACCOUNT_DISABLED: {
    subject: 'Your account has been disabled',
    heading: 'Your account has been disabled',
    greeting: 'Good day.',
    intro: [
      paragraph(
        'Hello {{fullName}}. An administrator disabled your OVPCASSS Paperless PAR account.',
      ),
      paragraph(
        'You can no longer sign in. Contact the office at {{officeEmail}} if you believe this is a mistake.',
      ),
    ],
    facts: {
      enabled: true,
      source: 'fixed',
      rows: [{ label: 'Office', value: '{{officeEmail}}' }],
    },
    quote: null,
    action: null,
    footer: { enabled: true, reference: '', note: '', replyNotice: true },
  },
};
