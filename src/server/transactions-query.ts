import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { accounts, categories, payees, transactions } from '#/db/schema'
import type { ClearedStatus } from '#/lib/transactions'

// Server-only query helpers (no createServerFn; see accounts-query.ts for why).

export interface TransactionRow {
  id: string
  accountId: string
  accountName: string
  date: string
  amount: number
  memo: string | null
  cleared: ClearedStatus
  payeeName: string | null
  categoryId: string | null
  categoryName: string | null
}

/** Oldest first (date, then creation order). One account, or all accounts in the budget. */
export async function queryTransactions(
  budgetId: string,
  accountId?: string,
): Promise<Array<TransactionRow>> {
  return db()
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      accountName: accounts.name,
      date: transactions.date,
      amount: transactions.amount,
      memo: transactions.memo,
      cleared: transactions.cleared,
      payeeName: payees.name,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(payees, eq(payees.id, transactions.payeeId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.budgetId, budgetId),
        accountId ? eq(transactions.accountId, accountId) : undefined,
      ),
    )
    .orderBy(asc(transactions.date), asc(transactions.createdAt))
}

export interface PayeeRow {
  id: string
  name: string
  lastCategoryId: string | null
}

export function queryPayees(budgetId: string): Promise<Array<PayeeRow>> {
  return db()
    .select({
      id: payees.id,
      name: payees.name,
      lastCategoryId: payees.lastCategoryId,
    })
    .from(payees)
    .where(
      and(
        eq(payees.budgetId, budgetId),
        sql`lower(${payees.name}) <> 'starting balance'`,
      ),
    )
    .orderBy(asc(payees.name))
}
