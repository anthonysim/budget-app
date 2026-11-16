export type AutoAssignAction =
  | 'underfunded'
  | 'last_assigned'
  | 'last_spent'
  | 'avg_assigned'
  | 'avg_spent'
  | 'reset'

export const AUTO_ASSIGN_LABELS: Record<AutoAssignAction, string> = {
  underfunded: 'Underfunded',
  last_assigned: 'Assigned last month',
  last_spent: 'Spent last month',
  avg_assigned: 'Average assigned (3 months)',
  avg_spent: 'Average spent (3 months)',
  reset: 'Reset assigned amounts',
}

export interface AutoAssignRow {
  id: string
  assigned: number
  underfunded: number
  lastAssigned: number
  lastSpent: number
  avgAssigned: number
  avgSpent: number
}

export interface AutoAssignChange {
  categoryId: string
  from: number
  to: number
}

/** The assignment changes an auto-assign action would make. Unchanged categories are omitted. */
export function autoAssignChanges(
  action: AutoAssignAction,
  rows: ReadonlyArray<AutoAssignRow>,
): Array<AutoAssignChange> {
  const changes: Array<AutoAssignChange> = []
  for (const r of rows) {
    let to = r.assigned
    switch (action) {
      case 'underfunded':
        // never lowers an assignment; only fills the gap
        to = r.assigned + r.underfunded
        break
      case 'last_assigned':
        to = r.lastAssigned
        break
      case 'last_spent':
        to = r.lastSpent
        break
      case 'avg_assigned':
        to = r.avgAssigned
        break
      case 'avg_spent':
        to = r.avgSpent
        break
      case 'reset':
        to = 0
        break
    }
    if (to !== r.assigned)
      changes.push({ categoryId: r.id, from: r.assigned, to })
  }
  return changes
}
