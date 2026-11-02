import {
  EMAIL_TEMPLATE_SUBJECT_MAX,
  type EmailTemplateCopy,
  type EmailTemplateIssue,
  type EmailToken,
} from '@par/shared';

/**
 * Pure helpers for the message editor (email message editor spec §8). Keeping
 * the caret maths and the issue lookup here means the components only draw.
 */

export function draftFrom(copy: EmailTemplateCopy): EmailTemplateCopy {
  return structuredClone(copy);
}

/** Whether the draft still matches what is saved. */
export function sameCopy(a: EmailTemplateCopy, b: EmailTemplateCopy): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Insert `{{token}}` at the caret and report where the caret lands. */
export function insertTokenAt(
  value: string,
  token: EmailToken | string,
  start: number,
  end: number,
): { value: string; caret: number } {
  const text = `{{${token}}}`;
  const from = Math.min(Math.max(0, start), value.length);
  const to = Math.min(Math.max(from, end), value.length);

  return {
    value: `${value.slice(0, from)}${text}${value.slice(to)}`,
    caret: from + text.length,
  };
}

/** Characters left in the editable part of the subject, tag excluded. */
export function subjectRemaining(subject: string): number {
  return EMAIL_TEMPLATE_SUBJECT_MAX - subject.length;
}

/** The first message for a field, whether the issue names it or its parent. */
export function issueFor(
  issues: readonly EmailTemplateIssue[],
  path: string,
): string | undefined {
  return (
    issues.find((issue) => issue.path === path)?.message ??
    issues.find((issue) => path.startsWith(`${issue.path}.`) || path === issue.path)?.message
  );
}

/** The paragraph index a branch key occupies, or -1 when it has no copy. */
export function branchIndex(copy: EmailTemplateCopy, when: string): number {
  return copy.intro.findIndex((paragraph) => paragraph.when === when);
}

/** The label a block or paragraph shows when it is tied to a case. */
export function branchLabel(
  branches: readonly { key: string; label: string }[],
  when: string | null,
): string {
  if (when === null) return 'Always shown';
  return branches.find((branch) => branch.key === when)?.label ?? when;
}

/** A new always-shown paragraph, appended after the existing ones. */
export function appendedParagraph() {
  return { text: 'Write the paragraph.', when: null };
}

/** The example text a token menu shows, so a token is recognisable. */
export function tokenExample(example: string): string {
  return example.length > 48 ? `${example.slice(0, 45)}…` : example;
}
