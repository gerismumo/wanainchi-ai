import { z } from 'zod';

export const locationInputSchema = z.object({
  location_type: z.enum(['county', 'constituency', 'ward', 'locality', 'area']).optional(),
  location_code: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export const createTextReportSchema = locationInputSchema.extend({
  content_text: z
    .string()
    .min(5, 'Report text must be at least 5 characters long')
    .max(5000, 'Report text cannot exceed 5000 characters'),
  language: z.enum(['en', 'sw', 'sheng']).optional().default('en'),
});

// Voice/photo reports: the file comes in via multipart, everything else
// (including an optional caption) travels as regular form fields.
export const createMediaReportSchema = locationInputSchema.extend({
  caption: z.string().max(500).optional(),
});

export const updateReportStatusSchema = z.object({
  status: z.enum(['received', 'processing', 'reviewed', 'in_progress', 'resolved']),
});

export const reportQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['received', 'processing', 'reviewed', 'in_progress', 'resolved']).optional(),
  category: z.string().optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative', 'urgent']).optional(),
  location_type: z.enum(['county', 'constituency', 'ward', 'locality', 'area']).optional(),
  location_code: z.string().optional(),
  county_code: z.string().optional(),
  constituency_code: z.string().optional(),
  q: z.string().optional(),
});

export const myReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type LocationInputDto = z.infer<typeof locationInputSchema>;
export type CreateTextReportDto = z.infer<typeof createTextReportSchema>;
export type CreateMediaReportDto = z.infer<typeof createMediaReportSchema>;
export type UpdateReportStatusDto = z.infer<typeof updateReportStatusSchema>;
export type ReportQueryDto = z.infer<typeof reportQuerySchema>;
export type MyReportsQueryDto = z.infer<typeof myReportsQuerySchema>;
