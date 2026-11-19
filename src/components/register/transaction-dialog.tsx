import { useState, useTransition } from 'react'
import { useRouter } from '@tanstack/react-router'
import { PlusIcon, SplitIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Money } from '#/components/accounts/money'
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
import { CategoryOptions } from '#/components/register/category-options'
import { NativeSelect } from '#/components/register/native-select'
import { todayString } from '#/lib/date'
import { formatMoneyField, parseMoneyInput } from '#/lib/money'
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
  return milli === 0 ? '' : formatMoneyField(milli)
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

interface FormProps {
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
  /** The user already confirmed editing a reconciled transaction. */
  confirmReconciled?: boolean
  currency: string
}

/**
 * Add or edit a transaction (including splits) in a dialog. Render it only while editing
 * (or give it a `key` per transaction) so the form state starts fresh on every open.
 */
export function TransactionDialog({
  open,
  onOpenChange,
  ...props
}: FormProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TransactionForm {...props} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function TransactionForm({
  budgetId,
  transaction,
  existingSplits,
  fixedAccountId,
  accounts,
  payees,
  categoryGroups,
  inflowCategoryId,
  confirmReconciled,
  currency,
  onDone,
}: FormProps & { onDone: () => void }) {
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

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
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

  return (
    <form method="post" onSubmit={submit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>
          {transaction ? 'Edit transaction' : 'Add transaction'}
        </DialogTitle>
      </DialogHeader>

      {fixedAccountId === undefined ? (
        <div className="grid gap-2">
          <Label htmlFor="txn-account">Account</Label>
          <NativeSelect
            id="txn-account"
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
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="txn-date">Date</Label>
          <Input
            id="txn-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="txn-payee">Payee</Label>
          <Input
            id="txn-payee"
            list="register-payees"
            autoComplete="off"
            maxLength={80}
            value={payeeName}
            onChange={(e) => onPayeeChange(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="txn-category">Category</Label>
        <NativeSelect
          id="txn-category"
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="txn-outflow">Outflow</Label>
          <MoneyInput
            id="txn-outflow"
            placeholder="0.00"
            value={outflow}
            onChange={(e) => setOutflow(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="txn-inflow">Inflow</Label>
          <MoneyInput
            id="txn-inflow"
            placeholder="0.00"
            value={inflow}
            onChange={(e) => setInflow(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="txn-memo">Memo</Label>
        <Input
          id="txn-memo"
          maxLength={500}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4"
          checked={cleared}
          onChange={(e) => setCleared(e.target.checked)}
        />
        Cleared
      </label>

      {isSplit ? (
        <div className="grid gap-3 rounded-lg border p-3">
          {lines.map((l, i) => (
            <div
              key={l.key}
              data-testid="split-line"
              className="grid gap-2 border-b pb-3 last:border-b-0 last:pb-0"
            >
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  Split {i + 1}
                </span>
                <Button
                  type="button"
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
              </div>
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
              <Input
                aria-label={`Split ${i + 1} memo`}
                placeholder="Memo"
                value={l.memo}
                onChange={(e) => updateLine(l.key, { memo: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <MoneyInput
                  aria-label={`Split ${i + 1} outflow`}
                  placeholder="Outflow 0.00"
                  value={l.outflow}
                  onChange={(e) =>
                    updateLine(l.key, { outflow: e.target.value })
                  }
                />
                <MoneyInput
                  aria-label={`Split ${i + 1} inflow`}
                  placeholder="Inflow 0.00"
                  value={l.inflow}
                  onChange={(e) =>
                    updateLine(l.key, { inflow: e.target.value })
                  }
                />
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setLines((ls) => (ls ? [...ls, newLine()] : ls))}
            >
              <PlusIcon /> Add line
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setLines(null)}
            >
              Remove split
            </Button>
            <span
              aria-live="polite"
              className={remaining === 0 ? 'text-positive' : 'text-destructive'}
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
          </div>
        </div>
      ) : canSplit ? (
        <div>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground -ml-2"
            onClick={startSplit}
          >
            <SplitIcon /> Split transaction
          </Button>
        </div>
      ) : null}

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
