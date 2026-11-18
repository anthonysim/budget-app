import { useState, useTransition } from 'react'
import { useRouter } from '@tanstack/react-router'
import { CheckIcon, PlusIcon, SplitIcon, Trash2Icon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Money } from '#/components/accounts/money'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { CategoryOptions } from '#/components/register/category-options'
import { NativeSelect } from '#/components/register/native-select'
import { todayString } from '#/lib/date'
import { milliunitsToDollars, parseMoneyInput } from '#/lib/money'
import { splitRemaining, validateSplit } from '#/lib/splits'
import { combineAmount, dateSchema, splitAmount } from '#/lib/transactions'
import { parseTransferPayee } from '#/lib/transfers'
import { createTransaction, updateTransaction } from '#/server/transactions'
import type { CategoryGroupRow } from '#/server/categories-query'
import type {
  PayeeRow,
  SplitRow,
  TransactionRow,
} from '#/server/transactions-query'

interface AccountOption {
  id: string
  name: string
  onBudget: boolean
  closed: boolean
}

interface LineDraft {
  key: string
  categoryId: string
  memo: string
  outflow: string
  inflow: string
}

function moneyField(milli: number): string {
  return milli === 0 ? '' : String(milliunitsToDollars(milli))
}

function parseField(text: string): number | null {
  return text.trim() === '' ? 0 : parseMoneyInput(text)
}

let lineSeq = 0
const newLine = (over: Partial<LineDraft> = {}): LineDraft => ({
  key: `line-${lineSeq++}`,
  categoryId: '',
  memo: '',
  outflow: '',
  inflow: '',
  ...over,
})

/** Inline add/edit row (plus split lines). Enter saves, Escape cancels. */
export function EditRow({
  budgetId,
  transaction,
  existingSplits,
  fixedAccountId,
  accounts,
  payees,
  categoryGroups,
  inflowCategoryId,
  showAccountColumn,
  showBalanceColumn,
  confirmReconciled,
  currency,
  onDone,
}: {
  budgetId: string
  /** Undefined = adding a new transaction. */
  transaction?: TransactionRow
  existingSplits?: Array<SplitRow>
  /** Set when the register is scoped to one account. */
  fixedAccountId?: string
  accounts: Array<AccountOption>
  payees: Array<PayeeRow>
  categoryGroups: Array<CategoryGroupRow>
  inflowCategoryId: string | null
  showAccountColumn: boolean
  showBalanceColumn: boolean
  /** The user already confirmed editing a reconciled transaction. */
  confirmReconciled?: boolean
  currency: string
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
    transaction !== undefined && transaction.cleared !== 'uncleared',
  )
  const [lines, setLines] = useState<Array<LineDraft> | null>(
    existingSplits && existingSplits.length > 0
      ? existingSplits.map((l) => {
          const a = splitAmount(l.amount)
          return newLine({
            categoryId: l.categoryId ?? '',
            memo: l.memo ?? '',
            outflow: moneyField(a.outflow),
            inflow: moneyField(a.inflow),
          })
        })
      : null,
  )

  const account = accounts.find((a) => a.id === accountId)
  const transferAccountId = parseTransferPayee(payeeName, accounts)
  const transferTarget = accounts.find((a) => a.id === transferAccountId)
  const isTransfer =
    transferTarget !== undefined && transferTarget.id !== accountId
  const isSplit = lines !== null
  // Categories apply to on-budget accounts. Transfers between two on-budget accounts are
  // budget-neutral (credit card payments are categorized automatically); transfers to a
  // tracking account are real spending/income and keep their category.
  const categoryApplies =
    (account?.onBudget ?? true) &&
    (!isTransfer || !transferTarget.onBudget) &&
    !isSplit
  const canSplit = (account?.onBudget ?? false) && !isTransfer

  const parentTotal = (() => {
    const out = parseField(outflow)
    const inn = parseField(inflow)
    return out === null || inn === null ? null : combineAmount(out, inn)
  })()
  const lineAmounts = (lines ?? []).map((l) => {
    const out = parseField(l.outflow)
    const inn = parseField(l.inflow)
    return out === null || inn === null ? null : combineAmount(out, inn)
  })
  const remaining =
    parentTotal === null || lineAmounts.some((a) => a === null)
      ? null
      : splitRemaining(
          parentTotal,
          lineAmounts.map((a) => ({ amount: a ?? 0 })),
        )

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

  function startSplit() {
    setLines([newLine({ categoryId, outflow, inflow }), newLine()])
    setCategoryId('')
  }

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((ls) =>
      ls ? ls.map((l) => (l.key === key ? { ...l, ...patch } : l)) : ls,
    )
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
    const out = parseField(outflow)
    const inn = parseField(inflow)
    if (out === null || inn === null || out < 0 || inn < 0) {
      setError('Enter valid amounts, like 12.50')
      return
    }
    const amount = combineAmount(out, inn)

    let splits:
      | Array<{
          categoryId: string | null
          memo: string | null
          amount: number
        }>
      | undefined
    if (lines) {
      const parsed = lineAmounts
      if (parsed.some((a) => a === null)) {
        setError('Enter valid amounts in the split lines')
        return
      }
      splits = lines.map((l, i) => ({
        categoryId: l.categoryId === '' ? null : l.categoryId,
        memo: l.memo.trim() === '' ? null : l.memo,
        amount: parsed[i] ?? 0,
      }))
      const problem = validateSplit(amount, splits)
      if (problem) {
        setError(problem)
        return
      }
    }

    setError(null)
    const payload = {
      budgetId,
      accountId,
      date,
      payeeName: isTransfer ? '' : payeeName,
      categoryId: categoryApplies && categoryId !== '' ? categoryId : null,
      transferAccountId: isTransfer ? transferTarget.id : null,
      memo: memo.trim() === '' ? null : memo,
      amount,
      cleared: cleared ? ('cleared' as const) : ('uncleared' as const),
      splits,
    }
    startTransition(async () => {
      try {
        if (transaction) {
          await updateTransaction({
            data: {
              ...payload,
              transactionId: transaction.id,
              confirmReconciled,
            },
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

  const cell = 'px-2 py-1.5 align-middle'
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
                isSplit
                  ? 'Split (see lines below)'
                  : categoryApplies
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

      {isSplit
        ? lines.map((l, i) => (
            <tr
              key={l.key}
              className="bg-muted/20"
              onKeyDown={onKeyDown}
              data-testid="split-line"
            >
              <td className={cell} />
              {showAccountColumn ? <td className={cell} /> : null}
              <td className={cell} />
              <td className={`${cell} text-muted-foreground pl-6 text-xs`}>
                Split {i + 1}
              </td>
              <td className={cell}>
                <NativeSelect
                  aria-label={`Split ${i + 1} category`}
                  value={l.categoryId}
                  onChange={(e) =>
                    updateLine(l.key, { categoryId: e.target.value })
                  }
                >
                  <CategoryOptions
                    groups={categoryGroups}
                    inflowCategoryId={inflowCategoryId}
                    selectedId={l.categoryId}
                  />
                </NativeSelect>
              </td>
              <td className={cell}>
                <Input
                  aria-label={`Split ${i + 1} memo`}
                  className="h-8"
                  value={l.memo}
                  onChange={(e) => updateLine(l.key, { memo: e.target.value })}
                />
              </td>
              <td className={cell}>
                <Input
                  aria-label={`Split ${i + 1} outflow`}
                  className="h-8 w-24 px-2 text-right"
                  inputMode="decimal"
                  placeholder="0.00"
                  autoComplete="off"
                  value={l.outflow}
                  onChange={(e) =>
                    updateLine(l.key, { outflow: e.target.value })
                  }
                />
              </td>
              <td className={cell}>
                <Input
                  aria-label={`Split ${i + 1} inflow`}
                  className="h-8 w-24 px-2 text-right"
                  inputMode="decimal"
                  placeholder="0.00"
                  autoComplete="off"
                  value={l.inflow}
                  onChange={(e) =>
                    updateLine(l.key, { inflow: e.target.value })
                  }
                />
              </td>
              <td className={cell} />
              {showBalanceColumn ? <td className={cell} /> : null}
              <td className={cell}>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove split ${i + 1}`}
                  disabled={lines.length <= 2}
                  onClick={() =>
                    setLines((ls) =>
                      ls ? ls.filter((x) => x.key !== l.key) : ls,
                    )
                  }
                >
                  <Trash2Icon />
                </Button>
              </td>
            </tr>
          ))
        : null}

      <tr className="bg-muted/40" onKeyDown={onKeyDown}>
        <td />
        {showAccountColumn ? <td /> : null}
        <td colSpan={12} className="px-2 pt-0.5 pb-2 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            {canSplit && !isSplit ? (
              <Button
                size="xs"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground -ml-2"
                onClick={startSplit}
              >
                <SplitIcon /> Split transaction
              </Button>
            ) : null}
            {isSplit ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setLines((ls) => (ls ? [...ls, newLine()] : ls))
                  }
                >
                  <PlusIcon /> Add line
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setLines(null)
                  }}
                >
                  Remove split
                </Button>
                <span
                  aria-live="polite"
                  className={
                    remaining === 0 ? 'text-positive' : 'text-destructive'
                  }
                >
                  {remaining === null ? (
                    'Enter valid amounts'
                  ) : remaining === 0 ? (
                    'Split adds up'
                  ) : (
                    <>
                      Remaining to split:{' '}
                      <Money value={remaining} currency={currency} />
                    </>
                  )}
                </span>
              </>
            ) : null}
            {error ? (
              <span role="alert" className="text-destructive">
                {error}
              </span>
            ) : null}
          </div>
        </td>
      </tr>
    </>
  )
}
