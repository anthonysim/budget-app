import { useState, useTransition } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { MoneyInput } from '#/components/ui/money-input'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/register/native-select'
import { formatMoneyField, parseMoneyInput } from '#/lib/money'
import { moveMoney } from '#/server/budget-month'
import type { BudgetGroupRow } from '#/lib/budget-month'

export function MoveMoneyDialog({
  open,
  onOpenChange,
  budgetId,
  month,
  from,
  groups,
  onMoved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  budgetId: string
  month: string
  from: { id: string; name: string; available: number }
  groups: Array<BudgetGroupRow>
  /** Called after success so the caller can record undo history. */
  onMoved: (toCategoryId: string, amount: number) => void
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const amount = parseMoneyInput(String(form.get('amount') ?? ''))
    const to = String(form.get('to') ?? '')
    if (amount === null || amount <= 0) {
      setError('Enter an amount greater than zero')
      return
    }
    if (!to) {
      setError('Choose a category to move the money to')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await moveMoney({
          data: {
            budgetId,
            month,
            fromCategoryId: from.id,
            toCategoryId: to,
            amount,
          },
        })
        onMoved(to, amount)
        await router.invalidate()
        toast.success('Money moved')
        onOpenChange(false)
      } catch {
        setError('Could not move the money.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          method="post"
          onSubmit={onSubmit}
          noValidate
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle>Move money from {from.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="move-amount">Amount</Label>
            <MoneyInput
              id="move-amount"
              name="amount"
              autoFocus
              defaultValue={
                from.available > 0 ? formatMoneyField(from.available) : ''
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="move-to">Move to</Label>
            <NativeSelect id="move-to" name="to" defaultValue="">
              <option value="" disabled>
                Choose a category…
              </option>
              {groups.map((g) => {
                const others = g.categories.filter((c) => c.id !== from.id)
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
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Moving…' : 'Move money'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
