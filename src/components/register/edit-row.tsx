import { useState, useTransition } from 'react'
import { useRouter } from '@tanstack/react-router'
import { CheckIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { CategoryOptions } from '#/components/register/category-options'
import { NativeSelect } from '#/components/register/native-select'
import { todayString } from '#/lib/date'
import { milliunitsToDollars, parseMoneyInput } from '#/lib/money'
import { combineAmount, dateSchema, splitAmount } from '#/lib/transactions'
import { createTransaction, updateTransaction } from '#/server/transactions'
import type { CategoryGroupRow } from '#/server/categories-query'
import type { PayeeRow, TransactionRow } from '#/server/transactions-query'

interface AccountOption {
  id: string
  name: string
  onBudget: boolean
  closed: boolean
}

function moneyField(milli: number): string {
  return milli === 0 ? '' : String(milliunitsToDollars(milli))
}

/** Inline add/edit row. Enter saves, Escape cancels. */
export function EditRow({
  budgetId,
  transaction,
  fixedAccountId,
  accounts,
  payees,
  categoryGroups,
  inflowCategoryId,
  showAccountColumn,
  showBalanceColumn,
  onDone,
}: {
  budgetId: string
  /** Undefined = adding a new transaction. */
  transaction?: TransactionRow
  /** Set when the register is scoped to one account. */
  fixedAccountId?: string
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

  const initialAccountId =
    transaction?.accountId ??
    fixedAccountId ??
    accounts.find((a) => !a.closed)?.id ??
    ''
  const initialSplit = splitAmount(transaction?.amount ?? 0)

  const [accountId, setAccountId] = useState(initialAccountId)
  const [date, setDate] = useState(transaction?.date ?? todayString())
  const [payeeName, setPayeeName] = useState(transaction?.payeeName ?? '')
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '')
  const [memo, setMemo] = useState(transaction?.memo ?? '')
  const [outflow, setOutflow] = useState(moneyField(initialSplit.outflow))
  const [inflow, setInflow] = useState(moneyField(initialSplit.inflow))
  const [cleared, setCleared] = useState(
    transaction?.cleared !== 'uncleared' && transaction !== undefined,
  )

  const account = accounts.find((a) => a.id === accountId)
  const categoryApplies = account?.onBudget ?? true

  function onPayeeChange(name: string) {
    setPayeeName(name)
    // remember the last category used with this payee
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
    if (!accountId) {
      setError('Choose an account')
      return
    }
    const out = outflow.trim() === '' ? 0 : parseMoneyInput(outflow)
    const inn = inflow.trim() === '' ? 0 : parseMoneyInput(inflow)
    if (out === null || inn === null || out < 0 || inn < 0) {
      setError('Enter valid amounts, like 12.50')
      return
    }
    setError(null)
    const payload = {
      budgetId,
      accountId,
      date,
      payeeName,
      categoryId: categoryApplies && categoryId !== '' ? categoryId : null,
      memo: memo.trim() === '' ? null : memo,
      amount: combineAmount(out, inn),
      cleared: cleared ? ('cleared' as const) : ('uncleared' as const),
    }
    startTransition(async () => {
      try {
        if (transaction) {
          await updateTransaction({
            data: { ...payload, transactionId: transaction.id },
          })
        } else {
          await createTransaction({ data: payload })
        }
        await router.invalidate()
        toast.success(transaction ? 'Transaction saved' : 'Transaction added')
        onDone()
      } catch {
        setError('Could not save the transaction.')
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

  const cell = 'px-2 py-1.5 align-top'
  return (
    <>
      <tr className="bg-muted/40 border-t" onKeyDown={onKeyDown}>
        <td className={cell} />
        {showAccountColumn ? (
          <td className={cell}>
            <NativeSelect
              aria-label="Account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {accounts
                .filter((a) => !a.closed || a.id === initialAccountId)
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
            className="h-8"
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
                categoryApplies ? 'Uncategorized' : 'No category (tracking)'
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
            className="h-8 text-right"
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
            className="h-8 text-right"
            inputMode="decimal"
            placeholder="0.00"
            autoComplete="off"
            value={inflow}
            onChange={(e) => setInflow(e.target.value)}
          />
        </td>
        <td className={`${cell} text-center`}>
          <input
            type="checkbox"
            aria-label="Cleared"
            className="size-4"
            checked={cleared}
            onChange={(e) => setCleared(e.target.checked)}
          />
        </td>
        {showBalanceColumn ? <td className={cell} /> : null}
        <td className={cell}>
          <div className="flex gap-1">
            <Button
              size="icon-sm"
              aria-label="Save transaction"
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
          <td
            colSpan={12}
            className="text-destructive px-4 pb-2 text-sm"
            role="alert"
          >
            {error}
          </td>
        </tr>
      ) : null}
    </>
  )
}
