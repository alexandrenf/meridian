import { z } from 'zod';

export const reportValidator = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  slug: z.string(),
  createdAt: z.coerce.date(),
  date: z.object({ month: z.string(), day: z.number(), year: z.number() }),
  totalArticles: z.number(),
  usedArticles: z.number(),
  totalSources: z.number(),
  usedSources: z.number(),
  model_author: z.string(),
});

export type Report = z.infer<typeof reportValidator>;
export type Reports = Report[]; 