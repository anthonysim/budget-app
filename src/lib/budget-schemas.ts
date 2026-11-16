import { z } from 'zod'

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'] as const
export type Currency = (typeof CURRENCIES)[number]

export const budgetNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(60, 'Name must be 60 characters or fewer')

export const createBudgetSchema = z.object({
  name: budgetNameSchema,
  currency: z.enum(CURRENCIES).default('USD'),
})

export const renameBudgetSchema = z.object({
  budgetId: z.uuid(),
  name: budgetNameSchema,
})

export const budgetIdSchema = z.object({ budgetId: z.uuid() })
