import { z } from "zod";

// Reusable pagination schema
const createPaginationSchema = () =>
  z.object({
    page: z
      .string()
      .optional()
      .transform((value) => (value ? Number.parseInt(value, 10) : undefined))
      .refine((value) => value === undefined || (!Number.isNaN(value) && value > 0), {
        message: "Page must be a positive integer",
      }),
    limit: z
      .string()
      .optional()
      .transform((value) => (value ? Number.parseInt(value, 10) : undefined))
      .refine((value) => value === undefined || (!Number.isNaN(value) && value >= 1 && value <= 100), {
        message: "Limit must be between 1 and 100",
      }),
  });

export const SuperCategoriesSchema = createPaginationSchema();
export type TSuperCategoriesSchema = z.output<typeof SuperCategoriesSchema>;

export const SkillsSchema = createPaginationSchema();
export type TSkillsSchema = z.output<typeof SkillsSchema>;

export const CompaniesSchema = createPaginationSchema();
export type TCompaniesSchema = z.output<typeof CompaniesSchema>;

export const JobTitlesSchema = createPaginationSchema();
export type TJobTitlesSchema = z.output<typeof JobTitlesSchema>;

export const CountriesSchema = createPaginationSchema();
export type TCountriesSchema = z.output<typeof CountriesSchema>;

export const LanguagesSchema = createPaginationSchema();
export type TLanguagesSchema = z.output<typeof LanguagesSchema>;
