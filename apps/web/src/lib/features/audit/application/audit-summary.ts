import type { AuditEventItem, Role } from '@par/shared';

import { ROLE_LABELS } from '$lib/navigation/navigation';
import { STATUS_PRESENTATION } from '$lib/status/report-status';

const TIME_ZONE = 'Asia/Manila';

const manilaDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: TIME_ZONE,
});

const manilaTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: TIME_ZONE,
});

export function formatManilaTimestamp(isoString: string): { display: string; utc: string } {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return { display: '—', utc: isoString };
  }
  const dateStr = manilaDateFormatter.format(date);
  const timeStr = manilaTimeFormatter.format(date);
  return {
    display: `${dateStr} ${timeStr}`,
    utc: date.toISOString(),
  };
}

export function formatAuditActionLabel(action: string): string {
  const words = action.toLowerCase().split('_');
  return words.map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ');
}

export function formatAuditActorLabel(
  actorName?: string | null,
  actorRole?: Role | string | null,
): string {
  const roleName = actorRole && actorRole in ROLE_LABELS ? ROLE_LABELS[actorRole as Role] : actorRole;
  if (actorName && roleName) {
    return `${actorName} (${roleName})`;
  }
  if (actorName) {
    return actorName;
  }
  if (roleName) {
    return roleName;
  }
  return 'System';
}

function resolveStatusLabel(status: string): string {
  if (status in STATUS_PRESENTATION) {
    return STATUS_PRESENTATION[status as keyof typeof STATUS_PRESENTATION].label;
  }
  return formatAuditActionLabel(status);
}

export function formatAuditStatusTransition(
  fromStatus?: string | null,
  toStatus?: string | null,
): string | null {
  if (!fromStatus && !toStatus) return null;
  if (fromStatus && toStatus) {
    return `${resolveStatusLabel(fromStatus)} → ${resolveStatusLabel(toStatus)}`;
  }
  if (toStatus) {
    return resolveStatusLabel(toStatus);
  }
  return resolveStatusLabel(fromStatus!);
}

export function formatAuditSummary(event: AuditEventItem): string {
  const actor = formatAuditActorLabel(event.actorName, event.actorRole);
  const action = formatAuditActionLabel(event.action).toLowerCase();
  const entity = event.entityLabel ?? event.entityId ?? event.entityType;
  const time = formatManilaTimestamp(event.createdAt);
  const formattedTime = time.display.replace(/(\d{4})\s(\d{2}:\d{2})/, '$1 at $2');

  return `${actor} ${action} ${entity} on ${formattedTime}.`;
}
