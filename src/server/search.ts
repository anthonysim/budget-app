import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { db } from '#/db'
import {
  accounts,
  categories,
  categoryGroups,
  payees,
  transactions,
} from '#/db/schema'
import { parseMoneyInput } from '#/lib/money'
import { escapeLike, searchSchema } from '#/lib/search'
import type { SearchResults } from '#/lib/search'
import { requireBudgetRole } from '#/server/budget-access'

/** Global search across transactions (payee, memo, category, amount), accounts and categories. */
export const searchBudget = createServerFn({ method: 'GET' })
  .validator(searchSchema)
  .handler(async ({ data }): Promise<SearchResults> => {
    await requireBudgetRole(data.budgetId, 'viewer')
    const pattern = `%${escapeLike(data.q)}%`
    const amount = parseMoneyInput(data.q)

    const [txns, accountRows, categoryRows] = await Promise.all([
      db()
        .select({
          id: transactions.id,
          accountId: transactions.accountId,
          accountName: accounts.name,
          date: transactions.date,
          payeeName: payees.name,
          categoryName: categories.name,
          memo: transactions.memo,
          amount: transactions.amount,
        })
        .from(transactions)
        .innerJoin(accounts, eq(accounts.id, transactions.accountId))
        .leftJoin(payees, eq(payees.id, transactions.payeeId))
        .leftJoin(categories, eq(categories.id, transactions.categoryId))
        .where(
          and(
            eq(transactions.budgetId, data.budgetId),
            or(
              ilike(payees.name, pattern),
              ilike(transactions.memo, pattern),
              ilike(categories.name, pattern),
              amount === null
                ? undefined
                : sql`abs(${transactions.amount}) = ${Math.abs(amount)}`,
            ),
          ),
        )
        .orderBy(desc(transactions.date), desc(transactions.createdAt))
        .limit(15),
      db()
        .select({ id: accounts.id, name: accounts.name })
        .from(accounts)
        .where(
          and(
            eq(accounts.budgetId, data.budgetId),
            ilike(accounts.name, pattern),
          ),
        )
        .orderBy(asc(accounts.name))
        .limit(5),
      db()
        .select({
          id: categories.id,
          name: categories.name,
          groupName: categoryGroups.name,
        })
        .from(categories)
        .innerJoin(categoryGroups, eq(categoryGroups.id, categories.groupId))
        .where(
          and(
            eq(categories.budgetId, data.budgetId),
            sql`${categories.systemKind} is null`,
            ilike(categories.name, pattern),
          ),
        )
        .orderBy(asc(categories.name))
        .limit(8),
    ])
    return {
      transactions: txns,
      accounts: accountRows,
      categories: categoryRows,
    }
  })
