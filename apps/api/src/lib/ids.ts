/** Row identifiers are random UUIDs, so an id never leaks insertion order. */
export function createId(): string {
  return crypto.randomUUID();
}
