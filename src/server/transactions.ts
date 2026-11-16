import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray, ne, sql } from 'drizzle-orm'
import { db } from '#/db'
import type { z } from 'zod'
import { accounts, payees, subtransactions, transactions } from '#/db/schema'
import type { AccountType } from '#/lib/accounts'
import { validateSplit } from '#/lib/splits'
import type { SplitLine } from '#/lib/splits'
import { resolveTransferCategories } from '#/lib/transfers'
import type { TransferSide } from '#/lib/transfers'
import type { ClearedStatus } from '#/lib/transactions'
import type { Db, DbTransaction } from '#/server/db-types'
import { findPaymentCategoryId } from '#/server/payment-categories'
import {
  bulkUpdateSchema,
  createTransactionSchema,
  deleteTransactionsSchema,
  listTransactionsSchema,
  updateTransactionSchema,
} from '#/lib/transactions'
import { requireBudgetRole } from '#/server/budget-access'
import {
  queryCategoryGroups,
  queryInflowCategoryId,
} from '#/server/categories-query'
import { findOrCreatePayee } from '#/server/payees'
import {
  queryPayees,
  querySplits,
  queryTransactions,
} from '#/server/transactions-query'

/** Everything the register needs in one round trip (one membership check). */
export const loadRegister = createServerFn({ method: 'GET' })
  .validator(listTransactionsSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'viewer')
    const [rows, splitRows, payeeRows, groups, inflowCategoryId] =
      await Promise.all([
        queryTransactions(data.budgetId, data.accountId),
        querySplits(data.budgetId, data.accountId),
        queryPayees(data.budgetId),
        queryCategoryGroups(data.budgetId),
        queryInflowCategoryId(data.budgetId),
      ])
    return {
      transactions: rows,
      splits: splitRows,
      payees: payeeRows,
      categoryGroups: groups,
      inflowCategoryId,
    }
  })

interface AccountInfo {
  id: string
  name: string
  onBudget: boolean
  type: AccountType
}

type Reader = Pick<Db, 'select'>

async function getAccount(
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

async function sideOf(
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

interface Existing {
  id: string
  cleared: ClearedStatus
  transferTransactionId: string | null
}

async function getExisting(
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

type TransactionInput = z.infer<typeof createTransactionSchema>

/** Validated split lines for a non-transfer transaction, or null if it is not split. */
function checkedSplits(
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

async function replaceSplits(
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

export const createTransaction = createServerFn({ method: 'POST' })
  .validator(createTransactionSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    await db().transaction(async (tx) => {
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
    })
  })

async function rememberPayeeCategory(
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
async function createTransfer(
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

export const updateTransaction = createServerFn({ method: 'POST' })
  .validator(updateTransactionSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    await db().transaction(async (tx) => {
      const account = await getAccount(tx, data.budgetId, data.accountId)
      const existing = await getExisting(tx, data.budgetId, data.transactionId)
      if (existing.cleared === 'reconciled' && !data.confirmReconciled) {
        throw new Error('Reconciled transactions are locked')
      }
      const mirror = existing.transferTransactionId
        ? await getExisting(tx, data.budgetId, existing.transferTransactionId)
        : null
      if (mirror?.cleared === 'reconciled' && !data.confirmReconciled) {
        throw new Error('The other side of this transfer is reconciled')
      }
      // editing keeps a reconciled transaction reconciled
      const clearedStatus: ClearedStatus =
        existing.cleared === 'reconciled' ? 'reconciled' : data.cleared

      if (data.transferAccountId) {
        if (data.transferAccountId === account.id) {
          throw new Error('Choose a different account for the transfer')
        }
        const other = await getAccount(
          tx,
          data.budgetId,
          data.transferAccountId,
        )
        // editing from the tracking side keeps the on-budget side's existing category
        const userCategory = account.onBudget
          ? data.categoryId
          : (mirror?.categoryId ?? null)
        const cats = resolveTransferCategories(
          await sideOf(tx, data.budgetId, account, data.amount),
          await sideOf(tx, data.budgetId, other, -data.amount),
          userCategory,
        )
        await tx
          .update(transactions)
          .set({
            accountId: account.id,
            date: data.date,
            amount: data.amount,
            memo: data.memo || null,
            cleared: clearedStatus,
            payeeId: null,
            categoryId: cats.a,
            transferAccountId: other.id,
          })
          .where(eq(transactions.id, existing.id))
        await replaceSplits(tx, data.budgetId, existing.id, null)
        if (mirror) {
          await tx
            .update(transactions)
            .set({
              accountId: other.id,
              date: data.date,
              amount: -data.amount,
              memo: data.memo || null,
              categoryId: cats.b,
              transferAccountId: account.id,
            })
            .where(eq(transactions.id, mirror.id))
        } else {
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
              transferTransactionId: existing.id,
            })
            .returning({ id: transactions.id })
          if (!b) throw new Error('Failed to create the transfer')
          await tx
            .update(transactions)
            .set({ transferTransactionId: b.id })
            .where(eq(transactions.id, existing.id))
        }
        return
      }

      // not a transfer (any more): drop the other side, if there was one
      if (mirror) {
        await tx.delete(transactions).where(eq(transactions.id, mirror.id))
      }
      const lines = checkedSplits(data, account)
      const categoryId = account.onBudget && !lines ? data.categoryId : null
      const payeeId = await findOrCreatePayee(tx, data.budgetId, data.payeeName)
      await tx
        .update(transactions)
        .set({
          accountId: account.id,
          date: data.date,
          amount: data.amount,
          memo: data.memo || null,
          cleared: clearedStatus,
          payeeId,
          categoryId,
          transferAccountId: null,
          transferTransactionId: null,
        })
        .where(eq(transactions.id, existing.id))
      await replaceSplits(tx, data.budgetId, existing.id, lines)
      await rememberPayeeCategory(tx, data.budgetId, payeeId, categoryId)
    })
  })

/** Deleting either side of a transfer deletes both. Reconciled transactions are locked. */
export const deleteTransactions = createServerFn({ method: 'POST' })
  .validator(deleteTransactionsSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    await db().transaction(async (tx) => {
      const rows = await tx
        .select({
          id: transactions.id,
          cleared: transactions.cleared,
          mirrorId: transactions.transferTransactionId,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.budgetId, data.budgetId),
            inArray(transactions.id, data.transactionIds),
          ),
        )
      const mirrorIds = rows.flatMap((r) => (r.mirrorId ? [r.mirrorId] : []))
      const mirrors =
        mirrorIds.length > 0
          ? await tx
              .select({ id: transactions.id, cleared: transactions.cleared })
              .from(transactions)
              .where(
                and(
                  eq(transactions.budgetId, data.budgetId),
                  inArray(transactions.id, mirrorIds),
                ),
              )
          : []
      const mirrorCleared = new Map(mirrors.map((m) => [m.id, m.cleared]))
      const toDelete = new Set<string>()
      for (const r of rows) {
        if (r.cleared === 'reconciled') continue
        if (r.mirrorId && mirrorCleared.get(r.mirrorId) === 'reconciled')
          continue
        toDelete.add(r.id)
        if (r.mirrorId) toDelete.add(r.mirrorId)
      }
      if (toDelete.size === 0) return
      await tx
        .delete(transactions)
        .where(
          and(
            eq(transactions.budgetId, data.budgetId),
            inArray(transactions.id, [...toDelete]),
          ),
        )
    })
  })

export const bulkUpdateTransactions = createServerFn({ method: 'POST' })
  .validator(bulkUpdateSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    const scope = and(
      eq(transactions.budgetId, data.budgetId),
      inArray(transactions.id, data.transactionIds),
      ne(transactions.cleared, 'reconciled'),
    )
    await db().transaction(async (tx) => {
      if (data.cleared) {
        await tx
          .update(transactions)
          .set({ cleared: data.cleared })
          .where(scope)
      }
      if (data.categoryId !== undefined) {
        // only plain (non-transfer) transactions in on-budget accounts can be categorized
        await tx
          .update(transactions)
          .set({ categoryId: data.categoryId })
          .where(
            and(
              scope,
              sql`${transactions.transferTransactionId} is null`,
              sql`not exists (select 1 from ${subtransactions} where ${subtransactions.transactionId} = ${transactions.id})`,
              sql`exists (select 1 from ${accounts} where ${accounts.id} = ${transactions.accountId} and ${accounts.onBudget})`,
            ),
          )
      }
    })
  })
