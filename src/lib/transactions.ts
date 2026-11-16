import { z } from 'zod'
import { splitLinesSchema } from '#/lib/splits'

export const FLAGS = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
] as const
export type Flag = (typeof FLAGS)[number]

export const FLAG_COLORS: Record<Flag, string> = {
  red: '#d03b3b',
  orange: '#ec835a',
  yellow: '#fab219',
  green: '#0ca30c',
  blue: '#3987e5',
  purple: '#9085e9',
}

export const CLEARED_STATUSES = ['uncleared', 'cleared', 'reconciled'] as const
export type ClearedStatus = (typeof CLEARED_STATUSES)[number]

/** Dates are plain 'YYYY-MM-DD' strings (no timezone). */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
  }, 'Enter a valid date')

export const payeeNameSchema = z.string().trim().max(80)

const base = {
  budgetId: z.uuid(),
  accountId: z.uuid(),
  date: dateSchema,
  /** Payee name; created on the fly if it does not exist. Empty = no payee. */
  payeeName: payeeNameSchema,
  categoryId: z.uuid().nullable(),
  /** Set to make this a transfer to/from another account (payeeName is then ignored). */
  transferAccountId: z.uuid().nullable(),
  memo: z.string().trim().max(500).nullable(),
  /** Split lines (2+). When set the parent has no category of its own. */
  splits: splitLinesSchema.optional(),
  /** Signed milliunits: inflow positive, outflow negative. */
  amount: z.number().int().min(-1e12).max(1e12),
  cleared: z.enum(['uncleared', 'cleared']),
}

export const createTransactionSchema = z.object(base)

export const updateTransactionSchema = z.object({
  ...base,
  transactionId: z.uuid(),
  /** Required to edit a reconciled transaction (the UI asks the user to confirm). */
  confirmReconciled: z.boolean().optional(),
})

export const listTransactionsSchema = z.object({
  budgetId: z.uuid(),
  accountId: z.uuid().optional(),
})

export const deleteTransactionsSchema = z.object({
  budgetId: z.uuid(),
  transactionIds: z.array(z.uuid()).min(1).max(500),
})

export const bulkUpdateSchema = z
  .object({
    budgetId: z.uuid(),
    transactionIds: z.array(z.uuid()).min(1).max(500),
    categoryId: z.uuid().nullable().optional(),
    cleared: z.enum(['uncleared', 'cleared']).optional(),
  })
  .refine((v) => v.categoryId !== undefined || v.cleared !== undefined, {
    message: 'Nothing to update',
  })

export interface RegisterRow {
  id: string
  accountId: string
  date: string
  amount: number
  memo: string | null
  cleared: ClearedStatus
  payeeId: string | null
  categoryId: string | null
  transferAccountId: string | null
  flag: Flag | null
}

/** Amount split into the two register columns. Zero shows as an empty outflow. */
export function splitAmount(amount: number): {
  outflow: number
  inflow: number
} {
  return amount < 0
    ? { outflow: -amount, inflow: 0 }
    : { outflow: 0, inflow: amount }
}

/** Outflow/inflow user input -> signed milliunits (inflow wins if both are set). */
export function combineAmount(outflow: number, inflow: number): number {
  return inflow - outflow
}

/**
 * Running balance after each transaction. Rows must be sorted oldest first
 * (date, then creation order). Returns a Map keyed by transaction id.
 */
export function runningBalances(
  rowsOldestFirst: ReadonlyArray<{ id: string; amount: number }>,
): Map<string, number> {
  const result = new Map<string, number>()
  let total = 0
  for (const row of rowsOldestFirst) {
    total += row.amount
    result.set(row.id, total)
  }
  return result
}

export function matchesSearch(
  query: string,
  fields: ReadonlyArray<string | null | undefined>,
): boolean {
  const q = query.trim().toLowerCase()
  if (q === '') return true
  return fields.some((f) => f?.toLowerCase().includes(q))
}

export const setFlagSchema = z.object({
  budgetId: z.uuid(),
  transactionIds: z.array(z.uuid()).min(1).max(500),
  /** null clears the flag */
  flag: z.enum(FLAGS).nullable(),
})
