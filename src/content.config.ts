import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema({ extend: z.object({
    author: z.string().trim().min(1).optional(),
    durationMinutes: z.number().int().positive().nullable().optional(),
  }) }) }),
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
};
