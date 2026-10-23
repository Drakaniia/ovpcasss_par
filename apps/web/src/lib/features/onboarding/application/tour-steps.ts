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
  | 'new-record'
  | 'admin'
  | 'search'
  | 'notifications'
  | 'account'
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
  PERSONNEL:
    'Home shows the activities assigned to you. Reports lists every record you are the personnel in charge of, with its status.',
  ADMIN:
    'Home shows the work that needs your attention. Reports, Repository and Admin reach every part of the system.',
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
    id: 'new-record',
    anchor: 'new-record',
    roles: ['ADMIN'],
    placement: 'bottom',
    title: () => 'Create a record',
    description: () =>
      'New record captures the activity and the people in charge. Saving issues the AR No. and mails each person their assignment.',
  },
  {
    id: 'admin',
    anchor: 'nav-admin',
    roles: ['ADMIN'],
    placement: 'bottom',
    title: () => 'Administration',
    description: () =>
      'Admin holds user accounts, reference data and the audit log. Changes here apply to every campus.',
  },
  {
    id: 'search',
    anchor: 'titlebar-search',
    placement: 'bottom',
    title: () => 'Search from anywhere',
    description: () =>
      'Search opens the command palette, where you can jump to a page or an AR No. without leaving the keyboard.',
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
