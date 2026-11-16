import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import {
  accounts,
  categories,
  monthAssignments,
  transactions,
} from '#/db/schema'
import { computeBudgetMonth } from '#/domain/budget-math'
import type {
  ActivityInput,
  BudgetMathInput,
  CreditAccountActivity,
} from '#/domain/budget-math'
import type {
  BudgetCategoryRow,
  BudgetGroupRow,
  BudgetMonthView,
} from '#/lib/budget-month'
import { queryCategoryGroups } from '#/server/categories-query'

// Server-only query helpers (no createServerFn; see accounts-query.ts for why).

const monthOf = sql<string>`to_char(${transactions.date}, 'YYYY-MM-01')`

const CREDIT_TYPES = sql`('credit_card','line_of_credit')`

/** Gathers everything the pure budget math needs for one budget. */
export async function queryBudgetMathInput(
  budgetId: string,
): Promise<BudgetMathInput> {
  // On-budget transactions grouped by category, month and account.
  const perAccount = (kind: 'spending' | 'inflow') =>
    db()
      .select({
        categoryId: transactions.categoryId,
        month: monthOf.as('month'),
        accountId: transactions.accountId,
        isCredit: sql<boolean>`${accounts.type} in ${CREDIT_TYPES}`.as(
          'is_credit',
        ),
        amount: sql<number>`sum(${transactions.amount})::float8`.as('amount'),
        spend:
          sql<number>`coalesce(sum(case when ${transactions.amount} < 0 then ${transactions.amount} else 0 end), 0)::float8`.as(
            'spend',
          ),
        refund:
          sql<number>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.amount} else 0 end), 0)::float8`.as(
            'refund',
          ),
      })
      .from(transactions)
      .innerJoin(
        accounts,
        and(
          eq(accounts.id, transactions.accountId),
          eq(accounts.onBudget, true),
        ),
      )
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(
        and(
          eq(transactions.budgetId, budgetId),
          kind === 'inflow'
            ? eq(categories.systemKind, 'inflow')
            : sql`${categories.systemKind} is distinct from 'inflow'`,
        ),
      )
      .groupBy(
        transactions.categoryId,
        monthOf,
        transactions.accountId,
        accounts.type,
      )

  const [cats, assignments, spendingRows, incomeRows] = await Promise.all([
    db()
      .select({
        id: categories.id,
        systemKind: categories.systemKind,
        linkedAccountId: categories.linkedAccountId,
      })
      .from(categories)
      .where(
        and(
          eq(categories.budgetId, budgetId),
          sql`${categories.systemKind} is distinct from 'inflow'`,
        ),
      )
      .orderBy(asc(categories.createdAt)),
    db()
      .select({
        categoryId: monthAssignments.categoryId,
        month: monthAssignments.month,
        assigned: monthAssignments.assigned,
      })
      .from(monthAssignments)
      .where(eq(monthAssignments.budgetId, budgetId)),
    perAccount('spending'),
    perAccount('inflow'),
  ])

  // fold the per-account rows into one ActivityInput per category-month
  const byKey = new Map<string, ActivityInput>()
  for (const r of spendingRows) {
    const categoryId = r.categoryId as string
    const k = `${categoryId}|${r.month}`
    let entry = byKey.get(k)
    if (!entry) {
      entry = {
        categoryId,
        month: r.month,
        amount: 0,
        creditAmount: 0,
        credit: [],
      }
      byKey.set(k, entry)
    }
    entry.amount += r.amount
    if (r.isCredit) {
      entry.creditAmount += r.spend
      ;(entry.credit as Array<CreditAccountActivity>).push({
        accountId: r.accountId,
        spend: r.spend,
        refund: r.refund,
      })
    }
  }

  return {
    categoryIds: cats.map((c) => c.id),
    paymentCategories: cats
      .filter((c) => c.systemKind === 'cc_payment' && c.linkedAccountId)
      .map((c) => ({
        categoryId: c.id,
        accountId: c.linkedAccountId as string,
      })),
    assignments,
    activity: [...byKey.values()],
    income: incomeRows.map((i) => ({ month: i.month, amount: i.amount })),
  }
}

/** Budget screen data for one month: Ready to Assign plus groups with per-category numbers. */
export async function queryBudgetMonth(
  budgetId: string,
  month: string,
): Promise<BudgetMonthView> {
  const [input, groups] = await Promise.all([
    queryBudgetMathInput(budgetId),
    queryCategoryGroups(budgetId, { includeCreditCardPayments: true }),
  ])
  const result = computeBudgetMonth(input, month)

  const rows: Array<BudgetGroupRow> = []
  for (const g of groups) {
    const cats: Array<BudgetCategoryRow> = []
    for (const c of g.categories) {
      const m = result.categories.get(c.id)
      const row: BudgetCategoryRow = {
        id: c.id,
        name: c.name,
        hidden: c.hidden || g.hidden,
        assigned: m?.assigned ?? 0,
        activity: m?.activity ?? 0,
        available: m?.available ?? 0,
        overspent: m?.overspent ?? null,
      }
      // hidden categories only show while they still hold or move money
      const quiet =
        row.assigned === 0 && row.activity === 0 && row.available === 0
      if (row.hidden && quiet) continue
      cats.push(row)
    }
    if (cats.length === 0 && g.hidden) continue
    rows.push({
      id: g.id,
      name: g.name,
      hidden: g.hidden,
      assigned: cats.reduce((s, c) => s + c.assigned, 0),
      activity: cats.reduce((s, c) => s + c.activity, 0),
      available: cats.reduce((s, c) => s + c.available, 0),
      categories: cats,
    })
  }

  return {
    month,
    readyToAssign: result.readyToAssign,
    totals: {
      assigned: result.totals.assigned,
      activity: result.totals.activity,
      available: result.totals.available,
    },
    groups: rows,
  }
}
