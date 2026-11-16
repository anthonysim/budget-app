import type { AccountType } from '#/lib/accounts'

export const TRANSFER_PREFIX = 'Transfer: '

export function transferLabel(accountName: string): string {
  return `${TRANSFER_PREFIX}${accountName}`
}

/** If `text` is exactly a transfer label for one of `accounts`, returns that account id. */
export function parseTransferPayee(
  text: string,
  accounts: ReadonlyArray<{ id: string; name: string }>,
): string | null {
  const t = text.trim().toLowerCase()
  if (!t.startsWith(TRANSFER_PREFIX.toLowerCase())) return null
  const match = accounts.find((a) => transferLabel(a.name).toLowerCase() === t)
  return match?.id ?? null
}

export interface TransferSide {
  onBudget: boolean
  type: AccountType
  /** Signed amount on this side of the transfer. */
  amount: number
  /** This side's credit card payment category, if it is a credit card with one. */
  paymentCategoryId: string | null
}

/**
 * Categories for both sides of a transfer.
 * - on-budget <-> on-budget: budget-neutral, except paying a credit card: the paying side is
 *   categorized as that card's payment category
 * - on-budget <-> tracking: the on-budget side is a real spend/income (user's category)
 * - tracking <-> tracking: no categories
 */
export function resolveTransferCategories(
  a: TransferSide,
  b: TransferSide,
  /** Category for the on-budget side of an on-budget <-> tracking transfer. */
  userCategoryId: string | null,
): { a: string | null; b: string | null } {
  if (a.onBudget && b.onBudget) {
    const pays = (payer: TransferSide, card: TransferSide) =>
      payer.amount < 0 && card.type === 'credit_card' && card.amount > 0
        ? card.paymentCategoryId
        : null
    return { a: pays(a, b), b: pays(b, a) }
  }
  if (a.onBudget) return { a: userCategoryId, b: null }
  if (b.onBudget) return { a: null, b: userCategoryId }
  return { a: null, b: null }
}
