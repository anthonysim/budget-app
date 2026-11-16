import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import { db } from '#/db'
import { scheduledTransactions } from '#/db/schema'
import { budgetIdSchema } from '#/lib/budget-schemas'
import {
  createScheduledSchema,
  dayOfMonth,
  nextOccurrence,
  scheduledRefSchema,
  updateScheduledSchema,
} from '#/lib/schedule'
import { requireBudgetRole } from '#/server/budget-access'
import {
  queryCategoryGroups,
  queryInflowCategoryId,
} from '#/server/categories-query'
import { findOrCreatePayee } from '#/server/payees'
import {
  advance,
  asTransaction,
  loadScheduledRow,
} from '#/server/scheduled-materialize'
import { queryScheduled } from '#/server/scheduled-query'
import { getAccount, insertTransaction } from '#/server/transaction-writes'
import { queryPayees } from '#/server/transactions-query'

/** Everything the Scheduled page needs in one round trip. */
export const loadScheduledPage = createServerFn({ method: 'GET' })
  .validator(budgetIdSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'viewer')
    const [scheduled, payees, categoryGroups, inflowCategoryId] =
      await Promise.all([
        queryScheduled(data.budgetId),
        queryPayees(data.budgetId),
        queryCategoryGroups(data.budgetId),
        queryInflowCategoryId(data.budgetId),
      ])
    return { scheduled, payees, categoryGroups, inflowCategoryId }
  })

export const createScheduled = createServerFn({ method: 'POST' })
  .validator(createScheduledSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    await db().transaction(async (tx) => {
      const account = await getAccount(tx, data.budgetId, data.accountId)
      const payeeId = data.transferAccountId
        ? null
        : await findOrCreatePayee(tx, data.budgetId, data.payeeName)
      await tx.insert(scheduledTransactions).values({
        budgetId: data.budgetId,
        accountId: account.id,
        nextDate: data.date,
        frequency: data.frequency,
        anchorDay: dayOfMonth(data.date),
        endDate: data.endDate,
        payeeId,
        categoryId: account.onBudget ? data.categoryId : null,
        transferAccountId: data.transferAccountId,
        memo: data.memo || null,
        amount: data.amount,
      })
    })
  })

export const updateScheduled = createServerFn({ method: 'POST' })
  .validator(updateScheduledSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    await db().transaction(async (tx) => {
      const account = await getAccount(tx, data.budgetId, data.accountId)
      const payeeId = data.transferAccountId
        ? null
        : await findOrCreatePayee(tx, data.budgetId, data.payeeName)
      await tx
        .update(scheduledTransactions)
        .set({
          accountId: account.id,
          nextDate: data.date,
          frequency: data.frequency,
          anchorDay: dayOfMonth(data.date),
          endDate: data.endDate,
          payeeId,
          categoryId: account.onBudget ? data.categoryId : null,
          transferAccountId: data.transferAccountId,
          memo: data.memo || null,
          amount: data.amount,
        })
        .where(
          and(
            eq(scheduledTransactions.id, data.scheduledId),
            eq(scheduledTransactions.budgetId, data.budgetId),
          ),
        )
    })
  })

export const deleteScheduled = createServerFn({ method: 'POST' })
  .validator(scheduledRefSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    await db()
      .delete(scheduledTransactions)
      .where(
        and(
          eq(scheduledTransactions.id, data.scheduledId),
          eq(scheduledTransactions.budgetId, data.budgetId),
        ),
      )
  })

/** Enters the next occurrence now (even if it is in the future) and advances the schedule. */
export const enterScheduledNow = createServerFn({ method: 'POST' })
  .validator(scheduledRefSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    const row = await loadScheduledRow(data.budgetId, data.scheduledId)
    if (!row) throw new Error('Not found')
    await db().transaction(async (tx) => {
      await insertTransaction(tx, asTransaction(row, row.nextDate))
      await advance(
        tx,
        row.id,
        nextOccurrence(row.nextDate, row.frequency, row.anchorDay),
      )
    })
  })

/** Skips the next occurrence without entering a transaction. */
export const skipScheduled = createServerFn({ method: 'POST' })
  .validator(scheduledRefSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    const row = await loadScheduledRow(data.budgetId, data.scheduledId)
    if (!row) throw new Error('Not found')
    await db().transaction(async (tx) => {
      await advance(
        tx,
        row.id,
        nextOccurrence(row.nextDate, row.frequency, row.anchorDay),
      )
    })
  })
