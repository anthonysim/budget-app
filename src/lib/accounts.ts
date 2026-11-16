import { z } from 'zod'
import { dateSchema } from '#/lib/transactions'

export const ACCOUNT_TYPES = [
  'checking',
  'savings',
  'cash',
  'credit_card',
  'line_of_credit',
  'asset',
  'liability',
  'mortgage',
  'loan',
] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

export interface AccountTypeInfo {
  label: string
  /** On-budget accounts feed Ready to Assign; tracking accounts do not. */
  onBudget: boolean
  /** Debt accounts hold money owed: their balance is stored as a negative number. */
  debt: boolean
}

export const ACCOUNT_TYPE_INFO: Record<AccountType, AccountTypeInfo> = {
  checking: { label: 'Checking', onBudget: true, debt: false },
  savings: { label: 'Savings', onBudget: true, debt: false },
  cash: { label: 'Cash', onBudget: true, debt: false },
  credit_card: { label: 'Credit Card', onBudget: true, debt: true },
  line_of_credit: { label: 'Line of Credit', onBudget: true, debt: true },
  asset: { label: 'Other Asset (tracking)', onBudget: false, debt: false },
  liability: {
    label: 'Other Liability (tracking)',
    onBudget: false,
    debt: true,
  },
  mortgage: { label: 'Mortgage (tracking)', onBudget: false, debt: true },
  loan: { label: 'Loan (tracking)', onBudget: false, debt: true },
}

export function isOnBudgetType(type: AccountType): boolean {
  return ACCOUNT_TYPE_INFO[type].onBudget
}

/**
 * Starting balance as entered by the user -> stored signed milliunits.
 * Debt accounts: the user enters the amount owed, stored as negative.
 */
export function startingBalanceFor(type: AccountType, entered: number): number {
  return ACCOUNT_TYPE_INFO[type].debt ? -Math.abs(entered) : entered
}

export const accountNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(60, 'Name must be 60 characters or fewer')

export const createAccountSchema = z.object({
  budgetId: z.uuid(),
  name: accountNameSchema,
  type: z.enum(ACCOUNT_TYPES),
  /** Entered balance in milliunits (integer). */
  startingBalance: z.number().int().min(-1e12).max(1e12),
  /** Client's local 'YYYY-MM-DD' for the starting balance transaction. */
  startingDate: dateSchema.optional(),
})

export const updateAccountSchema = z.object({
  budgetId: z.uuid(),
  accountId: z.uuid(),
  name: accountNameSchema,
  note: z.string().trim().max(500).nullable(),
})

export const accountRefSchema = z.object({
  budgetId: z.uuid(),
  accountId: z.uuid(),
})

export const reorderAccountsSchema = z.object({
  budgetId: z.uuid(),
  accountIds: z.array(z.uuid()).min(1).max(200),
})

/**
 * Move `id` by `delta` positions among the ids in `group` (a subset of `all`, in order),
 * leaving the other ids where they are. Returns the new full order.
 */
export function moveWithinGroup(
  all: Array<string>,
  group: Array<string>,
  id: string,
  delta: -1 | 1,
): Array<string> {
  const from = group.indexOf(id)
  const to = from + delta
  const neighbor = group[to]
  if (from === -1 || neighbor === undefined) return all
  const result = [...all]
  const i = result.indexOf(id)
  const j = result.indexOf(neighbor)
  result[i] = neighbor
  result[j] = id
  return result
}
