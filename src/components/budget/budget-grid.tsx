import { Fragment, useEffect, useState, useTransition } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  ArrowLeftRightIcon,
  ChevronsUpDownIcon,
  TargetIcon,
  WandSparklesIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  Redo2Icon,
  StickyNoteIcon,
  Undo2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Money } from '#/components/accounts/money'
import { Button } from '#/components/ui/button'
import { AssignedCell } from '#/components/budget/assigned-cell'
import { AvailablePill } from '#/components/budget/available-pill'
import { useAssignmentHistory } from '#/components/budget/history'
import { MonthNav } from '#/components/budget/month-nav'
import { TargetDialog } from '#/components/budget/target-dialog'
import { TargetProgress } from '#/components/budget/target-progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { AUTO_ASSIGN_LABELS, autoAssignChanges } from '#/lib/auto-assign'
import type { AutoAssignAction } from '#/lib/auto-assign'
import { MonthNote } from '#/components/budget/month-note'
import { MoveMoneyDialog } from '#/components/budget/move-money-dialog'
import { RtaBanner } from '#/components/budget/rta-banner'
import { NameDialog } from '#/components/categories/name-dialog'
import { setAssignments } from '#/server/budget-month'
import { createCategory } from '#/server/categories'
import type {
  BudgetCategoryRow,
  BudgetGroupRow,
  BudgetMonthView,
} from '#/lib/budget-month'

// System-managed group; the server rejects new categories in it.
const PAYMENT_GROUP_NAME = 'Credit Card Payments'

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
  const [targetFor, setTargetFor] = useState<BudgetCategoryRow | null>(null)
  const [addTo, setAddTo] = useState<BudgetGroupRow | null>(null)
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

  function runAutoAssign(action: AutoAssignAction) {
    const rows = allCategories
      .filter((c) => !c.hidden)
      .map((c) => ({
        id: c.id,
        assigned: c.assigned,
        underfunded: c.target?.underfunded ?? 0,
        ...c.history,
      }))
    const changes = autoAssignChanges(action, rows)
    if (changes.length === 0) {
      toast('Nothing to change')
      return
    }
    const before = changes.map((c) => ({
      categoryId: c.categoryId,
      month: view.month,
      assigned: c.from,
    }))
    const after = changes.map((c) => ({
      categoryId: c.categoryId,
      month: view.month,
      assigned: c.to,
    }))
    startSave(async () => {
      try {
        await setAssignments({ data: { budgetId: budget.id, changes: after } })
        history.record({
          label: AUTO_ASSIGN_LABELS[action].toLowerCase(),
          before,
          after,
        })
        toast.success(
          `Updated ${changes.length} categor${changes.length === 1 ? 'y' : 'ies'}`,
        )
      } catch {
        toast.error('Could not apply that')
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
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Pinned header tile; the table tile below scrolls on its own. */}
      <div className="bg-background flex shrink-0 flex-col gap-3 rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <MonthNav budgetId={budget.id} month={view.month} />
          <RtaBanner
            readyToAssign={view.readyToAssign}
            currency={budget.currency}
            overspentCount={overspentCount}
          />
          {canEdit ? (
            <div className="ml-auto flex gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <WandSparklesIcon /> Auto-assign <ChevronsUpDownIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(
                    Object.keys(AUTO_ASSIGN_LABELS) as Array<AutoAssignAction>
                  ).map((action) => (
                    <DropdownMenuItem
                      key={action}
                      onSelect={() => runAutoAssign(action)}
                    >
                      {AUTO_ASSIGN_LABELS[action]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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

        <div className="-mt-1">
          <MonthNote
            budgetId={budget.id}
            month={view.month}
            note={view.monthNote}
            canEdit={canEdit}
          />
        </div>
      </div>

      <div className="bg-background min-h-0 flex-1 overflow-auto overscroll-contain rounded-xl border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground sticky top-0 z-10 text-left">
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
                  <tr className="bg-muted/70 border-t font-medium">
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
                    <td className="px-2 py-1">
                      {canEdit && g.name !== PAYMENT_GROUP_NAME ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Add category to ${g.name}`}
                          onClick={() => setAddTo(g)}
                        >
                          <PlusIcon />
                        </Button>
                      ) : null}
                    </td>
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
                            {c.note ? (
                              <span
                                className="text-muted-foreground ml-2 inline-flex items-center"
                                title={c.note}
                              >
                                <StickyNoteIcon
                                  className="size-3.5"
                                  aria-hidden
                                />
                                <span className="sr-only">Note: {c.note}</span>
                              </span>
                            ) : null}
                            {c.target ? (
                              <TargetProgress
                                target={c.target}
                                currency={budget.currency}
                              />
                            ) : null}
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
                              <div className="flex gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Set target for ${c.name}`}
                                  onClick={() => setTargetFor(c)}
                                >
                                  <TargetIcon />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Move money from ${c.name}`}
                                  onClick={() => setMoveFrom(c)}
                                >
                                  <ArrowLeftRightIcon />
                                </Button>
                              </div>
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

      {targetFor ? (
        <TargetDialog
          key={targetFor.id}
          open
          onOpenChange={(open) => {
            if (!open) setTargetFor(null)
          }}
          budgetId={budget.id}
          category={targetFor}
          isPaymentCategory={view.groups.some(
            (g) =>
              g.name === 'Credit Card Payments' &&
              g.categories.some((c) => c.id === targetFor.id),
          )}
        />
      ) : null}

      {addTo ? (
        <NameDialog
          key={addTo.id}
          open
          onOpenChange={(open) => {
            if (!open) setAddTo(null)
          }}
          title={`Add category to ${addTo.name}`}
          label="Category name"
          submitLabel="Add category"
          onSubmit={async (name) => {
            await createCategory({
              data: { budgetId: budget.id, groupId: addTo.id, name },
            })
            await router.invalidate()
            toast.success('Category added')
          }}
        />
      ) : null}

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
