import { useCallback, useState, useTransition } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { setAssignments } from '#/server/budget-month'

export interface AssignmentChange {
  categoryId: string
  month: string
  assigned: number
}

interface HistoryEntry {
  label: string
  /** Absolute values before the action (applied on undo). */
  before: Array<AssignmentChange>
  /** Absolute values after the action (applied on redo). */
  after: Array<AssignmentChange>
}

/** Client-side undo/redo for assignment edits. Lost on reload (by design). */
export function useAssignmentHistory(budgetId: string) {
  const router = useRouter()
  const [past, setPast] = useState<Array<HistoryEntry>>([])
  const [future, setFuture] = useState<Array<HistoryEntry>>([])
  const [pending, startTransition] = useTransition()

  const record = useCallback((entry: HistoryEntry) => {
    setPast((p) => [...p, entry])
    setFuture([])
  }, [])

  function apply(
    changes: Array<AssignmentChange>,
    done: () => void,
    message: string,
  ) {
    startTransition(async () => {
      try {
        await setAssignments({ data: { budgetId, changes } })
        await router.invalidate()
        done()
        toast(message)
      } catch {
        toast.error('Could not apply that change')
      }
    })
  }

  function undo() {
    const entry = past.at(-1)
    if (!entry || pending) return
    apply(
      entry.before,
      () => {
        setPast((p) => p.slice(0, -1))
        setFuture((f) => [...f, entry])
      },
      `Undid: ${entry.label}`,
    )
  }

  function redo() {
    const entry = future.at(-1)
    if (!entry || pending) return
    apply(
      entry.after,
      () => {
        setFuture((f) => f.slice(0, -1))
        setPast((p) => [...p, entry])
      },
      `Redid: ${entry.label}`,
    )
  }

  return {
    record,
    undo,
    redo,
    canUndo: past.length > 0 && !pending,
    canRedo: future.length > 0 && !pending,
  }
}
