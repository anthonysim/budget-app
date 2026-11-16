import type { BudgetRole } from '#/lib/roles'

export interface BudgetSummary {
  id: string
  name: string
  currency: string
  role: BudgetRole
}
