import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/register/native-select'

interface DeletableCategory {
  id: string
  name: string
  transactionCount: number
}

interface ReassignGroup {
  id: string
  name: string
  categories: Array<{ id: string; name: string }>
}

/**
 * Delete confirmation. If the category has transactions, asks where to move them
 * (or leave them uncategorized).
 */
export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
  groups,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: DeletableCategory
  groups: Array<ReassignGroup>
  /** reassignTo: category id to move transactions to, or undefined to leave them uncategorized. */
  onConfirm: (reassignTo: string | undefined) => void
}) {
  const [target, setTarget] = useState('')
  const count = category.transactionCount

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{category.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {count > 0
              ? `${count} transaction${count === 1 ? ' uses' : 's use'} this category. Choose where to move ${count === 1 ? 'it' : 'them'}.`
              : 'This permanently deletes the category.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {count > 0 ? (
          <div className="grid gap-2">
            <Label htmlFor="reassign-target">Move transactions to</Label>
            <NativeSelect
              id="reassign-target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">Leave uncategorized</option>
              {groups.map((g) => {
                const others = g.categories.filter((c) => c.id !== category.id)
                return others.length === 0 ? null : (
                  <optgroup key={g.id} label={g.name}>
                    {others.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </NativeSelect>
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(target || undefined)}>
            Delete category
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
