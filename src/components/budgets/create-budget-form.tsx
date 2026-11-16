import { useState, useTransition } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { CURRENCIES, createBudgetSchema } from '#/lib/budget-schemas'
import { createBudget } from '#/server/budgets'

export function CreateBudgetForm({ canCancel }: { canCancel: boolean }) {
  const router = useRouter()
  const [currency, setCurrency] = useState<string>('USD')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = createBudgetSchema.safeParse({
      name: new FormData(e.currentTarget).get('name'),
      currency,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const { id } = await createBudget({ data: parsed.data })
        await router.invalidate()
        toast.success('Budget created')
        await router.navigate({
          to: '/budgets/$budgetId/budget',
          params: { budgetId: id },
        })
      } catch {
        setError('Could not create the budget. Try again.')
      }
    })
  }

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Budget name</Label>
        <Input
          id="name"
          name="name"
          placeholder="My Budget"
          maxLength={60}
          autoFocus
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="currency">Currency</Label>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger id="currency" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? 'Creating…' : 'Create budget'}
        </Button>
        {canCancel ? (
          <Button asChild variant="outline">
            <Link to="/budget">Cancel</Link>
          </Button>
        ) : null}
      </div>
    </form>
  )
}
