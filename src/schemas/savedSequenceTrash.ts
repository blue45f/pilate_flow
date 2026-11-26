import { z } from 'zod';
import { idSchema, sequenceSchema } from './cloudBackupSchema';

export const savedSequenceTrashSchema = z
  .array(
    z
      .object({
        trashId: idSchema,
        deletedAt: z.string().datetime(),
        sequence: sequenceSchema,
      })
      .strict(),
  )
  .refine((entries) => new Set(entries.map((entry) => entry.trashId)).size === entries.length);
