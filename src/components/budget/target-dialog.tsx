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
import { Input } from '#/components/ui/input'
import { MoneyInput } from '#/components/ui/money-input'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/register/native-select'
import { todayString } from '#/lib/date'
import { formatMoneyField, parseMoneyInput } from '#/lib/money'
import {
  TARGET_BEHAVIORS,
  TARGET_REPEATS,
  TARGET_REPEAT_LABELS,
  TARGET_TYPES,
  TARGET_TYPE_LABELS,
  setTargetSchema,
} from '#/lib/targets'
import { clearCategoryTarget, setCategoryTarget } from '#/server/targets'
import type { BudgetCategoryRow } from '#/lib/budget-month'

type TargetType = (typeof TARGET_TYPES)[number]
type Repeat = (typeof TARGET_REPEATS)[number]
type Behavior = (typeof TARGET_BEHAVIORS)[number]

const BEHAVIOR_LABELS: Record<Behavior, string> = {
  set_aside: 'Set aside another amount each time',
  refill: 'Refill up to the amount',
}

/** Create, change or remove a category target. Mount it only while open so the form is fresh. */
export function TargetDialog({
  open,
  onOpenChange,
  budgetId,
  category,
  isPaymentCategory,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  budgetId: string
  category: BudgetCategoryRow
  isPaymentCategory: boolean
}) {
  const router = useRouter()
  const existing = category.target
  const [type, setType] = useState<TargetType>(
    existing?.type ??
      (isPaymentCategory ? 'monthly_funding' : 'needed_for_spending'),
  )
  const [amount, setAmount] = useState(
    existing ? formatMoneyField(existing.amount) : '',
  )
  const [repeat, setRepeat] = useState<Repeat>(existing?.repeat ?? 'monthly')
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? todayString())
  const [behavior, setBehavior] = useState<Behavior>(
    existing?.behavior ?? 'set_aside',
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const dateLabel =
    type === 'needed_for_spending'
      ? repeat === 'weekly'
        ? 'Starting on (sets the weekday)'
        : repeat === 'monthly'
          ? 'Due on (sets the day of month)'
          : repeat === 'yearly'
            ? 'Due on (sets the month and day)'
            : 'Due by'
      : 'By (optional)'

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const milli = parseMoneyInput(amount)
    if (milli === null || milli <= 0) {
      setError('Enter an amount above zero, like 200.00')
      return
    }
    const parsed = setTargetSchema.safeParse({
      budgetId,
      categoryId: category.id,
      type,
      amount: milli,
      repeat: type === 'needed_for_spending' ? repeat : null,
      dueDate: type === 'monthly_funding' || dueDate === '' ? null : dueDate,
      behavior: type === 'needed_for_spending' ? behavior : null,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the target')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await setCategoryTarget({ data: parsed.data })
        await router.invalidate()
        toast.success('Target saved')
        onOpenChange(false)
      } catch {
        setError('Could not save the target.')
      }
    })
  }

  function remove() {
    startTransition(async () => {
      try {
        await clearCategoryTarget({
          data: { budgetId, categoryId: category.id },
        })
        await router.invalidate()
        toast.success('Target removed')
        onOpenChange(false)
      } catch {
        setError('Could not remove the target.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form method="post" onSubmit={save} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Target for {category.name}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="target-type">I want to</Label>
            <NativeSelect
              id="target-type"
              value={type}
              onChange={(e) => setType(e.target.value as TargetType)}
            >
              {TARGET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === 'monthly_funding' && isPaymentCategory
                    ? 'Make a monthly payment'
                    : TARGET_TYPE_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="target-amount">Amount</Label>
            <MoneyInput
              id="target-amount"
              placeholder="0.00"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {type === 'needed_for_spending' ? (
            <div className="grid gap-2">
              <Label htmlFor="target-repeat">How often</Label>
              <NativeSelect
                id="target-repeat"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value as Repeat)}
              >
                {TARGET_REPEATS.map((r) => (
                  <option key={r} value={r}>
                    {TARGET_REPEAT_LABELS[r]}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}

          {type !== 'monthly_funding' ? (
            <div className="grid gap-2">
              <Label htmlFor="target-date">{dateLabel}</Label>
              <Input
                id="target-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          ) : null}

          {type === 'needed_for_spending' ? (
            <div className="grid gap-2">
              <Label htmlFor="target-behavior">Funding style</Label>
              <NativeSelect
                id="target-behavior"
                value={behavior}
                onChange={(e) => setBehavior(e.target.value as Behavior)}
              >
                {TARGET_BEHAVIORS.map((b) => (
                  <option key={b} value={b}>
                    {BEHAVIOR_LABELS[b]}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <DialogFooter className="gap-2">
            {existing ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={remove}
              >
                Remove target
              </Button>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save target'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
