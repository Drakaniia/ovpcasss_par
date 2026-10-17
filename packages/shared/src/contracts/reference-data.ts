import { z } from 'zod';

import { LEVELS, UNIT_KINDS } from '../domain/enums';
import { idSchema } from './common';

export const unitKindSchema = z.enum(UNIT_KINDS);
export const levelSchema = z.enum(LEVELS);

export const referenceItemSchema = z.object({
  id: idSchema,
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(200),
});
export type ReferenceItem = z.infer<typeof referenceItemSchema>;

export const programSchema = referenceItemSchema.extend({
  unitId: idSchema,
  level: levelSchema,
});
export type Program = z.infer<typeof programSchema>;

export const termSchema = z.object({
  schoolYear: z.string().regex(/^\d{4}-\d{4}$/),
  semester: z.union([z.literal(1), z.literal(2)]),
  startsOn: z.string().min(1),
  endsOn: z.string().min(1),
});
export type Term = z.infer<typeof termSchema>;
