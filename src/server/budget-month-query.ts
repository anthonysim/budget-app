import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { categories, monthAssignments } from '#/db/schema'
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

/** Gathers everything the pure budget math needs for one budget. */
export async function queryBudgetMathInput(
  budgetId: string,
): Promise<BudgetMathInput> {
  // On-budget "lines" (a split parent is replaced by its lines) grouped by category, month and
  // account. Raw SQL because of the union between plain transactions and split lines.
  interface LineRow {
    category_id: string
    month: string
    account_id: string
    is_credit: boolean
    amount: number
    spend: number
    refund: number
  }
  const perAccount = async (kind: 'spending' | 'inflow') => {
    const kindFilter =
      kind === 'inflow'
        ? sql`c.system_kind = 'inflow'`
        : sql`c.system_kind is distinct from 'inflow'`
    const rows = await db().execute(sql`
      with lines as (
        select t.account_id, t.date, t.category_id, t.amount
        from transactions t
        where t.budget_id = ${budgetId}
          and not exists (select 1 from subtransactions s where s.transaction_id = t.id)
        union all
        select t.account_id, t.date, s.category_id, s.amount
        from subtransactions s
        join transactions t on t.id = s.transaction_id and t.budget_id = s.budget_id
        where s.budget_id = ${budgetId}
      )
      select l.category_id,
             to_char(l.date, 'YYYY-MM-01') as month,
             l.account_id,
             (a.type in ('credit_card', 'line_of_credit')) as is_credit,
             sum(l.amount)::float8 as amount,
             coalesce(sum(case when l.amount < 0 then l.amount else 0 end), 0)::float8 as spend,
             coalesce(sum(case when l.amount > 0 then l.amount else 0 end), 0)::float8 as refund
      from lines l
      join accounts a on a.id = l.account_id and a.on_budget
      join categories c on c.id = l.category_id
      where ${kindFilter}
      group by l.category_id, 2, l.account_id, a.type
    `)
    return [...rows] as unknown as Array<LineRow>
  }

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
    const categoryId = r.category_id
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
    if (r.is_credit) {
      entry.creditAmount += r.spend
      ;(entry.credit as Array<CreditAccountActivity>).push({
        accountId: r.account_id,
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
