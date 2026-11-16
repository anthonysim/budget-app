import { useState, useTransition } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_INFO,
  accountNameSchema,
} from '#/lib/accounts'
import type { AccountType } from '#/lib/accounts'
import { parseMoneyInput } from '#/lib/money'
import { createAccount } from '#/server/accounts'

const BUDGET_TYPES = ACCOUNT_TYPES.filter((t) => ACCOUNT_TYPE_INFO[t].onBudget)
const TRACKING_TYPES = ACCOUNT_TYPES.filter(
  (t) => !ACCOUNT_TYPE_INFO[t].onBudget,
)

export function AddAccountDialog({
  budgetId,
  children,
}: {
  budgetId: string
  /** The element that opens the dialog (rendered via DialogTrigger asChild). */
  children: ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<AccountType>('checking')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const isDebt = ACCOUNT_TYPE_INFO[type].debt

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const name = accountNameSchema.safeParse(form.get('name'))
    if (!name.success) {
      setError(name.error.issues[0]?.message ?? 'Invalid name')
      return
    }
    const raw = String(form.get('balance') ?? '').trim()
    const balance = raw === '' ? 0 : parseMoneyInput(raw)
    if (balance === null) {
      setError('Enter a valid amount, like 1250.00')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const { id } = await createAccount({
          data: { budgetId, name: name.data, type, startingBalance: balance },
        })
        await router.invalidate()
        toast.success('Account added')
        setOpen(false)
        await router.navigate({
          to: '/budgets/$budgetId/accounts/$accountId',
          params: { budgetId, accountId: id },
        })
      } catch {
        setError('Could not add the account. Try again.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <form
          method="post"
          onSubmit={onSubmit}
          noValidate
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle>Add account</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="account-name">Account name</Label>
            <Input
              id="account-name"
              name="name"
              placeholder="Everyday Checking"
              maxLength={60}
              autoFocus
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="account-type">Account type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as AccountType)}
            >
              <SelectTrigger id="account-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Budget accounts</SelectLabel>
                  {BUDGET_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ACCOUNT_TYPE_INFO[t].label}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Tracking accounts</SelectLabel>
                  {TRACKING_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ACCOUNT_TYPE_INFO[t].label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="account-balance">
              {isDebt ? 'Amount owed' : 'Current balance'}
            </Label>
            <Input
              id="account-balance"
              name="balance"
              inputMode="decimal"
              placeholder="0.00"
              autoComplete="off"
            />
          </div>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Adding…' : 'Add account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
