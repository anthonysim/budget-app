import { and, asc, eq, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '#/db'
import {
  accounts,
  categories,
  payees,
  scheduledTransactions,
} from '#/db/schema'
import type { Frequency } from '#/lib/schedule'

// Server-only query helpers (no createServerFn; see accounts-query.ts for why).

export interface ScheduledListRow {
  id: string
  accountId: string
  accountName: string
  nextDate: string
  frequency: Frequency
  endDate: string | null
  payeeName: string | null
  categoryId: string | null
  categoryName: string | null
  transferAccountId: string | null
  transferAccountName: string | null
  memo: string | null
  /** Signed amount as seen from `accountId`. */
  amount: number
}

export async function queryScheduled(
  budgetId: string,
  accountId?: string,
): Promise<Array<ScheduledListRow>> {
  const transferAccount = alias(accounts, 'transfer_account')
  return db()
    .select({
      id: scheduledTransactions.id,
      accountId: scheduledTransactions.accountId,
      accountName: accounts.name,
      nextDate: scheduledTransactions.nextDate,
      frequency: scheduledTransactions.frequency,
      endDate: scheduledTransactions.endDate,
      payeeName: payees.name,
      categoryId: scheduledTransactions.categoryId,
      categoryName: categories.name,
      transferAccountId: scheduledTransactions.transferAccountId,
      transferAccountName: transferAccount.name,
      memo: scheduledTransactions.memo,
      amount: scheduledTransactions.amount,
    })
    .from(scheduledTransactions)
    .innerJoin(accounts, eq(accounts.id, scheduledTransactions.accountId))
    .leftJoin(payees, eq(payees.id, scheduledTransactions.payeeId))
    .leftJoin(categories, eq(categories.id, scheduledTransactions.categoryId))
    .leftJoin(
      transferAccount,
      eq(transferAccount.id, scheduledTransactions.transferAccountId),
    )
    .where(
      and(
        eq(scheduledTransactions.budgetId, budgetId),
        accountId
          ? or(
              eq(scheduledTransactions.accountId, accountId),
              eq(scheduledTransactions.transferAccountId, accountId),
            )
          : undefined,
      ),
    )
    .orderBy(asc(scheduledTransactions.nextDate))
}
