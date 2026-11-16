import { and, asc, eq, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '#/db'
import {
  accounts,
  categories,
  payees,
  subtransactions,
  transactions,
} from '#/db/schema'
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
  /** Set when this row is one side of a transfer. */
  transferAccountId: string | null
}

/** Oldest first (date, then creation order). One account, or all accounts in the budget. */
export async function queryTransactions(
  budgetId: string,
  accountId?: string,
): Promise<Array<TransactionRow>> {
  const transferAccount = alias(accounts, 'transfer_account')
  return db()
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      accountName: accounts.name,
      date: transactions.date,
      amount: transactions.amount,
      memo: transactions.memo,
      cleared: transactions.cleared,
      payeeName: sql<
        string | null
      >`case when ${transactions.transferAccountId} is not null then 'Transfer: ' || ${transferAccount.name} else ${payees.name} end`,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      transferAccountId: transactions.transferAccountId,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(payees, eq(payees.id, transactions.payeeId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .leftJoin(
      transferAccount,
      eq(transferAccount.id, transactions.transferAccountId),
    )
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

export interface SplitRow {
  id: string
  transactionId: string
  categoryId: string | null
  categoryName: string | null
  memo: string | null
  amount: number
}

/** Split lines for the transactions of one account (or the whole budget). */
export function querySplits(
  budgetId: string,
  accountId?: string,
): Promise<Array<SplitRow>> {
  return db()
    .select({
      id: subtransactions.id,
      transactionId: subtransactions.transactionId,
      categoryId: subtransactions.categoryId,
      categoryName: categories.name,
      memo: subtransactions.memo,
      amount: subtransactions.amount,
    })
    .from(subtransactions)
    .innerJoin(transactions, eq(transactions.id, subtransactions.transactionId))
    .leftJoin(categories, eq(categories.id, subtransactions.categoryId))
    .where(
      and(
        eq(subtransactions.budgetId, budgetId),
        accountId ? eq(transactions.accountId, accountId) : undefined,
      ),
    )
    .orderBy(asc(subtransactions.sort))
}
