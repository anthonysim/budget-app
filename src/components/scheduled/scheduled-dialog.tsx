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
import { CategoryOptions } from '#/components/register/category-options'
import { NativeSelect } from '#/components/register/native-select'
import { todayString } from '#/lib/date'
import { milliunitsToDollars, parseMoneyInput } from '#/lib/money'
import { FREQUENCIES, FREQUENCY_LABELS } from '#/lib/schedule'
import type { Frequency } from '#/lib/schedule'
import { combineAmount, dateSchema, splitAmount } from '#/lib/transactions'
import { parseTransferPayee, transferLabel } from '#/lib/transfers'
import { createScheduled, updateScheduled } from '#/server/scheduled'
import type { CategoryGroupRow } from '#/server/categories-query'
import type { ScheduledListRow } from '#/server/scheduled-query'
import type { PayeeRow } from '#/server/transactions-query'

interface AccountOption {
  id: string
  name: string
  onBudget: boolean
  closed: boolean
}

function moneyField(milli: number): string {
  return milli === 0 ? '' : String(milliunitsToDollars(milli))
}

function parseField(text: string): number | null {
  return text.trim() === '' ? 0 : parseMoneyInput(text)
}

interface FormProps {
  budgetId: string
  accounts: Array<AccountOption>
  payees: Array<PayeeRow>
  categoryGroups: Array<CategoryGroupRow>
  inflowCategoryId: string | null
  /** Set to edit an existing scheduled transaction. */
  scheduled?: ScheduledListRow
}

/** Create or edit a scheduled transaction. Opens in a dialog; the form remounts on every open. */
export function ScheduledDialog({
  children,
  ...props
}: FormProps & { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <ScheduledForm {...props} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

function ScheduledForm({
  budgetId,
  accounts,
  payees,
  categoryGroups,
  inflowCategoryId,
  scheduled,
  onDone,
}: FormProps & { onDone: () => void }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const openAccounts = accounts.filter((a) => !a.closed)
  const initialSplit = splitAmount(scheduled?.amount ?? 0)
  const [accountId, setAccountId] = useState(
    scheduled?.accountId ?? openAccounts[0]?.id ?? '',
  )
  const [date, setDate] = useState(scheduled?.nextDate ?? todayString())
  const [frequency, setFrequency] = useState<Frequency>(
    scheduled?.frequency ?? 'monthly',
  )
  const [endDate, setEndDate] = useState(scheduled?.endDate ?? '')
  const [payeeName, setPayeeName] = useState(
    scheduled?.transferAccountName
      ? transferLabel(scheduled.transferAccountName)
      : (scheduled?.payeeName ?? ''),
  )
  const [categoryId, setCategoryId] = useState(scheduled?.categoryId ?? '')
  const [memo, setMemo] = useState(scheduled?.memo ?? '')
  const [outflow, setOutflow] = useState(moneyField(initialSplit.outflow))
  const [inflow, setInflow] = useState(moneyField(initialSplit.inflow))

  const account = accounts.find((a) => a.id === accountId)
  const transferId = parseTransferPayee(payeeName, accounts)
  const transferTarget = accounts.find((a) => a.id === transferId)
  const isTransfer =
    transferTarget !== undefined && transferTarget.id !== accountId
  const categoryApplies =
    (account?.onBudget ?? true) && (!isTransfer || !transferTarget.onBudget)

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!dateSchema.safeParse(date).success) {
      setError('Enter a valid date')
      return
    }
    if (endDate !== '' && !dateSchema.safeParse(endDate).success) {
      setError('Enter a valid end date')
      return
    }
    const out = parseField(outflow)
    const inn = parseField(inflow)
    if (
      out === null ||
      inn === null ||
      out < 0 ||
      inn < 0 ||
      (out === 0 && inn === 0)
    ) {
      setError('Enter an amount, like 150.00')
      return
    }
    setError(null)
    const payload = {
      budgetId,
      accountId,
      date,
      frequency,
      endDate: endDate === '' ? null : endDate,
      payeeName: isTransfer ? '' : payeeName,
      categoryId: categoryApplies && categoryId !== '' ? categoryId : null,
      transferAccountId: isTransfer ? transferTarget.id : null,
      memo: memo.trim() === '' ? null : memo,
      amount: combineAmount(out, inn),
    }
    startTransition(async () => {
      try {
        if (scheduled) {
          await updateScheduled({
            data: { ...payload, scheduledId: scheduled.id },
          })
        } else {
          await createScheduled({ data: payload })
        }
        await router.invalidate()
        toast.success(
          scheduled
            ? 'Scheduled transaction saved'
            : 'Scheduled transaction added',
        )
        onDone()
      } catch {
        setError('Could not save the scheduled transaction.')
      }
    })
  }

  return (
    <form method="post" onSubmit={submit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>
          {scheduled
            ? 'Edit scheduled transaction'
            : 'Add scheduled transaction'}
        </DialogTitle>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="sched-account">Account</Label>
        <NativeSelect
          id="sched-account"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        >
          {openAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="sched-date">Next date</Label>
          <Input
            id="sched-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sched-frequency">Repeats</Label>
          <NativeSelect
            id="sched-frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {FREQUENCY_LABELS[f]}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {frequency !== 'once' ? (
        <div className="grid gap-2">
          <Label htmlFor="sched-end">Ends on (optional)</Label>
          <Input
            id="sched-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="sched-payee">Payee</Label>
        <Input
          id="sched-payee"
          list="sched-payees"
          autoComplete="off"
          maxLength={80}
          value={payeeName}
          onChange={(e) => setPayeeName(e.target.value)}
        />
        <datalist id="sched-payees">
          {openAccounts
            .filter((a) => a.id !== accountId)
            .map((a) => (
              <option key={a.id} value={transferLabel(a.name)} />
            ))}
          {payees.map((p) => (
            <option key={p.id} value={p.name} />
          ))}
        </datalist>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sched-category">Category</Label>
        <NativeSelect
          id="sched-category"
          disabled={!categoryApplies}
          value={categoryApplies ? categoryId : ''}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <CategoryOptions
            groups={categoryGroups}
            inflowCategoryId={inflowCategoryId}
            selectedId={categoryId}
            uncategorizedLabel={
              categoryApplies
                ? 'Uncategorized'
                : isTransfer
                  ? 'No category (transfer)'
                  : 'No category (tracking)'
            }
          />
        </NativeSelect>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="sched-outflow">Outflow</Label>
          <Input
            id="sched-outflow"
            inputMode="decimal"
            placeholder="0.00"
            autoComplete="off"
            value={outflow}
            onChange={(e) => setOutflow(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sched-inflow">Inflow</Label>
          <Input
            id="sched-inflow"
            inputMode="decimal"
            placeholder="0.00"
            autoComplete="off"
            value={inflow}
            onChange={(e) => setInflow(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sched-memo">Memo</Label>
        <Input
          id="sched-memo"
          maxLength={500}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  )
}
