import { addMonths } from '#/lib/month'
import type { MonthString } from '#/lib/month'

/**
 * Pure zero-based budgeting math. No I/O, all amounts are integer milliunits.
 *
 * Rules (YNAB-style):
 * - Available(category, month) = carried-in + assigned + activity
 * - A positive Available carries into the next month. A negative one resets to 0.
 * - Overspending is "credit" up to the amount spent on credit accounts that month, the rest is "cash".
 *   Only cash overspending reduces Ready to Assign (from the NEXT month onward).
 *   Credit overspending becomes credit-card debt (handled by credit card payment categories, PR 10).
 * - Ready to Assign(month) = income through month - assigned through month - cash overspending of earlier months
 */

export interface AssignmentInput {
  categoryId: string
  month: MonthString
  assigned: number
}

export interface ActivityInput {
  categoryId: string
  month: MonthString
  /** Net of all on-budget transactions in the category this month (outflows negative). */
  amount: number
  /** Sum of the negative amounts on credit accounts this month (<= 0). */
  creditAmount: number
}

export interface IncomeInput {
  month: MonthString
  /** Net inflow-category (Ready to Assign) transactions this month. */
  amount: number
}

export interface BudgetMathInput {
  /** All user categories (system inflow category excluded). */
  categoryIds: ReadonlyArray<string>
  assignments: ReadonlyArray<AssignmentInput>
  activity: ReadonlyArray<ActivityInput>
  income: ReadonlyArray<IncomeInput>
}

export type OverspendKind = 'cash' | 'credit' | null

export interface CategoryMonth {
  carriedIn: number
  assigned: number
  activity: number
  available: number
  overspent: OverspendKind
}

export interface BudgetMonthResult {
  month: MonthString
  readyToAssign: number
  categories: Map<string, CategoryMonth>
  totals: {
    assigned: number
    activity: number
    available: number
    /** Cash overspending in this month (reduces next month's Ready to Assign). */
    cashOverspent: number
  }
}

const key = (categoryId: string, month: MonthString) => `${categoryId}|${month}`

export function computeBudgetMonth(
  input: BudgetMathInput,
  target: MonthString,
): BudgetMonthResult {
  const assignedBy = new Map<string, number>()
  for (const a of input.assignments) {
    const k = key(a.categoryId, a.month)
    assignedBy.set(k, (assignedBy.get(k) ?? 0) + a.assigned)
  }
  const activityBy = new Map<string, { amount: number; credit: number }>()
  for (const a of input.activity) {
    const k = key(a.categoryId, a.month)
    const cur = activityBy.get(k) ?? { amount: 0, credit: 0 }
    cur.amount += a.amount
    cur.credit += a.creditAmount
    activityBy.set(k, cur)
  }
  const incomeBy = new Map<MonthString, number>()
  for (const i of input.income) {
    incomeBy.set(i.month, (incomeBy.get(i.month) ?? 0) + i.amount)
  }

  // Walk from the earliest month that has any data (or the target) up to the target.
  let start = target
  for (const m of [
    ...input.assignments.map((a) => a.month),
    ...input.activity.map((a) => a.month),
    ...input.income.map((i) => i.month),
  ]) {
    if (m < start) start = m
  }

  const carry = new Map<string, number>()
  let cumIncome = 0
  let cumAssigned = 0
  let cumCashOverBefore = 0
  let result: BudgetMonthResult | undefined

  for (let m = start; m <= target; m = addMonths(m, 1)) {
    cumIncome += incomeBy.get(m) ?? 0
    let monthAssigned = 0
    let monthActivity = 0
    let monthAvailable = 0
    let monthCashOver = 0
    const categories = new Map<string, CategoryMonth>()

    for (const id of input.categoryIds) {
      const carriedIn = carry.get(id) ?? 0
      const assigned = assignedBy.get(key(id, m)) ?? 0
      const act = activityBy.get(key(id, m))
      const activity = act?.amount ?? 0
      const creditSpend = Math.max(0, -(act?.credit ?? 0))

      const available = carriedIn + assigned + activity
      const overspent = Math.max(0, -available)
      const creditOver = Math.min(overspent, creditSpend)
      const cashOver = overspent - creditOver

      carry.set(id, Math.max(0, available))
      monthAssigned += assigned
      monthActivity += activity
      monthAvailable += available
      monthCashOver += cashOver

      categories.set(id, {
        carriedIn,
        assigned,
        activity,
        available,
        overspent: cashOver > 0 ? 'cash' : creditOver > 0 ? 'credit' : null,
      })
    }

    cumAssigned += monthAssigned
    const readyToAssign = cumIncome - cumAssigned - cumCashOverBefore
    cumCashOverBefore += monthCashOver

    result = {
      month: m,
      readyToAssign,
      categories,
      totals: {
        assigned: monthAssigned,
        activity: monthActivity,
        available: monthAvailable,
        cashOverspent: monthCashOver,
      },
    }
  }

  // The loop always runs at least once because start <= target.
  return result as BudgetMonthResult
}
