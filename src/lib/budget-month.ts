import { z } from 'zod'

export const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-01$/, 'Invalid month')

export const loadBudgetMonthSchema = z.object({
  budgetId: z.uuid(),
  month: monthSchema,
})

const amount = z.number().int().min(-1e12).max(1e12)

/** Absolute assigned values (used for edits and undo/redo). */
export const setAssignmentsSchema = z.object({
  budgetId: z.uuid(),
  changes: z
    .array(
      z.object({
        categoryId: z.uuid(),
        month: monthSchema,
        assigned: amount,
      }),
    )
    .min(1)
    .max(200),
})

/** Atomically moves money between two categories within a month. */
export const moveMoneySchema = z
  .object({
    budgetId: z.uuid(),
    month: monthSchema,
    fromCategoryId: z.uuid(),
    toCategoryId: z.uuid(),
    amount: amount.refine((n) => n > 0, 'Amount must be positive'),
  })
  .refine((v) => v.fromCategoryId !== v.toCategoryId, {
    message: 'Choose two different categories',
  })

export interface TargetView {
  type: 'needed_for_spending' | 'have_balance' | 'monthly_funding'
  amount: number
  repeat: 'weekly' | 'monthly' | 'yearly' | 'once' | null
  dueDate: string | null
  behavior: 'set_aside' | 'refill' | null
  neededThisMonth: number
  underfunded: number
  /** 0..1 */
  progress: number
  status: 'funded' | 'underfunded' | 'none'
}

/** Figures from earlier months, used by the quick-budget actions. */
export interface CategoryHistory {
  lastAssigned: number
  /** Money spent last month as a positive number (refunds count as 0). */
  lastSpent: number
  avgAssigned: number
  avgSpent: number
}

export interface BudgetCategoryRow {
  id: string
  name: string
  hidden: boolean
  assigned: number
  activity: number
  available: number
  overspent: 'cash' | 'credit' | null
  note: string | null
  target: TargetView | null
  history: CategoryHistory
}

export interface BudgetGroupRow {
  id: string
  name: string
  hidden: boolean
  assigned: number
  activity: number
  available: number
  categories: Array<BudgetCategoryRow>
}

export interface BudgetMonthView {
  month: string
  /** Free-text note for this month. */
  monthNote: string | null
  readyToAssign: number
  totals: { assigned: number; activity: number; available: number }
  groups: Array<BudgetGroupRow>
}

export const saveMonthNoteSchema = z.object({
  budgetId: z.uuid(),
  month: monthSchema,
  /** Empty clears the note. */
  note: z.string().trim().max(2000),
})
