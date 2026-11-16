export type BudgetRole = 'owner' | 'editor' | 'viewer'

const RANK: Record<BudgetRole, number> = { viewer: 0, editor: 1, owner: 2 }

/** True if `role` is at least `min` (owner > editor > viewer). */
export function hasRole(role: BudgetRole, min: BudgetRole): boolean {
  return RANK[role] >= RANK[min]
}
