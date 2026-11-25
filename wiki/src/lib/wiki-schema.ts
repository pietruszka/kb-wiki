import { z } from 'astro/zod';
import { PAGE_TYPES, type PageType } from './page-types';

export const PAGE_TYPE_IDS = Object.keys(PAGE_TYPES) as [PageType, ...PageType[]];
export const PAGE_STATUSES = ['draft', 'stable', 'stale'] as const;
export type PageStatus = (typeof PAGE_STATUSES)[number];

const httpUrl = z
  .url()
  .refine(
    (value) => value.startsWith('https://') || value.startsWith('http://'),
    'source URL must start with http:// or https://',
  );

export const wikiSourceSchema = z
  .object({
    title: z.string().trim().min(1),
    url: httpUrl.optional(),
  })
  .strict();

export const wikiSchema = z
  .object({
    type: z.enum(PAGE_TYPE_IDS),
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    tags: z.array(z.string().trim().min(1)),
    sources: z.array(wikiSourceSchema),
    updated: z.coerce.date(),
    status: z.enum(PAGE_STATUSES),
  })
  .strict();

export type WikiSource = z.infer<typeof wikiSourceSchema>;
export type WikiFrontmatter = z.infer<typeof wikiSchema>;
