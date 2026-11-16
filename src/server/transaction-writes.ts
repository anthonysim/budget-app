import { and, eq } from 'drizzle-orm'
import type { z } from 'zod'
import { accounts, payees, subtransactions, transactions } from '#/db/schema'
import type { AccountType } from '#/lib/accounts'
import { validateSplit } from '#/lib/splits'
import type { SplitLine } from '#/lib/splits'
import type { ClearedStatus, createTransactionSchema } from '#/lib/transactions'
import { resolveTransferCategories } from '#/lib/transfers'
import type { TransferSide } from '#/lib/transfers'
import type { Db, DbTransaction } from '#/server/db-types'
import { findOrCreatePayee } from '#/server/payees'
import { findPaymentCategoryId } from '#/server/payment-categories'

// Server-only write helpers shared by transactions and scheduled transactions
// (no createServerFn and no db() calls here: callers pass in a transaction).

export interface AccountInfo {
  id: string
  name: string
  onBudget: boolean
  type: AccountType
}

export type Reader = Pick<Db, 'select'>

export async function getAccount(
  tx: Reader,
  budgetId: string,
  accountId: string,
): Promise<AccountInfo> {
  const [row] = await tx
    .select({
      id: accounts.id,
      name: accounts.name,
      onBudget: accounts.onBudget,
      type: accounts.type,
    })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.budgetId, budgetId)))
    .limit(1)
  if (!row) throw new Error('Not found')
  return row
}

export async function sideOf(
  tx: Reader,
  budgetId: string,
  account: AccountInfo,
  amount: number,
): Promise<TransferSide> {
  return {
    onBudget: account.onBudget,
    type: account.type,
    amount,
    paymentCategoryId:
      account.type === 'credit_card'
        ? await findPaymentCategoryId(tx, budgetId, account.id)
        : null,
  }
}

export interface Existing {
  id: string
  cleared: ClearedStatus
  transferTransactionId: string | null
}

export async function getExisting(
  tx: Reader,
  budgetId: string,
  id: string,
): Promise<Existing & { categoryId: string | null }> {
  const [row] = await tx
    .select({
      id: transactions.id,
      cleared: transactions.cleared,
      transferTransactionId: transactions.transferTransactionId,
      categoryId: transactions.categoryId,
    })
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.budgetId, budgetId)))
    .limit(1)
  if (!row) throw new Error('Not found')
  return row
}

export type TransactionInput = z.infer<typeof createTransactionSchema>

/** Validated split lines for a non-transfer transaction, or null if it is not split. */
export function checkedSplits(
  data: {
    splits?: Array<SplitLine>
    amount: number
    transferAccountId: string | null
  },
  account: AccountInfo,
): Array<SplitLine> | null {
  if (!data.splits || data.splits.length === 0) return null
  if (data.transferAccountId) throw new Error('Transfers cannot be split')
  if (!account.onBudget) {
    throw new Error('Tracking accounts cannot have split transactions')
  }
  const error = validateSplit(data.amount, data.splits)
  if (error) throw new Error(error)
  return data.splits
}

export async function replaceSplits(
  tx: DbTransaction,
  budgetId: string,
  transactionId: string,
  lines: Array<SplitLine> | null,
) {
  await tx
    .delete(subtransactions)
    .where(
      and(
        eq(subtransactions.budgetId, budgetId),
        eq(subtransactions.transactionId, transactionId),
      ),
    )
  if (!lines) return
  await tx.insert(subtransactions).values(
    lines.map((l, i) => ({
      budgetId,
      transactionId,
      categoryId: l.categoryId,
      memo: l.memo || null,
      amount: l.amount,
      sort: i,
    })),
  )
}

export async function rememberPayeeCategory(
  tx: Pick<Db, 'update'>,
  budgetId: string,
  payeeId: string | null,
  categoryId: string | null,
) {
  if (!payeeId || !categoryId) return
  await tx
    .update(payees)
    .set({ lastCategoryId: categoryId })
    .where(and(eq(payees.id, payeeId), eq(payees.budgetId, budgetId)))
}

/** Inserts both sides of a transfer and links them. */
export async function createTransfer(
  tx: DbTransaction,
  data: TransactionInput,
  account: AccountInfo,
  otherAccountId: string,
) {
  if (otherAccountId === account.id) {
    throw new Error('Choose a different account for the transfer')
  }
  const other = await getAccount(tx, data.budgetId, otherAccountId)
  const cats = resolveTransferCategories(
    await sideOf(tx, data.budgetId, account, data.amount),
    await sideOf(tx, data.budgetId, other, -data.amount),
    data.categoryId,
  )
  const [a] = await tx
    .insert(transactions)
    .values({
      budgetId: data.budgetId,
      accountId: account.id,
      date: data.date,
      amount: data.amount,
      memo: data.memo || null,
      cleared: data.cleared,
      categoryId: cats.a,
      transferAccountId: other.id,
    })
    .returning({ id: transactions.id })
  if (!a) throw new Error('Failed to create the transfer')
  const [b] = await tx
    .insert(transactions)
    .values({
      budgetId: data.budgetId,
      accountId: other.id,
      date: data.date,
      amount: -data.amount,
      memo: data.memo || null,
      cleared: 'uncleared',
      categoryId: cats.b,
      transferAccountId: account.id,
      transferTransactionId: a.id,
    })
    .returning({ id: transactions.id })
  if (!b) throw new Error('Failed to create the transfer')
  await tx
    .update(transactions)
    .set({ transferTransactionId: b.id })
    .where(eq(transactions.id, a.id))
}

/** Inserts one transaction (or both sides of a transfer). Caller has checked permissions. */
export async function insertTransaction(
  tx: DbTransaction,
  data: TransactionInput,
) {
  const account = await getAccount(tx, data.budgetId, data.accountId)

  if (data.transferAccountId) {
    await createTransfer(tx, data, account, data.transferAccountId)
    return
  }

  const lines = checkedSplits(data, account)
  // tracking accounts have no categories; split parents carry no category
  const categoryId = account.onBudget && !lines ? data.categoryId : null
  const payeeId = await findOrCreatePayee(tx, data.budgetId, data.payeeName)
  const [created] = await tx
    .insert(transactions)
    .values({
      budgetId: data.budgetId,
      accountId: data.accountId,
      date: data.date,
      amount: data.amount,
      memo: data.memo || null,
      cleared: data.cleared,
      payeeId,
      categoryId,
    })
    .returning({ id: transactions.id })
  if (created && lines) {
    await replaceSplits(tx, data.budgetId, created.id, lines)
  }
  await rememberPayeeCategory(tx, data.budgetId, payeeId, categoryId)
}
