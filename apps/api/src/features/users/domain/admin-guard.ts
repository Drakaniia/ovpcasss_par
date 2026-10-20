/**
 * The signed-in administrator may act on any account except their own row
 * (UI spec phase 03 §3): role changes, activation, and disable all stop here.
 */
export function isSelfTarget(actorUserId: string, targetUserId: string): boolean {
  return actorUserId === targetUserId;
}
