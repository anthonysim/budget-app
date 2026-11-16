import { z } from 'zod'
import { dateSchema } from '#/lib/transactions'

export const TARGET_TYPES = [
  'needed_for_spending',
  'have_balance',
  'monthly_funding',
] as const
export const TARGET_REPEATS = ['weekly', 'monthly', 'yearly', 'once'] as const
export const TARGET_BEHAVIORS = ['set_aside', 'refill'] as const

export const TARGET_TYPE_LABELS = {
  needed_for_spending: 'Needed for spending',
  have_balance: 'Have a balance of',
  monthly_funding: 'Fund every month',
} as const

export const TARGET_REPEAT_LABELS = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  once: 'Once, by a date',
} as const

export const setTargetSchema = z
  .object({
    budgetId: z.uuid(),
    categoryId: z.uuid(),
    type: z.enum(TARGET_TYPES),
    amount: z.number().int().min(1, 'Enter an amount above zero').max(1e12),
    repeat: z.enum(TARGET_REPEATS).nullable(),
    dueDate: dateSchema.nullable(),
    behavior: z.enum(TARGET_BEHAVIORS).nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'needed_for_spending') {
      if (!v.repeat) {
        ctx.addIssue({
          code: 'custom',
          message: 'Choose how often',
          path: ['repeat'],
        })
      }
      if (!v.dueDate) {
        ctx.addIssue({
          code: 'custom',
          message: 'Choose a due date',
          path: ['dueDate'],
        })
      }
      if (!v.behavior) {
        ctx.addIssue({
          code: 'custom',
          message: 'Choose a funding style',
          path: ['behavior'],
        })
      }
    }
  })

export const clearTargetSchema = z.object({
  budgetId: z.uuid(),
  categoryId: z.uuid(),
})
