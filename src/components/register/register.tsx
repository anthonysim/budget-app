import { Fragment, useMemo, useState, useTransition } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { RowSelectionState } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { BulkBar } from '#/components/register/bulk-bar'
import { buildColumns } from '#/components/register/columns'
import type { RegisterMeta } from '#/components/register/columns'
import { EditRow } from '#/components/register/edit-row'
import { NativeSelect } from '#/components/register/native-select'
import { matchesSearch, runningBalances } from '#/lib/transactions'
import { transferLabel } from '#/lib/transfers'
import {
  bulkUpdateTransactions,
  deleteTransactions,
  updateTransaction,
} from '#/server/transactions'
import type { AccountWithBalances } from '#/server/accounts-query'
import type { CategoryGroupRow } from '#/server/categories-query'
import type {
  PayeeRow,
  SplitRow,
  TransactionRow,
} from '#/server/transactions-query'
import { ConfirmDialog } from '#/components/categories/confirm-dialog'
import { Money } from '#/components/accounts/money'

interface RegisterData {
  transactions: Array<TransactionRow>
  splits: Array<SplitRow>
  payees: Array<PayeeRow>
  categoryGroups: Array<CategoryGroupRow>
  inflowCategoryId: string | null
}

type ClearedFilter = 'all' | 'uncleared' | 'cleared'

export function Register({
  budget,
  accounts,
  data,
  accountId,
}: {
  budget: { id: string; currency: string; dateFormat: string; role: string }
  accounts: Array<AccountWithBalances>
  data: RegisterData
  /** Set for a single-account register; omit for the all-accounts view. */
  accountId?: string
}) {
  const router = useRouter()
  const canEdit = budget.role !== 'viewer'
  const singleAccount = accountId !== undefined
  const [query, setQuery] = useState('')
  const [clearedFilter, setClearedFilter] = useState<ClearedFilter>('all')
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [confirmEditId, setConfirmEditId] = useState<string | null>(null)
  const [editingReconciled, setEditingReconciled] = useState(false)
  const [busy, startTransition] = useTransition()

  // Running balance is computed from the full list so filtering never changes it.
  const balances = useMemo(
    () => runningBalances(data.transactions),
    [data.transactions],
  )

  const splitsByTxn = useMemo(() => {
    const map = new Map<string, Array<SplitRow>>()
    for (const sp of data.splits) {
      const list = map.get(sp.transactionId) ?? []
      list.push(sp)
      map.set(sp.transactionId, list)
    }
    return map
  }, [data.splits])
  const splitCounts = useMemo(
    () => new Map([...splitsByTxn].map(([id, list]) => [id, list.length])),
    [splitsByTxn],
  )

  function requestEdit(id: string) {
    const t = data.transactions.find((x) => x.id === id)
    if (t?.cleared === 'reconciled') {
      setConfirmEditId(id)
    } else {
      setEditingReconciled(false)
      setEditingId(id)
    }
  }

  // Newest first for display
  const rows = useMemo(
    () =>
      [...data.transactions]
        .reverse()
        .filter(
          (t) =>
            (clearedFilter === 'all' ||
              (clearedFilter === 'cleared'
                ? t.cleared !== 'uncleared'
                : t.cleared === 'uncleared')) &&
            matchesSearch(query, [
              t.payeeName,
              t.memo,
              t.categoryName,
              t.accountName,
            ]),
        ),
    [data.transactions, query, clearedFilter],
  )

  const columns = useMemo(
    () =>
      buildColumns({ showAccount: !singleAccount, showBalance: singleAccount }),
    [singleAccount],
  )

  function mutate(action: () => Promise<unknown>, success: string) {
    startTransition(async () => {
      try {
        await action()
        await router.invalidate()
        setRowSelection({})
        toast.success(success)
      } catch {
        toast.error('Something went wrong. Try again.')
      }
    })
  }

  const tableMeta: RegisterMeta = {
    currency: budget.currency,
    dateFormat: budget.dateFormat,
    canEdit,
    inflowCategoryId: data.inflowCategoryId,
    balances,
    splitCounts,
    onEdit: requestEdit,
    onToggleCleared: (t) =>
      mutate(
        () =>
          updateTransaction({
            data: {
              budgetId: budget.id,
              transactionId: t.id,
              accountId: t.accountId,
              date: t.date,
              payeeName: t.payeeName ?? '',
              categoryId: t.categoryId,
              transferAccountId: t.transferAccountId,
              memo: t.memo,
              amount: t.amount,
              cleared: t.cleared === 'cleared' ? 'uncleared' : 'cleared',
            },
          }),
        t.cleared === 'cleared' ? 'Marked uncleared' : 'Marked cleared',
      ),
  }

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: (row) =>
      canEdit && row.original.cleared !== 'reconciled',
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
    meta: tableMeta,
  })

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])
  const columnCount = table.getVisibleLeafColumns().length

  function moveFocus(
    e: React.KeyboardEvent<HTMLTableRowElement>,
    row: TransactionRow,
  ) {
    if (e.target !== e.currentTarget) return
    const el = e.currentTarget
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      ;(el.nextElementSibling as HTMLElement | null)?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      ;(el.previousElementSibling as HTMLElement | null)?.focus()
    } else if (e.key === 'Enter' && canEdit) {
      e.preventDefault()
      requestEdit(row.id)
    } else if (e.key === ' ' && canEdit && row.cleared !== 'reconciled') {
      e.preventDefault()
      setRowSelection((s) => ({ ...s, [row.id]: !s[row.id] }))
    }
  }

  const editProps = {
    budgetId: budget.id,
    fixedAccountId: accountId,
    accounts,
    payees: data.payees,
    categoryGroups: data.categoryGroups,
    inflowCategoryId: data.inflowCategoryId,
    showAccountColumn: !singleAccount,
    showBalanceColumn: singleAccount,
    currency: budget.currency,
    onDone: () => setEditingId(null),
  }

  return (
    <section aria-label="Transactions" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Search transactions"
          placeholder="Search payee, memo, category…"
          className="max-w-xs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <NativeSelect
          aria-label="Filter by cleared status"
          className="w-40"
          value={clearedFilter}
          onChange={(e) => setClearedFilter(e.target.value as ClearedFilter)}
        >
          <option value="all">All</option>
          <option value="uncleared">Uncleared</option>
          <option value="cleared">Cleared</option>
        </NativeSelect>
        {canEdit ? (
          <Button className="ml-auto" onClick={() => setEditingId('new')}>
            <PlusIcon /> Add transaction
          </Button>
        ) : null}
      </div>

      {selectedIds.length > 0 ? (
        <BulkBar
          count={selectedIds.length}
          categoryGroups={data.categoryGroups}
          inflowCategoryId={data.inflowCategoryId}
          busy={busy}
          onClear={() => setRowSelection({})}
          onCategorize={(categoryId) =>
            mutate(
              () =>
                bulkUpdateTransactions({
                  data: {
                    budgetId: budget.id,
                    transactionIds: selectedIds,
                    categoryId,
                  },
                }),
              'Categories updated',
            )
          }
          onSetCleared={(cleared) =>
            mutate(
              () =>
                bulkUpdateTransactions({
                  data: {
                    budgetId: budget.id,
                    transactionIds: selectedIds,
                    cleared,
                  },
                }),
              'Transactions updated',
            )
          }
          onDelete={() =>
            mutate(
              () =>
                deleteTransactions({
                  data: { budgetId: budget.id, transactionIds: selectedIds },
                }),
              'Transactions deleted',
            )
          }
        />
      ) : null}

      <datalist id="register-payees">
        {accounts
          .filter((a) => !a.closed && a.id !== accountId)
          .map((a) => (
            <option key={`transfer-${a.id}`} value={transferLabel(a.name)} />
          ))}
        {data.payees.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-2 py-2 font-medium">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {editingId === 'new' ? <EditRow {...editProps} /> : null}
            {table.getRowModel().rows.map((row) =>
              editingId === row.original.id ? (
                <EditRow
                  key={row.id}
                  {...editProps}
                  transaction={row.original}
                  existingSplits={splitsByTxn.get(row.original.id)}
                  confirmReconciled={editingReconciled}
                />
              ) : (
                <Fragment key={row.id}>
                  <tr
                    tabIndex={0}
                    data-state={row.getIsSelected() ? 'selected' : undefined}
                    onKeyDown={(e) => moveFocus(e, row.original)}
                    className="data-[state=selected]:bg-muted/60 hover:bg-muted/30 focus-visible:ring-ring border-t outline-none focus-visible:ring-2 focus-visible:ring-inset"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-2 py-1.5">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                  {(splitsByTxn.get(row.original.id) ?? []).map((sp) => (
                    <tr
                      key={sp.id}
                      data-testid="split-display-line"
                      className="bg-muted/20 text-muted-foreground"
                    >
                      <td />
                      {!singleAccount ? <td /> : null}
                      <td />
                      <td className="px-2 py-1 pl-6 text-xs">Split</td>
                      <td className="px-2 py-1">
                        {sp.categoryName ?? 'Uncategorized'}
                      </td>
                      <td className="px-2 py-1">{sp.memo ?? ''}</td>
                      <td className="px-2 py-1 text-right">
                        {sp.amount < 0 ? (
                          <Money value={sp.amount} currency={budget.currency} />
                        ) : null}
                      </td>
                      <td className="px-2 py-1 text-right">
                        {sp.amount > 0 ? (
                          <Money value={sp.amount} currency={budget.currency} />
                        ) : null}
                      </td>
                      <td />
                      {singleAccount ? <td /> : null}
                      <td />
                    </tr>
                  ))}
                </Fragment>
              ),
            )}
            {rows.length === 0 && editingId !== 'new' ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="text-muted-foreground px-4 py-8 text-center"
                >
                  {data.transactions.length === 0
                    ? 'No transactions yet.'
                    : 'No transactions match your filters.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={confirmEditId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmEditId(null)
        }}
        title="Edit a reconciled transaction?"
        description="This transaction is reconciled. Changing it can make your balance differ from your bank. Edit anyway?"
        confirmLabel="Edit anyway"
        onConfirm={() => {
          setEditingReconciled(true)
          setEditingId(confirmEditId)
          setConfirmEditId(null)
        }}
      />
    </section>
  )
}
