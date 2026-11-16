import { useState, useTransition } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Money } from '#/components/accounts/money'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { ACCOUNT_TYPE_INFO, startingBalanceFor } from '#/lib/accounts'
import type { AccountType } from '#/lib/accounts'
import { todayString } from '#/lib/date'
import { milliunitsToDollars, parseMoneyInput } from '#/lib/money'
import { reconcileDifference } from '#/lib/splits'
import { reconcileAccount } from '#/server/reconcile'

export function ReconcileDialog({
  budgetId,
  accountId,
  accountType,
  clearedBalance,
  currency,
}: {
  budgetId: string
  accountId: string
  accountType: AccountType
  clearedBalance: number
  currency: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [entered, setEntered] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const isDebt = ACCOUNT_TYPE_INFO[accountType].debt

  const parsed = entered.trim() === '' ? null : parseMoneyInput(entered)
  const bankBalance =
    parsed === null ? null : startingBalanceFor(accountType, parsed)
  const difference =
    bankBalance === null
      ? null
      : reconcileDifference(bankBalance, clearedBalance)

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      // start from what the app thinks the bank balance is
      const shown = isDebt ? -clearedBalance : clearedBalance
      setEntered(String(milliunitsToDollars(shown)))
      setError(null)
    }
  }

  function submit() {
    if (bankBalance === null || difference === null) {
      setError('Enter your bank balance, like 1250.00')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const result = await reconcileAccount({
          data: {
            budgetId,
            accountId,
            bankBalance,
            createAdjustment: difference !== 0,
            adjustmentDate: todayString(),
          },
        })
        await router.invalidate()
        toast.success(
          `Reconciled ${result.reconciledCount} transaction${result.reconciledCount === 1 ? '' : 's'}`,
        )
        setOpen(false)
      } catch {
        setError('Could not reconcile the account.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Reconcile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reconcile account</DialogTitle>
          <DialogDescription>
            Enter the balance your bank shows. Cleared transactions are locked
            once they match.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="bank-balance">
              {isDebt ? 'Amount owed at your bank' : 'Bank balance'}
            </Label>
            <Input
              id="bank-balance"
              inputMode="decimal"
              autoComplete="off"
              value={entered}
              onChange={(e) => setEntered(e.target.value)}
            />
          </div>
          <dl className="grid grid-cols-2 gap-1 text-sm">
            <dt className="text-muted-foreground">Cleared balance in app</dt>
            <dd className="text-right">
              <Money value={clearedBalance} currency={currency} />
            </dd>
            <dt className="text-muted-foreground">Difference</dt>
            <dd className="text-right" data-testid="reconcile-difference">
              {difference === null ? (
                '—'
              ) : (
                <Money value={difference} currency={currency} />
              )}
            </dd>
          </dl>
          {difference !== null && difference !== 0 ? (
            <p className="text-sm">
              Your balances differ. Reconciling will add an adjustment
              transaction for the difference.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending || difference === null}>
            {pending
              ? 'Reconciling…'
              : difference === 0 || difference === null
                ? 'Reconcile'
                : 'Add adjustment and reconcile'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
