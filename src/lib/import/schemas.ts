import { z } from 'zod'
import { dateSchema } from '#/lib/transactions'
import { DATE_FORMATS } from '#/lib/import/map'

export const MAX_IMPORT_ROWS = 5000

export const importRowSchema = z.object({
  date: dateSchema,
  payee: z.string().max(200),
  memo: z.string().max(500),
  amount: z.number().int().min(-1e12).max(1e12),
  fitId: z.string().max(100).nullable(),
})

const column = z.number().int().min(0).max(200).nullable()

export const csvMappingSchema = z.object({
  hasHeader: z.boolean(),
  dateColumn: z.number().int().min(0).max(200),
  dateFormat: z.enum(DATE_FORMATS),
  payeeColumn: column,
  memoColumn: column,
  amountMode: z.enum(['single', 'split']),
  amountColumn: column,
  outflowColumn: column,
  inflowColumn: column,
  invertSign: z.boolean(),
})

export const importTransactionsSchema = z.object({
  budgetId: z.uuid(),
  accountId: z.uuid(),
  rows: z.array(importRowSchema).min(1).max(MAX_IMPORT_ROWS),
  /** Count what would happen without writing anything. */
  dryRun: z.boolean(),
  /** CSV mapping to remember for this account. */
  saveMapping: csvMappingSchema.nullable(),
})

export const approveTransactionsSchema = z
  .object({
    budgetId: z.uuid(),
    transactionIds: z.array(z.uuid()).min(1).max(500).optional(),
    /** Approve everything unapproved in this account. */
    accountId: z.uuid().optional(),
  })
  .refine((v) => v.transactionIds !== undefined || v.accountId !== undefined, {
    message: 'Choose transactions or an account',
  })

export const MATCH_TYPES = ['contains', 'starts_with', 'equals'] as const

export const payeeRuleSchema = z.object({
  budgetId: z.uuid(),
  matchType: z.enum(MATCH_TYPES),
  pattern: z.string().trim().min(1, 'Enter text to match').max(100),
  payeeName: z.string().trim().min(1, 'Enter a payee name').max(80),
  categoryId: z.uuid().nullable(),
})

export const updatePayeeRuleSchema = payeeRuleSchema.extend({
  ruleId: z.uuid(),
})
export const payeeRuleRefSchema = z.object({
  budgetId: z.uuid(),
  ruleId: z.uuid(),
})

export interface ImportResult {
  total: number
  duplicates: number
  matched: number
  created: number
}
