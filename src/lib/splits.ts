import { z } from 'zod'

export const MAX_SPLIT_LINES = 30

export const splitLineSchema = z.object({
  /** Category for this line (null = uncategorized). */
  categoryId: z.uuid().nullable(),
  memo: z.string().trim().max(500).nullable(),
  /** Signed milliunits, same sign convention as the parent transaction. */
  amount: z.number().int().min(-1e12).max(1e12),
})

export type SplitLine = z.infer<typeof splitLineSchema>

export const splitLinesSchema = z.array(splitLineSchema).max(MAX_SPLIT_LINES)

/** How much of `total` is still unassigned to split lines (0 means fully split). */
export function splitRemaining(
  total: number,
  lines: ReadonlyArray<{ amount: number }>,
): number {
  return total - lines.reduce((sum, l) => sum + l.amount, 0)
}

/** Returns an error message, or null if the lines form a valid split of `total`. */
export function validateSplit(
  total: number,
  lines: ReadonlyArray<{ amount: number }>,
): string | null {
  if (lines.length < 2) return 'A split needs at least two lines'
  if (lines.some((l) => l.amount === 0)) return 'Split lines cannot be zero'
  const remaining = splitRemaining(total, lines)
  if (remaining !== 0)
    return 'Split lines must add up to the transaction amount'
  return null
}

/**
 * Reconciliation: what the bank says minus the app's cleared balance.
 * 0 means the account is ready to reconcile; anything else needs an adjustment.
 */
export function reconcileDifference(
  bankBalance: number,
  clearedBalance: number,
): number {
  return bankBalance - clearedBalance
}
