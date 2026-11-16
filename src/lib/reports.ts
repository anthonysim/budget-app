import { z } from 'zod'
import { dateSchema } from '#/lib/transactions'

export const GROUP_BYS = ['category', 'group', 'payee'] as const
export type GroupBy = (typeof GROUP_BYS)[number]

export const GROUP_BY_LABELS: Record<GroupBy, string> = {
  category: 'Category',
  group: 'Category group',
  payee: 'Payee',
}

export const loadReportsSchema = z.object({
  budgetId: z.uuid(),
  /** Null = from the first transaction. */
  from: dateSchema.nullable(),
  to: dateSchema,
  /** Limit to one account; omit for the whole budget. */
  accountId: z.uuid().optional(),
  groupBy: z.enum(GROUP_BYS),
})

export interface IncomeExpenseRow {
  month: string
  income: number
  expense: number
}

export interface NetWorthRow {
  month: string
  assets: number
  liabilities: number
  net: number
}

export interface ReportsData {
  from: string
  to: string
  months: Array<string>
  spending: {
    rows: Array<{ label: string; amount: number }>
    total: number
  }
  incomeExpense: Array<IncomeExpenseRow>
  netWorth: Array<NetWorthRow>
  ageOfMoney: {
    current: number | null
    series: Array<{ month: string; days: number | null }>
  }
}
