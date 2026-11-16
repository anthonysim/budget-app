import { asc, eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { accounts, transactions } from '#/db/schema'

// Server-only query helpers. Keep createServerFn out of this file: client code imports
// server-fn modules, and anything they reference at top level would reach the browser bundle.

const sum = (cond: ReturnType<typeof sql>) =>
  sql<number>`coalesce(sum(case when ${cond} then ${transactions.amount} else 0 end), 0)::float8`

/** Accounts with cleared/uncleared/working balances. Caller must have checked access. */
export function queryAccounts(budgetId: string) {
  return db()
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      onBudget: accounts.onBudget,
      closed: accounts.closed,
      sort: accounts.sort,
      note: accounts.note,
      importMapping: accounts.importMapping,
      lastReconciledAt: accounts.lastReconciledAt,
      lastReconciledBalance: accounts.lastReconciledBalance,
      clearedBalance: sum(
        sql`${transactions.cleared} in ('cleared','reconciled')`,
      ),
      unclearedBalance: sum(sql`${transactions.cleared} = 'uncleared'`),
      workingBalance: sum(sql`true`),
    })
    .from(accounts)
    .leftJoin(transactions, eq(transactions.accountId, accounts.id))
    .where(eq(accounts.budgetId, budgetId))
    .groupBy(accounts.id)
    .orderBy(asc(accounts.sort), asc(accounts.createdAt))
}

export type AccountWithBalances = Awaited<
  ReturnType<typeof queryAccounts>
>[number]
