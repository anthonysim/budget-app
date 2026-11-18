import type { ReactNode } from 'react'
import { ArrowLeftRightIcon, StickyNoteIcon, TargetIcon } from 'lucide-react'
import { cn } from '#/lib/utils'
import { Money } from '#/components/accounts/money'
import { Button } from '#/components/ui/button'
import { AssignedCell } from '#/components/budget/assigned-cell'
import { AvailablePill } from '#/components/budget/available-pill'
import { TargetProgress } from '#/components/budget/target-progress'
import { DragHandle, SortableRow } from '#/components/categories/sortable'
import type { BudgetCategoryRow as CategoryRow } from '#/lib/budget-month'

// Non-draggable stand-in for SortableRow (viewers, system groups).
function PlainRow({
  className,
  children,
}: {
  id: string
  className?: string
  children: ReactNode
}) {
  return <tr className={className}>{children}</tr>
}

/** One category row: name, assigned, activity, available and per-row actions. */
export function CategoryLineRow({
  category: c,
  currency,
  canEdit,
  sortable,
  onCommitAssigned,
  onSetTarget,
  onMoveMoney,
}: {
  category: CategoryRow
  currency: string
  canEdit: boolean
  /** Draggable within its group. */
  sortable: boolean
  onCommitAssigned: (category: CategoryRow, next: number) => void
  onSetTarget: (category: CategoryRow) => void
  onMoveMoney: (category: CategoryRow) => void
}) {
  const Row = sortable ? SortableRow : PlainRow
  return (
    <Row id={c.id} className="border-t">
      <td
        className={cn(
          'px-3 py-1.5',
          sortable ? 'pl-4' : 'pl-9',
          c.hidden && 'text-muted-foreground italic',
        )}
      >
        <div className="flex items-center gap-1">
          {sortable ? <DragHandle label={`Reorder ${c.name}`} /> : null}
          <div>
            {c.name}
            {c.note ? (
              <span
                className="text-muted-foreground ml-2 inline-flex items-center"
                title={c.note}
              >
                <StickyNoteIcon className="size-3.5" aria-hidden />
                <span className="sr-only">Note: {c.note}</span>
              </span>
            ) : null}
            {c.target ? (
              <TargetProgress target={c.target} currency={currency} />
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-3 py-1 text-right">
        <AssignedCell
          name={c.name}
          assigned={c.assigned}
          currency={currency}
          canEdit={canEdit}
          onCommit={(next) => onCommitAssigned(c, next)}
        />
      </td>
      <td className="px-3 py-1.5 text-right">
        <Money value={c.activity} currency={currency} />
      </td>
      <td className="px-3 py-1.5 text-right">
        <AvailablePill category={c} currency={currency} />
      </td>
      <td className="px-2 py-1">
        {canEdit ? (
          <div className="flex gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Set target for ${c.name}`}
              onClick={() => onSetTarget(c)}
            >
              <TargetIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Move money from ${c.name}`}
              onClick={() => onMoveMoney(c)}
            >
              <ArrowLeftRightIcon />
            </Button>
          </div>
        ) : null}
      </td>
    </Row>
  )
}
