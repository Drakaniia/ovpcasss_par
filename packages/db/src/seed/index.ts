import type { Database } from '../client';

/**
 * Seeds campuses, units, programs, SDGs, and terms from
 * `docs/OVPCASSS-PAPERLESS_PROCESS_FOR_PAR.md`, normalizing the source
 * inconsistencies listed in spec §8. Implemented in M2.
 */
export async function seedReferenceData(_db: Database): Promise<void> {
  throw new Error('seedReferenceData is not implemented yet (M2)');
}
