import { and, eq, lte } from 'drizzle-orm'
import { db } from '#/db'
import { accounts, payees, scheduledTransactions } from '#/db/schema'
import { dueOccurrences } from '#/lib/schedule'
import type { DbTransaction } from '#/server/db-types'
import { insertTransaction } from '#/server/transaction-writes'

// Server-only (no createServerFn). Turns due scheduled transactions into real ones.

const columns = {
  id: scheduledTransactions.id,
  budgetId: scheduledTransactions.budgetId,
  accountId: scheduledTransactions.accountId,
  nextDate: scheduledTransactions.nextDate,
  frequency: scheduledTransactions.frequency,
  anchorDay: scheduledTransactions.anchorDay,
  endDate: scheduledTransactions.endDate,
  categoryId: scheduledTransactions.categoryId,
  transferAccountId: scheduledTransactions.transferAccountId,
  memo: scheduledTransactions.memo,
  amount: scheduledTransactions.amount,
  payeeName: payees.name,
}

export type ScheduledRow = Awaited<ReturnType<typeof loadScheduledRow>>

export async function loadScheduledRow(budgetId: string, scheduledId: string) {
  const [row] = await db()
    .select(columns)
    .from(scheduledTransactions)
    .leftJoin(payees, eq(payees.id, scheduledTransactions.payeeId))
    .where(
      and(
        eq(scheduledTransactions.id, scheduledId),
        eq(scheduledTransactions.budgetId, budgetId),
      ),
    )
    .limit(1)
  return row
}

type Row = NonNullable<ScheduledRow>

function asTransaction(row: Row, date: string) {
  return {
    budgetId: row.budgetId,
    accountId: row.accountId,
    date,
    payeeName: row.transferAccountId ? '' : (row.payeeName ?? ''),
    categoryId: row.categoryId,
    transferAccountId: row.transferAccountId,
    memo: row.memo,
    amount: row.amount,
    cleared: 'uncleared' as const,
  }
}

/**
 * Enters every occurrence due on or before `until` (YYYY-MM-DD) and advances each schedule.
 * Scope to one budget, or run for all (the cron job). Returns how many transactions were created.
 * A schedule that fails (for example its account was closed) is skipped, not fatal.
 */
export async function materializeDue(
  until: string,
  budgetId?: string,
): Promise<number> {
  const due = await db()
    .select(columns)
    .from(scheduledTransactions)
    .innerJoin(
      accounts,
      and(
        eq(accounts.id, scheduledTransactions.accountId),
        eq(accounts.closed, false),
      ),
    )
    .leftJoin(payees, eq(payees.id, scheduledTransactions.payeeId))
    .where(
      and(
        lte(scheduledTransactions.nextDate, until),
        budgetId ? eq(scheduledTransactions.budgetId, budgetId) : undefined,
      ),
    )

  let created = 0
  for (const row of due) {
    try {
      created += await db().transaction(async (tx) => {
        const { due: dates, nextDate } = dueOccurrences(
          row.nextDate,
          row.frequency,
          row.anchorDay,
          until,
          row.endDate,
        )
        for (const date of dates) {
          await insertTransaction(tx, asTransaction(row, date))
        }
        await advance(tx, row.id, nextDate)
        return dates.length
      })
    } catch (error) {
      console.error('scheduled transaction failed', row.id, error)
    }
  }
  return created
}

/** Moves a schedule to its next date, or removes it when finished. */
export async function advance(
  tx: DbTransaction,
  id: string,
  nextDate: string | null,
) {
  if (nextDate) {
    await tx
      .update(scheduledTransactions)
      .set({ nextDate })
      .where(eq(scheduledTransactions.id, id))
  } else {
    await tx
      .delete(scheduledTransactions)
      .where(eq(scheduledTransactions.id, id))
  }
}

export { asTransaction }
