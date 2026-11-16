import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray, ne, sql } from 'drizzle-orm'
import { db } from '#/db'
import { accounts, subtransactions, transactions } from '#/db/schema'
import { resolveTransferCategories } from '#/lib/transfers'
import type { ClearedStatus } from '#/lib/transactions'
import {
  bulkUpdateSchema,
  createTransactionSchema,
  deleteTransactionsSchema,
  listTransactionsSchema,
  updateTransactionSchema,
} from '#/lib/transactions'
import { requireBudgetRole } from '#/server/budget-access'
import { queryScheduled } from '#/server/scheduled-query'
import {
  checkedSplits,
  getAccount,
  getExisting,
  insertTransaction,
  rememberPayeeCategory,
  replaceSplits,
  sideOf,
} from '#/server/transaction-writes'
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
    const [rows, splitRows, payeeRows, groups, inflowCategoryId, scheduled] =
      await Promise.all([
        queryTransactions(data.budgetId, data.accountId),
        querySplits(data.budgetId, data.accountId),
        queryPayees(data.budgetId),
        queryCategoryGroups(data.budgetId),
        queryInflowCategoryId(data.budgetId),
        queryScheduled(data.budgetId, data.accountId),
      ])
    return {
      transactions: rows,
      splits: splitRows,
      payees: payeeRows,
      categoryGroups: groups,
      inflowCategoryId,
      scheduled,
    }
  })

export const createTransaction = createServerFn({ method: 'POST' })
  .validator(createTransactionSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    await db().transaction((tx) => insertTransaction(tx, data))
  })

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
