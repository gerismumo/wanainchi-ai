import { z } from 'zod';

export const generateDigestSchema = z.object({
  location_type: z.enum(['county', 'constituency', 'ward', 'locality', 'area']),
  location_code: z.string().min(1),
  period_start: z.string().date(),
  period_end: z.string().date(),
});

export const digestQuerySchema = z.object({
  location_type: z.enum(['county', 'constituency', 'ward', 'locality', 'area']).optional(),
  location_code: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const latestDigestQuerySchema = z.object({
  location_type: z.enum(['county', 'constituency', 'ward', 'locality', 'area']),
  location_code: z.string().min(1),
});

export type GenerateDigestDto = z.infer<typeof generateDigestSchema>;
export type DigestQueryDto = z.infer<typeof digestQuerySchema>;
export type LatestDigestQueryDto = z.infer<typeof latestDigestQuerySchema>;
