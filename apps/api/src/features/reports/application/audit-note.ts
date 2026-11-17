/** Keep stored before/after payloads out of the compact report timeline. */
export function auditNote(comment: string): string {
  try {
    const value: unknown = JSON.parse(comment);
    if (value && typeof value === 'object' && ('before' in value || 'after' in value)) {
      return 'note' in value && typeof value.note === 'string' ? value.note : 'Change recorded';
    }
  } catch {
    // Historical events store plain text rather than structured change payloads.
  }
  return comment;
}
