/**
 * The Home onboarding sequence (onboarding spec §6). Steps are declared once and
 * resolved against the live DOM: a step whose target is absent — role, inbox
 * state, chrome — is dropped before the first frame, so the counter never
 * promises a step the user will not see.
 */
import type { Role } from '@par/shared';

import type { TourPlacement } from './tour-placement';

export type TourStepId =
  | 'welcome'
  | 'primary-nav'
  | 'new-report'
  | 'queues'
  | 'admin'
  | 'search'
  | 'notifications'
  | 'account'
  | 'checklist'
  | 'finish';

export type TourContext = {
  role: Role | null;
};

export type TourStepConfig = {
  id: TourStepId;
  /** `data-tour` anchor; both bookends are centered and have none. */
  anchor?: string;
  /** Exact role gate for copy that describes one role's own workspace. */
  roles?: readonly Role[];
  placement?: TourPlacement;
  title: (context: TourContext) => string;
  description: (context: TourContext) => string;
};

export type ResolvedStep = {
  id: TourStepId;
  anchor: string | null;
  placement: TourPlacement;
  title: string;
  description: string;
  /** 1-based, after filtering. */
  position: number;
  total: number;
  final: boolean;
};

const NAV_COPY: Record<Role, string> = {
  SUBMITTER:
    'Home shows the work that needs your attention. Reports holds every report you have drafted, submitted or had returned.',
  REVIEWER:
    'Home shows the work that needs your attention. Reports lists reports, and Queues holds the submissions waiting for your review.',
  APPROVER:
    'Home shows the work that needs your attention. Reports lists reports, and Queues holds the reports waiting for your approval.',
  ADMIN:
    'Home shows the work that needs your attention. Reports, Queues, Repository and Admin reach every part of the system.',
};

const DEFAULT_NAV_COPY =
  'Home shows the work that needs your attention. The navigation row reaches every section your account can open.';

export const TOUR_STEPS: readonly TourStepConfig[] = [
  {
    id: 'welcome',
    title: () => 'Welcome to Paperless PAR',
    description: () =>
      "Paperless PAR is the Office of the Vice President for Curriculum and Academic Standards and Services' system for post-activity reports. This short tour shows where each task begins. It takes about a minute.",
  },
  {
    id: 'primary-nav',
    anchor: 'primary-nav',
    placement: 'bottom',
    title: () => 'Primary navigation',
    description: ({ role }) => (role ? NAV_COPY[role] : DEFAULT_NAV_COPY),
  },
  {
    id: 'new-report',
    anchor: 'new-report',
    roles: ['SUBMITTER'],
    placement: 'bottom',
    title: () => 'Start a report',
    description: () =>
      'New report opens the four-step form for a completed activity. Your work is saved as a draft on this device until you submit it. Submission issues the tracking number.',
  },
  {
    id: 'queues',
    anchor: 'nav-queues',
    roles: ['REVIEWER', 'APPROVER'],
    placement: 'bottom',
    title: () => 'Your decision queues',
    description: () =>
      'Queues collects the reports waiting for your decision. Open one to read the facsimile and record a review or an approval.',
  },
  {
    id: 'admin',
    anchor: 'nav-admin',
    roles: ['ADMIN'],
    placement: 'bottom',
    title: () => 'Administration',
    description: () =>
      'Admin holds user accounts, reference data, workbook import and the audit log. Changes here apply to every campus.',
  },
  {
    id: 'search',
    anchor: 'titlebar-search',
    placement: 'bottom',
    title: () => 'Search from anywhere',
    description: () =>
      'Search opens the command palette, where you can jump to a page or a tracking number without leaving the keyboard.',
  },
  {
    id: 'notifications',
    anchor: 'notifications',
    placement: 'bottom',
    title: () => 'Notifications',
    description: () =>
      'The bell shows unread notices. It lists the three most recent, and View all notifications opens the full list.',
  },
  {
    id: 'account',
    anchor: 'account-menu',
    placement: 'bottom',
    title: () => 'Your account',
    description: () =>
      'This menu opens your profile and the keyboard shortcut reference, and signs you out.',
  },
  {
    id: 'checklist',
    anchor: 'onboarding-checklist',
    roles: ['SUBMITTER'],
    placement: 'right',
    title: () => 'Your first report',
    description: () =>
      'This checklist follows your progress: complete your profile, start a report, and submit it. It gives way once the inbox has other work to show.',
  },
  {
    id: 'finish',
    title: () => 'Setup complete',
    description: () =>
      'You have seen the main areas of Paperless PAR. You can take this tour again from Help at any time.',
  },
];

/**
 * Filters the declaration by role and DOM presence, then numbers what survives.
 * The DOM-facing `hasTarget` lives in the caller, so this stays testable
 * without a document.
 */
export function resolveTourSteps(
  context: TourContext,
  opts: { hasTarget?: (anchor: string) => boolean } = {},
): ResolvedStep[] {
  const hasTarget = opts.hasTarget ?? (() => true);

  const kept = TOUR_STEPS.filter((step) => {
    if (step.roles && !(context.role && step.roles.includes(context.role))) return false;
    return step.anchor ? hasTarget(step.anchor) : true;
  });

  return kept.map((step, index) => ({
    id: step.id,
    anchor: step.anchor ?? null,
    placement: step.placement ?? 'auto',
    title: step.title(context),
    description: step.description(context),
    position: index + 1,
    total: kept.length,
    final: index === kept.length - 1,
  }));
}

/** True when at least one step has something to point at. */
export function hasSpotlightStep(steps: readonly ResolvedStep[]): boolean {
  return steps.some((step) => step.anchor !== null);
}
