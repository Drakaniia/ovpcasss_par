/**
 * The two pages inside Email. Like the reference-data entity tabs, the sub-tab
 * is URL state on the one route, so the Admin section's Email tab stays lit and
 * a shared link reproduces the exact view.
 */
export type EmailTab = 'log' | 'variables';

export const EMAIL_TABS: readonly { key: EmailTab; label: string; href: string }[] = [
  { key: 'log', label: 'Log', href: '/admin/emails' },
  { key: 'variables', label: 'Variables', href: '/admin/emails?tab=variables' },
];

export function emailTabFromParams(params: { get(name: string): string | null }): EmailTab {
  return params.get('tab') === 'variables' ? 'variables' : 'log';
}
