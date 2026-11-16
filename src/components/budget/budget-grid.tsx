import { Fragment, useEffect, useState, useTransition } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  ArrowLeftRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Redo2Icon,
  Undo2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Money } from '#/components/accounts/money'
import { Button } from '#/components/ui/button'
import { AssignedCell } from '#/components/budget/assigned-cell'
import { AvailablePill } from '#/components/budget/available-pill'
import { useAssignmentHistory } from '#/components/budget/history'
import { MonthNav } from '#/components/budget/month-nav'
import { MoveMoneyDialog } from '#/components/budget/move-money-dialog'
import { RtaBanner } from '#/components/budget/rta-banner'
import { setAssignments } from '#/server/budget-month'
import type { BudgetCategoryRow, BudgetMonthView } from '#/lib/budget-month'

export function BudgetGrid({
  budget,
  view,
}: {
  budget: { id: string; currency: string; role: string }
  view: BudgetMonthView
}) {
  const router = useRouter()
  const canEdit = budget.role !== 'viewer'
  const history = useAssignmentHistory(budget.id)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [moveFrom, setMoveFrom] = useState<BudgetCategoryRow | null>(null)
  const [, startSave] = useTransition()

  const allCategories = view.groups.flatMap((g) => g.categories)
  const overspentCount = allCategories.filter(
    (c) => c.overspent === 'cash',
  ).length

  // Cmd/Ctrl+Z undo, Shift+Cmd/Ctrl+Z or Ctrl+Y redo (ignored while typing in a field)
  const { undo, redo } = history
  useEffect(() => {
    if (!canEdit) return
    function onKey(e: KeyboardEvent) {
      const t = e.target
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLSelectElement ||
        t instanceof HTMLTextAreaElement
      ) {
        return
      }
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (
        (e.key.toLowerCase() === 'z' && e.shiftKey) ||
        e.key.toLowerCase() === 'y'
      ) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canEdit, undo, redo])

  function commitAssigned(category: BudgetCategoryRow, next: number) {
    const before = [
      {
        categoryId: category.id,
        month: view.month,
        assigned: category.assigned,
      },
    ]
    const after = [{ ...before[0]!, assigned: next }]
    startSave(async () => {
      try {
        await setAssignments({ data: { budgetId: budget.id, changes: after } })
        history.record({ label: `assign ${category.name}`, before, after })
      } catch {
        toast.error('Could not save the assignment')
      }
      await router.invalidate()
    })
  }

  function onMoved(from: BudgetCategoryRow, toId: string, amount: number) {
    const to = allCategories.find((c) => c.id === toId)
    if (!to) return
    history.record({
      label: `move money from ${from.name} to ${to.name}`,
      before: [
        { categoryId: from.id, month: view.month, assigned: from.assigned },
        { categoryId: to.id, month: view.month, assigned: to.assigned },
      ],
      after: [
        {
          categoryId: from.id,
          month: view.month,
          assigned: from.assigned - amount,
        },
        {
          categoryId: to.id,
          month: view.month,
          assigned: to.assigned + amount,
        },
      ],
    })
  }

  function toggle(groupId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonthNav budgetId={budget.id} month={view.month} />
        {canEdit ? (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={!history.canUndo}
              onClick={history.undo}
              aria-label="Undo"
            >
              <Undo2Icon /> Undo
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!history.canRedo}
              onClick={history.redo}
              aria-label="Redo"
            >
              <Redo2Icon /> Redo
            </Button>
          </div>
        ) : null}
      </div>

      <RtaBanner
        readyToAssign={view.readyToAssign}
        currency={budget.currency}
        overspentCount={overspentCount}
      />

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 text-right font-medium">Assigned</th>
              <th className="px-3 py-2 text-right font-medium">Activity</th>
              <th className="px-3 py-2 text-right font-medium">Available</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {view.groups.map((g) => {
              const isCollapsed = collapsed.has(g.id)
              return (
                <Fragment key={g.id}>
                  <tr className="bg-muted/30 border-t font-medium">
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        aria-expanded={!isCollapsed}
                        aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${g.name}`}
                        onClick={() => toggle(g.id)}
                        className="flex items-center gap-1"
                      >
                        {isCollapsed ? (
                          <ChevronRightIcon className="size-4" />
                        ) : (
                          <ChevronDownIcon className="size-4" />
                        )}
                        {g.name}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Money value={g.assigned} currency={budget.currency} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Money value={g.activity} currency={budget.currency} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Money value={g.available} currency={budget.currency} />
                    </td>
                    <td />
                  </tr>
                  {isCollapsed
                    ? null
                    : g.categories.map((c) => (
                        <tr key={c.id} className="border-t">
                          <td
                            className={
                              c.hidden
                                ? 'text-muted-foreground px-3 py-1.5 pl-9 italic'
                                : 'px-3 py-1.5 pl-9'
                            }
                          >
                            {c.name}
                          </td>
                          <td className="px-3 py-1 text-right">
                            <AssignedCell
                              name={c.name}
                              assigned={c.assigned}
                              currency={budget.currency}
                              canEdit={canEdit}
                              onCommit={(next) => commitAssigned(c, next)}
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <Money
                              value={c.activity}
                              currency={budget.currency}
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <AvailablePill
                              category={c}
                              currency={budget.currency}
                            />
                          </td>
                          <td className="px-2 py-1">
                            {canEdit ? (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Move money from ${c.name}`}
                                onClick={() => setMoveFrom(c)}
                              >
                                <ArrowLeftRightIcon />
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                </Fragment>
              )
            })}
            <tr className="bg-muted/50 border-t font-semibold">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right">
                <Money
                  value={view.totals.assigned}
                  currency={budget.currency}
                />
              </td>
              <td className="px-3 py-2 text-right">
                <Money
                  value={view.totals.activity}
                  currency={budget.currency}
                />
              </td>
              <td className="px-3 py-2 text-right">
                <Money
                  value={view.totals.available}
                  currency={budget.currency}
                />
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {moveFrom ? (
        <MoveMoneyDialog
          key={moveFrom.id}
          open
          onOpenChange={(open) => {
            if (!open) setMoveFrom(null)
          }}
          budgetId={budget.id}
          month={view.month}
          from={moveFrom}
          groups={view.groups}
          onMoved={(toId, amount) => onMoved(moveFrom, toId, amount)}
        />
      ) : null}
    </div>
  )
}
