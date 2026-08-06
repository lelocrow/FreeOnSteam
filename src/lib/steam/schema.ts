import { z } from "zod";

export const steamSearchSchema = z.object({
  results_html: z.string(),
  total_count: z.coerce.number().int().nonnegative(),
});

export const steamAppDataSchema = z.object({
  type: z.string(),
  name: z.string().min(1),
  is_free: z.boolean().optional(),
  header_image: z.string().optional(),
  short_description: z.string().optional(),
  price_overview: z
    .object({
      currency: z.string(),
      initial: z.number().int().nonnegative(),
      final: z.number().int().nonnegative(),
      discount_percent: z.number().int().min(0).max(100),
      final_formatted: z.string().optional(),
    })
    .optional(),
  genres: z.array(z.object({ description: z.string().optional() })).optional(),
  categories: z.array(z.object({ description: z.string().optional() })).optional(),
  package_groups: z
    .array(
      z.object({
        subs: z
          .array(
            z.object({
              option_text: z.string().optional(),
              is_free_license: z.boolean().optional(),
              price_in_cents_with_discount: z.number().int().nonnegative().optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});
