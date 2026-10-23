import {
  createDb,
  createEmailTokenQueries,
  createUserQueries,
  type ReportPicRow,
  type UserRow,
} from '@par/db';
import type { ReportActivityInput } from '@par/shared';

import { sendVerificationEmail } from '../../../email/auth-mail';
import { sendAssignedEmail, sendPicRemovedEmail } from '../../../email/report-mail';
import type { Env } from '../../../env';
import { createId } from '../../../lib/ids';
import { hashPassword } from '../../../lib/password';
import { createOpaqueToken, hashToken } from '../../../lib/tokens';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

export interface AssignedPic {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  newAccount: boolean;
}

/**
 * Each PIC email becomes an account (spec §9): an existing account is linked,
 * a new one is created as PERSONNEL awaiting verification. A new account also
 * gets the standard verification link; the assignment mail follows the insert.
 */
export async function ensurePicAccounts(
  env: Env,
  pics: ReportActivityInput['pics'],
  origin: string,
): Promise<AssignedPic[]> {
  const db = createDb(env.DB);
  const users = createUserQueries(db);
  const tokens = createEmailTokenQueries(db);
  const now = new Date().toISOString();
  const assigned: AssignedPic[] = [];

  for (const pic of pics) {
    const email = pic.email.trim().toLowerCase();
    let user: UserRow | null = await users.findByEmail(email);
    let newAccount = false;

    if (!user) {
      const { hash, params } = await hashPassword(createOpaqueToken());
      const id = createId();
      await users.insert({
        id,
        email,
        passwordHash: hash,
        hashParams: params,
        fullName: pic.name,
        role: 'PERSONNEL',
        status: 'PENDING_VERIFICATION',
        createdAt: now,
        updatedAt: now,
      });
      user = await users.findById(id);
      newAccount = true;

      const token = createOpaqueToken();
      await tokens.insert({
        id: createId(),
        userId: id,
        kind: 'VERIFY',
        tokenHash: await hashToken(token),
        expiresAt: new Date(Date.now() + VERIFY_TTL_MS).toISOString(),
        createdAt: now,
        updatedAt: now,
      });
      await sendVerificationEmail(env, { to: email, fullName: pic.name, token, origin });
    }

    if (!user) throw new Error('The PIC account could not be provisioned');

    assigned.push({
      userId: user.id,
      name: pic.name,
      email,
      phone: pic.phone ?? null,
      newAccount,
    });
  }

  return assigned;
}

export async function mailAssignedPics(
  env: Env,
  assigned: readonly AssignedPic[],
  input: {
    referenceNo: string;
    title: string;
    activityDate: string;
    location: string;
    origin: string;
  },
  reportId: string,
): Promise<void> {
  for (const pic of assigned) {
    await sendAssignedEmail(
      env,
      pic.email,
      {
        referenceNo: input.referenceNo,
        title: input.title,
        activityDate: input.activityDate,
        location: input.location,
        newAccount: pic.newAccount,
        origin: input.origin,
      },
      reportId,
    );
  }
}

/** Mail the people the office removed, after the new PIC list is stored. */
export async function mailRemovedPics(
  env: Env,
  removed: readonly ReportPicRow[],
  input: { referenceNo: string; title: string },
  reportId: string,
): Promise<void> {
  for (const pic of removed) {
    await sendPicRemovedEmail(
      env,
      pic.email,
      { referenceNo: input.referenceNo, title: input.title },
      reportId,
    );
  }
}
