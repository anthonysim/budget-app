import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray, ne, sql } from 'drizzle-orm'
import { db } from '#/db'
import { accounts, payees, transactions } from '#/db/schema'
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
import { queryPayees, queryTransactions } from '#/server/transactions-query'

/** Everything the register needs in one round trip (one membership check). */
export const loadRegister = createServerFn({ method: 'GET' })
  .validator(listTransactionsSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'viewer')
    const [rows, payeeRows, groups, inflowCategoryId] = await Promise.all([
      queryTransactions(data.budgetId, data.accountId),
      queryPayees(data.budgetId),
      queryCategoryGroups(data.budgetId),
      queryInflowCategoryId(data.budgetId),
    ])
    return {
      transactions: rows,
      payees: payeeRows,
      categoryGroups: groups,
      inflowCategoryId,
    }
  })

async function accountIsOnBudget(budgetId: string, accountId: string) {
  const [row] = await db()
    .select({ onBudget: accounts.onBudget })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.budgetId, budgetId)))
    .limit(1)
  if (!row) throw new Error('Not found')
  return row.onBudget
}

export const createTransaction = createServerFn({ method: 'POST' })
  .validator(createTransactionSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    const onBudget = await accountIsOnBudget(data.budgetId, data.accountId)
    // tracking accounts have no categories
    const categoryId = onBudget ? data.categoryId : null
    await db().transaction(async (tx) => {
      const payeeId = await findOrCreatePayee(tx, data.budgetId, data.payeeName)
      await tx.insert(transactions).values({
        budgetId: data.budgetId,
        accountId: data.accountId,
        date: data.date,
        amount: data.amount,
        memo: data.memo || null,
        cleared: data.cleared,
        payeeId,
        categoryId,
      })
      if (payeeId && categoryId) {
        await tx
          .update(payees)
          .set({ lastCategoryId: categoryId })
          .where(
            and(eq(payees.id, payeeId), eq(payees.budgetId, data.budgetId)),
          )
      }
    })
  })

export const updateTransaction = createServerFn({ method: 'POST' })
  .validator(updateTransactionSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    const onBudget = await accountIsOnBudget(data.budgetId, data.accountId)
    const categoryId = onBudget ? data.categoryId : null
    await db().transaction(async (tx) => {
      const payeeId = await findOrCreatePayee(tx, data.budgetId, data.payeeName)
      await tx
        .update(transactions)
        .set({
          accountId: data.accountId,
          date: data.date,
          amount: data.amount,
          memo: data.memo || null,
          cleared: data.cleared,
          payeeId,
          categoryId,
        })
        .where(
          and(
            eq(transactions.id, data.transactionId),
            eq(transactions.budgetId, data.budgetId),
            // reconciled transactions are locked
            ne(transactions.cleared, 'reconciled'),
          ),
        )
      if (payeeId && categoryId) {
        await tx
          .update(payees)
          .set({ lastCategoryId: categoryId })
          .where(
            and(eq(payees.id, payeeId), eq(payees.budgetId, data.budgetId)),
          )
      }
    })
  })

export const deleteTransactions = createServerFn({ method: 'POST' })
  .validator(deleteTransactionsSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    await db()
      .delete(transactions)
      .where(
        and(
          eq(transactions.budgetId, data.budgetId),
          inArray(transactions.id, data.transactionIds),
          ne(transactions.cleared, 'reconciled'),
        ),
      )
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
        // only transactions in on-budget accounts can be categorized
        await tx
          .update(transactions)
          .set({ categoryId: data.categoryId })
          .where(
            and(
              scope,
              sql`exists (select 1 from ${accounts} where ${accounts.id} = ${transactions.accountId} and ${accounts.onBudget})`,
            ),
          )
      }
    })
  })
