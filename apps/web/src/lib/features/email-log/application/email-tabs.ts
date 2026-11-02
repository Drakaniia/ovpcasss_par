/**
 * The pages inside Email. Like the reference-data entity tabs, the sub-tab is
 * URL state on the one route, so the Admin section's Email tab stays lit and a
 * shared link reproduces the exact view.
 */
export type EmailTab = 'log' | 'variables' | 'messages';

export const EMAIL_TABS: readonly { key: EmailTab; label: string; href: string }[] = [
  { key: 'log', label: 'Log', href: '/admin/emails' },
  { key: 'variables', label: 'Variables', href: '/admin/emails?tab=variables' },
  { key: 'messages', label: 'Messages', href: '/admin/emails?tab=messages' },
];

export function emailTabFromParams(params: { get(name: string): string | null }): EmailTab {
  const tab = params.get('tab');
  return tab === 'variables' || tab === 'messages' ? tab : 'log';
}
