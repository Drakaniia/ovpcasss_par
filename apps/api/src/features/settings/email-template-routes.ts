import {
  EMAIL_KIND_LABELS,
  emailTemplatePreviewInputSchema,
  emailTemplateSaveInputSchema,
  isEmailKind,
  parseEmailTemplateCopy,
  type EmailKind,
  type EmailTemplateDetailResponse,
  type EmailTemplateIssue,
  type EmailTemplateListResponse,
  type EmailTemplatePreviewResponse,
  type EmailTemplateRestoreAllResponse,
} from '@par/shared';
import { type Hono, type Context } from 'hono';

import type { AppEnv } from '../../env';
import { appOrigin } from '../../lib/app-origin';
import { recordAudit } from '../../lib/audit';
import { requireRole } from '../../middleware/authorize';
import {
  emailTemplateDetail,
  listEmailTemplates,
  renderEmailTemplatePreview,
  restoreAllEmailTemplates,
  restoreEmailTemplate,
  saveEmailTemplate,
} from './application/email-templates';

/** Message copy arrives from a textarea; 32 KB is far more than 15 messages need. */
const COPY_BODY_LIMIT = 32 * 1024;

function kindParam(c: Context<AppEnv>): EmailKind | null {
  const value = c.req.param('kind') ?? '';
  return isEmailKind(value) ? value : null;
}

function unknownKind(c: Context<AppEnv>) {
  return c.json({ error: { code: 'NOT_FOUND', message: 'No such email message' } }, 404);
}

function copyIssues(c: Context<AppEnv>, issues: readonly EmailTemplateIssue[]) {
  return c.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Check the highlighted fields',
        details: issues.map((issue) => ({
          path: issue.path.split('.').filter(Boolean),
          message: issue.message,
          ...(issue.token ? { token: issue.token } : {}),
        })),
      },
    },
    400,
  );
}

/**
 * Editable message copy (email message editor spec §6). Mounted on the settings
 * app so the session middleware and audit shape are the same as the rest of the
 * office-owned settings.
 */
export function registerEmailTemplateRoutes(app: Hono<AppEnv>): void {
  /**
   * Every kind is listed, including the ones the office has not touched, so the
   * page never has to guess what is missing.
   */
  app.get('/email-templates', requireRole('ADMIN'), async (c) => {
    const response: EmailTemplateListResponse = { items: await listEmailTemplates(c.env) };
    return c.json(response);
  });

  app.get('/email-templates/:kind', requireRole('ADMIN'), async (c) => {
    const kind = kindParam(c);
    if (!kind) return unknownKind(c);

    const response: EmailTemplateDetailResponse = {
      template: await emailTemplateDetail(c.env, kind),
    };
    return c.json(response);
  });

  app.put('/email-templates/:kind', requireRole('ADMIN'), async (c) => {
    const kind = kindParam(c);
    if (!kind) return unknownKind(c);

    const viewer = c.get('userId');
    if (!viewer) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue' } }, 401);
    }

    const parsed = emailTemplateSaveInputSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return copyIssues(
        c,
        parsed.error.issues.map((issue) => ({
          path: issue.path.map(String).join('.'),
          message: issue.message,
        })),
      );
    }

    const checked = parseEmailTemplateCopy(kind, parsed.data.copy);
    if (!checked.success) return copyIssues(c, checked.issues);
    if (checked.issues.length > 0) return copyIssues(c, checked.issues);

    await saveEmailTemplate(c.env, kind, checked.copy, viewer);
    await recordAudit(c, {
      actorUserId: viewer,
      actorRole: c.get('role'),
      action: 'SETTINGS_UPDATED',
      entityType: 'settings',
      entityId: `email-template:${kind}`,
      comment: `Edited the ${EMAIL_KIND_LABELS[kind]} message`,
    });

    const response: EmailTemplateDetailResponse = {
      template: await emailTemplateDetail(c.env, kind),
    };
    return c.json(response);
  });

  /** Restore one message: the row goes, so a later default change reaches it. */
  app.delete('/email-templates/:kind', requireRole('ADMIN'), async (c) => {
    const kind = kindParam(c);
    if (!kind) return unknownKind(c);

    const viewer = c.get('userId');
    if (!viewer) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue' } }, 401);
    }

    await restoreEmailTemplate(c.env, kind);
    await recordAudit(c, {
      actorUserId: viewer,
      actorRole: c.get('role'),
      action: 'SETTINGS_UPDATED',
      entityType: 'settings',
      entityId: `email-template:${kind}`,
      comment: `Restored the ${EMAIL_KIND_LABELS[kind]} message to the built-in copy`,
    });

    const response: EmailTemplateDetailResponse = {
      template: await emailTemplateDetail(c.env, kind),
    };
    return c.json(response);
  });

  app.delete('/email-templates', requireRole('ADMIN'), async (c) => {
    const viewer = c.get('userId');
    if (!viewer) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue' } }, 401);
    }

    const restored = await restoreAllEmailTemplates(c.env);
    await recordAudit(c, {
      actorUserId: viewer,
      actorRole: c.get('role'),
      action: 'SETTINGS_UPDATED',
      entityType: 'settings',
      entityId: 'email-template:*',
      comment: `Restored ${restored} messages to the built-in copy`,
    });

    const response: EmailTemplateRestoreAllResponse = { restored };
    return c.json(response);
  });

  /**
   * Render the submitted copy without saving it. The preview is the only place a
   * draft is drawn, so a half-typed message never reaches a recipient and the
   * editor can show the result before the office commits to it.
   */
  app.post('/email-templates/:kind/preview', requireRole('ADMIN'), async (c) => {
    const kind = kindParam(c);
    if (!kind) return unknownKind(c);

    const raw = await c.req.text();
    if (raw.length > COPY_BODY_LIMIT) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'That message copy is too large.' } },
        400,
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }

    const parsed = emailTemplatePreviewInputSchema.safeParse(body);
    if (!parsed.success) {
      return copyIssues(
        c,
        parsed.error.issues.map((issue) => ({
          path: issue.path.map(String).join('.'),
          message: issue.message,
        })),
      );
    }

    const content = renderEmailTemplatePreview(kind, parsed.data.copy, appOrigin(c));
    const response: EmailTemplatePreviewResponse = {
      subject: content.subject,
      html: content.html,
      text: content.text,
    };
    return c.json(response);
  });
}
