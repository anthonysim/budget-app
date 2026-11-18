import { useState, useTransition } from 'react'
import { useRouter } from '@tanstack/react-router'
import { CheckIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { CategoryOptions } from '#/components/register/category-options'
import { NativeSelect } from '#/components/register/native-select'
import { milliunitsToDollars, parseMoneyInput } from '#/lib/money'
import { combineAmount, dateSchema, splitAmount } from '#/lib/transactions'
import { parseTransferPayee, transferLabel } from '#/lib/transfers'
import { updateScheduled } from '#/server/scheduled'
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

/**
 * Inline edit row for a scheduled transaction in the register. Enter saves, Escape cancels.
 * Frequency and end date are kept as-is; change those from the Scheduled page.
 */
export function UpcomingEditRow({
  budgetId,
  scheduled,
  accounts,
  payees,
  categoryGroups,
  inflowCategoryId,
  showAccountColumn,
  showBalanceColumn,
  onDone,
}: {
  budgetId: string
  scheduled: ScheduledListRow
  accounts: Array<AccountOption>
  payees: Array<PayeeRow>
  categoryGroups: Array<CategoryGroupRow>
  inflowCategoryId: string | null
  showAccountColumn: boolean
  showBalanceColumn: boolean
  onDone: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const initialSplit = splitAmount(scheduled.amount)
  const [accountId, setAccountId] = useState(scheduled.accountId)
  const [date, setDate] = useState(scheduled.nextDate)
  const [payeeName, setPayeeName] = useState(
    scheduled.transferAccountName
      ? transferLabel(scheduled.transferAccountName)
      : (scheduled.payeeName ?? ''),
  )
  const [categoryId, setCategoryId] = useState(scheduled.categoryId ?? '')
  const [memo, setMemo] = useState(scheduled.memo ?? '')
  const [outflow, setOutflow] = useState(moneyField(initialSplit.outflow))
  const [inflow, setInflow] = useState(moneyField(initialSplit.inflow))

  const account = accounts.find((a) => a.id === accountId)
  const transferId = parseTransferPayee(payeeName, accounts)
  const transferTarget = accounts.find((a) => a.id === transferId)
  const isTransfer =
    transferTarget !== undefined && transferTarget.id !== accountId
  const categoryApplies =
    (account?.onBudget ?? true) && (!isTransfer || !transferTarget.onBudget)

  function onPayeeChange(name: string) {
    setPayeeName(name)
    if (categoryId === '' && categoryApplies) {
      const match = payees.find(
        (p) => p.name.toLowerCase() === name.trim().toLowerCase(),
      )
      if (match?.lastCategoryId) setCategoryId(match.lastCategoryId)
    }
  }

  function save() {
    if (!dateSchema.safeParse(date).success) {
      setError('Enter a valid date')
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
    startTransition(async () => {
      try {
        await updateScheduled({
          data: {
            budgetId,
            scheduledId: scheduled.id,
            accountId,
            date,
            frequency: scheduled.frequency,
            endDate: scheduled.endDate,
            payeeName: isTransfer ? '' : payeeName,
            categoryId:
              categoryApplies && categoryId !== '' ? categoryId : null,
            transferAccountId: isTransfer ? transferTarget.id : null,
            memo: memo.trim() === '' ? null : memo,
            amount: combineAmount(out, inn),
          },
        })
        await router.invalidate()
        toast.success('Scheduled transaction saved')
        onDone()
      } catch {
        setError('Could not save the scheduled transaction.')
      }
    })
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTableRowElement>) {
    if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault()
      save()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onDone()
    }
  }

  const cell = 'px-2 py-1.5 align-middle'
  return (
    <>
      <tr
        data-testid="upcoming-edit-row"
        className="bg-muted/40 border-t"
        onKeyDown={onKeyDown}
      >
        <td className={cell} />
        {showAccountColumn ? (
          <td className={cell}>
            <NativeSelect
              aria-label="Account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {accounts
                .filter((a) => !a.closed || a.id === scheduled.accountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </NativeSelect>
          </td>
        ) : null}
        <td className={cell}>
          <Input
            aria-label="Date"
            type="date"
            className="h-8 w-[7.5rem] px-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </td>
        <td className={cell}>
          <Input
            aria-label="Payee"
            className="h-8"
            list="register-payees"
            autoFocus
            autoComplete="off"
            maxLength={80}
            value={payeeName}
            onChange={(e) => onPayeeChange(e.target.value)}
          />
        </td>
        <td className={cell}>
          <NativeSelect
            aria-label="Category"
            value={categoryApplies ? categoryId : ''}
            disabled={!categoryApplies}
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
        </td>
        <td className={cell}>
          <Input
            aria-label="Memo"
            className="h-8"
            maxLength={500}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </td>
        <td className={cell}>
          <Input
            aria-label="Outflow"
            className="h-8 w-24 px-2 text-right"
            inputMode="decimal"
            placeholder="0.00"
            autoComplete="off"
            value={outflow}
            onChange={(e) => setOutflow(e.target.value)}
          />
        </td>
        <td className={cell}>
          <Input
            aria-label="Inflow"
            className="h-8 w-24 px-2 text-right"
            inputMode="decimal"
            placeholder="0.00"
            autoComplete="off"
            value={inflow}
            onChange={(e) => setInflow(e.target.value)}
          />
        </td>
        <td className={`${cell} text-muted-foreground text-center text-xs`}>
          Sched.
        </td>
        {showBalanceColumn ? <td className={cell} /> : null}
        <td className={cell}>
          <div className="flex gap-1">
            <Button
              size="icon-sm"
              aria-label="Save scheduled transaction"
              disabled={pending}
              onClick={save}
            >
              <CheckIcon />
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Cancel"
              onClick={onDone}
            >
              <XIcon />
            </Button>
          </div>
        </td>
      </tr>
      {error ? (
        <tr className="bg-muted/40">
          <td colSpan={100} className="text-destructive px-4 pb-2 text-xs">
            {error}
          </td>
        </tr>
      ) : null}
    </>
  )
}
